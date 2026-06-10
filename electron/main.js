const { app, BrowserWindow, dialog, Menu, protocol, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const express = require('express');
const https = require('https');
const { compareVersions } = require('./lib/version');
const state = require('./state');
const {
  createWindow,
  createStateViewerWindow,
  createPlayerWindow,
  closePlayerWindow,
} = require('./windows');
const { checkAndSetupFfmpeg } = require('./media/ffmpeg');
const filesIpc = require('./ipc/files');
const projectIpc = require('./ipc/project');
const playerIpc = require('./ipc/player');
const miscIpc = require('./ipc/misc');
const ytdlp = require('./media/ytdlp');
const waveform = require('./media/waveform');

// Register custom protocol as privileged (must be before app ready)
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-media', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true } }
]);

// ffmpeg and yt-dlp management live in electron/media/.
// Start yt-dlp initialization immediately (matches previous startup timing).
ytdlp.initializeYtDlp();

let fileToOpen = null; // Store file path if app is opened with a file

// API Server Setup
function startAPIServer(port = 8080, maxAttempts = 10) {
  const apiApp = express();
  apiApp.use(express.json());

  // Trigger item by UUID
  apiApp.get('/api/trigger/uuid/:uuid', (req, res) => {
    const { uuid } = req.params;
    const mainWindow = state.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('trigger-item', { type: 'uuid', value: uuid });
      res.json({ success: true, message: `Triggered item ${uuid}` });
    } else {
      res.status(500).json({ success: false, message: 'Window not available' });
    }
  });

  // Trigger item by index
  apiApp.get('/api/trigger/index/:index', (req, res) => {
    const { index } = req.params;
    const mainWindow = state.getMainWindow();
    if (mainWindow) {
      const indexArray = index.split(',').map(i => parseInt(i.trim()));
      mainWindow.webContents.send('trigger-item', { type: 'index', value: indexArray });
      res.json({ success: true, message: `Triggered item at index ${index}` });
    } else {
      res.status(500).json({ success: false, message: 'Window not available' });
    }
  });

  // Stop item
  apiApp.get('/api/stop/uuid/:uuid', (req, res) => {
    const { uuid } = req.params;
    const mainWindow = state.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('stop-item', { type: 'uuid', value: uuid });
      res.json({ success: true, message: `Stopped item ${uuid}` });
    } else {
      res.status(500).json({ success: false, message: 'Window not available' });
    }
  });

  // Get current project info
  apiApp.get('/api/project/info', (req, res) => {
    const currentProject = state.getCurrentProject();
    if (currentProject) {
      res.json({ success: true, project: currentProject });
    } else {
      res.status(404).json({ success: false, message: 'No project loaded' });
    }
  });

  // Try to start server, incrementing port if already in use
  const tryListen = (currentPort, attemptsLeft) => {
    const server = apiApp.listen(currentPort)
      .on('listening', () => {
        state.setApiServer(server);
        console.log(`E-LivePlay API Server running on http://localhost:${currentPort}`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}...`);
          tryListen(currentPort + 1, attemptsLeft - 1);
        } else if (err.code === 'EADDRINUSE') {
          console.error(`Failed to start API server after ${maxAttempts} attempts. Ports ${port}-${currentPort} are all in use.`);
        } else {
          console.error('Failed to start API server:', err);
        }
      });
  };

  tryListen(port, maxAttempts - 1);
}

// Configure auto-updater
autoUpdater.autoDownload = false; // Don't auto-download, ask user first
autoUpdater.autoInstallOnAppQuit = true;

// Configure update feed URL to point to GitHub releases
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'Stevesibilia',
  repo: 'enhanced-liveplay',
  private: false
});

console.log('Auto-updater configured for:', autoUpdater.getFeedURL());

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  const mainWindow = state.getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('update-available', {
      currentVersion: app.getVersion(),
      newVersion: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate
    });
  }
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available. Current version is latest:', info.version);
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater:', err);
  console.log('Falling back to manual update check...');
  
  // Fallback to manual update check
  checkForManualUpdate().then(updateInfo => {
    const mainWindow = state.getMainWindow();
    if (updateInfo && mainWindow) {
      mainWindow.webContents.send('manual-update-available', updateInfo);
    }
  }).catch(fallbackErr => {
    console.error('Fallback update check also failed:', fallbackErr);
    const mainWindow = state.getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('update-error', err.message);
    }
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`);
  const mainWindow = state.getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('update-download-progress', {
      percent: progressObj.percent,
      transferred: progressObj.transferred,
      total: progressObj.total
    });
  }
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info.version);
  const mainWindow = state.getMainWindow();
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', {
      version: info.version
    });
  }
});

// Fallback manual update checker using GitHub Pages hosted package.json
async function checkForManualUpdate() {
  return new Promise((resolve, reject) => {
    const currentVersion = app.getVersion();
    const packageJsonUrl = 'https://Stevesibilia.github.io/enhanced-liveplay/package.json';
    
    console.log('Checking for updates manually at:', packageJsonUrl);
    console.log('Current version:', currentVersion);
    
    https.get(packageJsonUrl, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const packageData = JSON.parse(data);
          const latestVersion = packageData.version;
          
          console.log('Latest version from package.json:', latestVersion);
          
          // Simple version comparison
          if (compareVersions(latestVersion, currentVersion) > 0) {
            console.log('New version available:', latestVersion);
            resolve({
              currentVersion,
              newVersion: latestVersion,
              downloadUrl: 'https://Stevesibilia.github.io/enhanced-liveplay/',
              isManualUpdate: true
            });
          } else {
            console.log('No update available');
            resolve(null);
          }
        } catch (error) {
          console.error('Error parsing package.json:', error);
          reject(error);
        }
      });
    }).on('error', (error) => {
      console.error('Error fetching package.json:', error);
      reject(error);
    });
  });
}

// Translation strings for menu (default: English)
// Dynamically load all locale files from the locales directory
function loadLocaleFiles() {
  const localesDir = path.join(__dirname, '../locales');
  const localeFiles = {};
  
  try {
    // Read all files in the locales directory
    const files = fs.readdirSync(localesDir);
    
    // Filter for JSON files and load them
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const code = file.replace('.json', '');
        try {
          localeFiles[code] = require(path.join(localesDir, file));
          console.log(`Loaded locale: ${code}`);
        } catch (error) {
          console.error(`Failed to load locale ${code}:`, error);
        }
      }
    });
    
    console.log(`Loaded ${Object.keys(localeFiles).length} locale files`);
  } catch (error) {
    console.error('Failed to read locales directory:', error);
    // Fallback to English if directory read fails
    localeFiles.en = require('../locales/en.json');
  }
  
  return localeFiles;
}

const localeFiles = loadLocaleFiles();

// Build menu translations from locale files
const menuTranslations = Object.entries(localeFiles).reduce((acc, [code, data]) => {
  acc[code] = {
    file: data.menu.file,
    newProject: data.menu.newProject,
    openProject: data.menu.openProject,
    saveProject: data.menu.saveProject,
    exportProject: data.menu.exportProject,
    importProject: data.menu.importProject,
    closeProject: data.menu.closeProject,
    openProjectFolder: data.menu.openProjectFolder,
    exit: data.menu.exit,
    view: data.menu.view,
    toggleDarkMode: data.menu.toggleDarkMode,
    changeAccentColor: data.menu.changeAccentColor,
    fullscreen: data.menu.fullscreen,
    language: data.menu.language,
    help: data.menu.help,
    about: data.menu.about
  };
  return acc;
}, {});

let currentLocale = 'en';

function createMenu(locale = 'en', isDev = false) {
  currentLocale = locale;
  const t = menuTranslations[locale] || menuTranslations.en;
  
  const template = [
    {
      label: t.file,
      submenu: [
        {
          label: t.newProject,
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            state.getMainWindow().webContents.send('menu-new-project');
          }
        },
        {
          label: t.openProject,
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            state.getMainWindow().webContents.send('menu-open-project');
          }
        },
        {
          label: t.saveProject,
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            state.getMainWindow().webContents.send('menu-save-project');
          }
        },
        { type: 'separator' },
        {
          label: t.exportProject,
          enabled: state.getCurrentProject() !== null,
          click: () => {
            state.getMainWindow().webContents.send('menu-export-project');
          }
        },
        {
          label: t.importProject,
          click: () => {
            state.getMainWindow().webContents.send('menu-import-project');
          }
        },
        { type: 'separator' },
        {
          label: t.openProjectFolder,
          click: () => {
            state.getMainWindow().webContents.send('menu-open-project-folder');
          }
        },
        { type: 'separator' },
        {
          label: t.closeProject,
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            state.getMainWindow().webContents.send('menu-close-project');
          }
        },
        { type: 'separator' },
        {
          label: t.exit,
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: t.view,
      submenu: [
        {
          label: t.toggleDarkMode,
          click: () => {
            state.getMainWindow().webContents.send('menu-toggle-dark-mode');
          }
        },
        {
          label: t.changeAccentColor,
          click: () => {
            state.getMainWindow().webContents.send('menu-change-accent-color');
          }
        },
        { type: 'separator' },
        {
          label: t.fullscreen,
          accelerator: 'F11',
          click: () => {
            // Toggle fullscreen on the focused window
            const focusedWindow = BrowserWindow.getFocusedWindow();
            const playerWindow = state.getPlayerWindow();
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
              // Notify player renderer if it's the player window
              if (focusedWindow === playerWindow) {
                playerWindow.webContents.send('toggle-fullscreen');
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Minimal Mode',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            state.getMainWindow().webContents.send('menu-toggle-minimal-mode');
          }
        },
        { type: 'separator' },
        {
          label: 'Enable Visual Display',
          type: 'checkbox',
          checked: state.getVisualDisplayEnabled(),
          click: () => {
            state.getMainWindow().webContents.send('menu-toggle-visual-display');
          }
        },
        {
          label: 'Open/Close Player Window',
          accelerator: 'CmdOrCtrl+P',
          enabled: state.getVisualDisplayEnabled(),
          click: () => {
            if (!state.getVisualDisplayEnabled()) return;
            if (state.getPlayerWindow()) {
              closePlayerWindow();
            } else {
              createPlayerWindow();
            }
          }
        },
        { type: 'separator' },
        {
          label: t.language,
          submenu: Object.values(localeFiles).map((localeData) => ({
            label: localeData._metadata.nativeName,
            type: 'radio',
            checked: locale === localeData._metadata.code,
            click: () => {
              state.getMainWindow().webContents.send('menu-change-language', localeData._metadata.code);
              createMenu(localeData._metadata.code, isDev);
            }
          }))
        },
        ...(isDev ? [
          { type: 'separator' },
          {
            label: 'Show Current State',
            accelerator: 'CmdOrCtrl+Shift+D',
            click: () => {
              createStateViewerWindow();
            }
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { 
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            const mainWindow = state.getMainWindow();
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
        ] : [])
      ]
    },
    {
      label: t.help,
      submenu: [
        {
          label: t.about,
          click: () => {
            state.getMainWindow().webContents.send('menu-show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handler registration — all handlers live in electron/ipc/ and
// electron/media/; registered explicitly in one ordered block.
const rebuildMenu = () => createMenu(currentLocale, state.isDevMode);
filesIpc.register();
projectIpc.register({ rebuildMenu });
playerIpc.register({ rebuildMenu });
miscIpc.register({
  createMenu,
  checkForManualUpdate,
  getLocaleFiles: () => localeFiles,
});
waveform.register();
ytdlp.register();

// Register custom protocol for app
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('liveplay', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('liveplay');
}

// For Windows, we need to handle the protocol differently
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine) => {
    // Someone tried to run a second instance, we should focus our window
    const mainWindow = state.getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    // Register protocol to serve local media files safely
    protocol.handle('local-media', (request) => {
      const url = request.url.replace('local-media://', '');
      const filePath = decodeURIComponent(url);
      console.log('[Protocol] Serving local-media:', filePath);
      return net.fetch('file://' + filePath);
    });

    // Setup bundled ffmpeg before creating window
    const ffmpegReady = await checkAndSetupFfmpeg();
    if (!ffmpegReady) {
      console.error('Warning: Bundled ffmpeg failed to initialize. Audio processing may be limited.');
    }
    
    createWindow({ createMenu, startAPIServer });
    
    // If a file was opened before the app was ready, open it now
    const mainWindow = state.getMainWindow();
    if (fileToOpen && mainWindow) {
      mainWindow.once('ready-to-show', () => {
        openFile(fileToOpen);
        fileToOpen = null;
      });
    }
  });
}

// Handle file opening on Windows/Linux (when file is double-clicked)
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  
  const mainWindow = state.getMainWindow();
  if (mainWindow && mainWindow.webContents) {
    // Window is ready, open the file immediately
    openFile(filePath);
  } else {
    // Window not ready yet, store the file path
    fileToOpen = filePath;
  }
});

// Handle command line arguments (Windows/Linux)
if (process.platform === 'win32' || process.platform === 'linux') {
  // Check if a file was passed as argument
  const fileArg = process.argv.find(arg => arg.endsWith('.liveplay') || arg.endsWith('.lpa'));
  if (fileArg) {
    fileToOpen = fileArg;
  }
}

// Helper function to open a project file
function openFile(filePath) {
  const mainWindow = state.getMainWindow();
  if (!mainWindow) return;
  
  try {
    // Check if it's an .lpa archive file
    if (filePath.endsWith('.lpa')) {
      // Trigger import process for .lpa files
      mainWindow.webContents.send('open-lpa-file', { lpaPath: filePath });
      console.log('Triggering import for .lpa file:', filePath);
      return;
    }
    
    // Handle .liveplay project files
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const projectData = JSON.parse(fileContent);
    
    // Send the project data to the renderer
    mainWindow.webContents.send('open-project-file', {
      filePath: filePath,
      projectData: projectData
    });
    
    console.log('Opened project file:', filePath);
  } catch (error) {
    console.error('Failed to open project file:', error);
    
    if (mainWindow) {
      dialog.showErrorBox(
        'Failed to Open Project',
        `Could not open the project file:\n${error.message}`
      );
    }
  }
}

app.on('window-all-closed', () => {
  const apiServer = state.getApiServer();
  if (apiServer) {
    apiServer.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (state.getMainWindow() === null) {
    createWindow({ createMenu, startAPIServer });
  }
});
