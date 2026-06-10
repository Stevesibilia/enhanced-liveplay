const { app, BrowserWindow, ipcMain, dialog, shell, Menu, protocol, clipboard, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const express = require('express');
const https = require('https');
const { pathIsInProjectFolder } = require('./lib/path-guard');
const { compareVersions } = require('./lib/version');
const { getMimeType } = require('./lib/mime');
const state = require('./state');
const {
  createWindow,
  createStateViewerWindow,
  createPlayerWindow,
  closePlayerWindow,
  enterMinimalMode,
  exitMinimalMode,
} = require('./windows');
const { checkAndSetupFfmpeg } = require('./media/ffmpeg');
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

// IPC Handlers
ipcMain.handle('select-project-folder', async () => {
  const result = await dialog.showOpenDialog(state.getMainWindow(), {
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-project-file', async () => {
  const result = await dialog.showOpenDialog(state.getMainWindow(), {
    properties: ['openFile'],
    filters: [{ name: 'E-LivePlay Project', extensions: ['liveplay'] }]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-audio-files', async () => {
  const result = await dialog.showOpenDialog(state.getMainWindow(), {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return null;
});

ipcMain.handle('select-visual-media-files', async () => {
  const result = await dialog.showOpenDialog(state.getMainWindow(), {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Visual Media', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'pdf'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return null;
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const safe = pathIsInProjectFolder(filePath, state.getCurrentProject());
    if (!safe) return { success: false, error: 'Path outside project folder' };
    const data = await fs.promises.readFile(safe, 'utf8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('read-audio-file', async (event, filePath) => {
  try {
    const safe = pathIsInProjectFolder(filePath, state.getCurrentProject());
    if (!safe) return { success: false, error: 'Path outside project folder' };
    const data = await fs.promises.readFile(safe);
    // Convert Node.js Buffer to ArrayBuffer
    const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    return { success: true, data: Array.from(new Uint8Array(arrayBuffer)) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    const safe = pathIsInProjectFolder(filePath, state.getCurrentProject());
    if (!safe) return { success: false, error: 'Path outside project folder' };
    await fs.promises.writeFile(safe, data, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('copy-file', async (event, source, destination) => {
  try {
    // Source may be outside the project (user-selected via native dialog) — only guard destination
    const safeSrc = path.resolve(source);
    const safeDst = pathIsInProjectFolder(destination, state.getCurrentProject());
    if (!safeDst) return { success: false, error: 'Destination outside project folder' };
    // Ensure destination directory exists
    const destDir = path.dirname(safeDst);
    await fs.promises.mkdir(destDir, { recursive: true });
    await fs.promises.copyFile(safeSrc, safeDst);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('ensure-directory', async (event, dirPath) => {
  try {
    const safe = pathIsInProjectFolder(dirPath, state.getCurrentProject());
    if (!safe) return { success: false, error: 'Path outside project folder' };
    await fs.promises.mkdir(safe, { recursive: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    shell.openPath(folderPath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Open external URL in default browser
ipcMain.handle('open-external', async (event, url) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Clipboard
ipcMain.handle('write-clipboard-text', (event, text) => {
  clipboard.writeText(text);
  return { success: true };
});

// Update menu language from renderer
ipcMain.handle('update-menu-language', async (event, locale) => {
  createMenu(locale, state.isDevMode);
  return { success: true };
});

// Auto-updater IPC handlers
ipcMain.handle('check-for-updates', async () => {
  try {
    console.log('Manual update check requested');
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (error) {
    console.error('Check for updates error:', error);
    console.log('Attempting fallback manual update check...');
    
    // Try fallback method
    try {
      const manualUpdateInfo = await checkForManualUpdate();
      if (manualUpdateInfo) {
        return { 
          success: true, 
          isManualUpdate: true,
          updateInfo: manualUpdateInfo 
        };
      } else {
        return { success: true, updateInfo: null };
      }
    } catch (fallbackError) {
      console.error('Fallback update check error:', fallbackError);
      return { success: false, error: error.message };
    }
  }
});

ipcMain.handle('download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (error) {
    console.error('Download update error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-system-locale', () => {
  // Get the system locale from Electron
  const systemLocale = app.getLocale(); // Returns locale like 'en-US', 'es-ES', 'fr-FR', etc.
  
  // Extract just the language code (e.g., 'en' from 'en-US')
  const languageCode = systemLocale.split('-')[0].toLowerCase();
  
  return languageCode;
});

ipcMain.handle('get-available-locales', () => {
  // Return list of available locale codes and metadata
  return Object.keys(localeFiles).map(code => ({
    code,
    name: localeFiles[code]._metadata.nativeName,
    direction: localeFiles[code]._metadata.direction
  }));
});

ipcMain.handle('get-locale-data', (event, localeCode) => {
  // Return the full locale data for a specific locale
  if (localeCode in localeFiles) {
    return localeFiles[localeCode];
  }
  // Fallback to English if locale not found
  return localeFiles.en;
});

ipcMain.handle('set-current-project', async (event, projectPath) => {
  state.setCurrentProject(projectPath);
  // Rebuild menu to update enabled/disabled state of menu items
  createMenu(currentLocale, state.isDevMode);
  return { success: true };
});

// Renderer reports the active project's visual-display flag (on project load or toggle).
// Main process mirrors the value to drive menu state and player-window auto-close.
ipcMain.handle('set-visual-display-enabled', async (event, enabled) => {
  const next = !!enabled;
  const wasEnabled = state.getVisualDisplayEnabled();
  state.setVisualDisplayEnabled(next);
  // Auto-close player window when visuals are disabled.
  if (wasEnabled && !next && state.getPlayerWindow()) {
    closePlayerWindow();
  }
  createMenu(currentLocale, state.isDevMode);
  return { success: true };
});

// Visual media supported extensions
const VISUAL_MEDIA_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf'];

// Import visual media file — copies to media/visuals/<uuid>_<filename>
ipcMain.handle('import-visual-media', async (event, projectFolderPath, sourceFilePath, uuid) => {
  try {
    const ext = path.extname(sourceFilePath).toLowerCase();
    if (!VISUAL_MEDIA_EXTENSIONS.includes(ext)) {
      return { success: false, error: `Unsupported file type: ${ext}. Supported: ${VISUAL_MEDIA_EXTENSIONS.join(', ')}` };
    }

    const visualsDir = path.join(projectFolderPath, 'media', 'visuals');
    // Ensure media/visuals/ directory exists
    if (!fs.existsSync(visualsDir)) {
      fs.mkdirSync(visualsDir, { recursive: true });
    }

    const originalName = path.basename(sourceFilePath);
    const destFileName = `${uuid}_${originalName}`;
    const destPath = path.join(visualsDir, destFileName);

    fs.copyFileSync(sourceFilePath, destPath);

    const relativePath = `media/visuals/${destFileName}`;
    return { success: true, mediaFileName: destFileName, mediaPath: relativePath };
  } catch (error) {
    console.error('Import visual media error:', error);
    return { success: false, error: error.message };
  }
});

// Read visual media file — returns base64-encoded data
ipcMain.handle('read-visual-media', async (event, projectFolderPath, mediaPath) => {
  try {
    const fullPath = path.join(projectFolderPath, mediaPath);
    if (!fs.existsSync(fullPath)) {
      return { success: false, error: 'File not found' };
    }
    const data = fs.readFileSync(fullPath);
    return { success: true, data: data.toString('base64'), mimeType: getMimeType(fullPath) };
  } catch (error) {
    console.error('Read visual media error:', error);
    return { success: false, error: error.message };
  }
});

// Delete visual media file from disk
ipcMain.handle('delete-visual-media', async (event, projectFolderPath, mediaPath) => {
  try {
    const fullPath = path.join(projectFolderPath, mediaPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return { success: true };
  } catch (error) {
    console.error('Delete visual media error:', error);
    return { success: false, error: error.message };
  }
});

// Player window IPC handlers
ipcMain.handle('open-player-window', () => {
  createPlayerWindow();
  return { success: true };
});

ipcMain.handle('close-player-window', () => {
  closePlayerWindow();
  return { success: true };
});

ipcMain.handle('get-player-window-status', () => {
  const playerWindow = state.getPlayerWindow();
  return { open: !!playerWindow && !playerWindow.isDestroyed() };
});

// Accepts a PlayerDisplayState payload: { layers: PublishedLayer[] }.
// (Legacy single-item payloads are no longer emitted by the renderer; the
// player.html handler keeps a compatibility branch for safety.)
ipcMain.handle('push-to-player', (event, displayState) => {
  // Cache the newest state first so it survives a not-yet-ready renderer and
  // a window reopen. Only send now if the renderer has signalled readiness;
  // otherwise 'player-ready' (or did-finish-load) will flush it.
  state.setLastDisplayState(displayState);
  const playerWindow = state.getPlayerWindow();
  if (playerWindow && !playerWindow.isDestroyed() && state.getPlayerReady()) {
    playerWindow.webContents.send('display-state', displayState);
    return { success: true };
  }
  return { success: false, queued: true };
});

// The player renderer signals readiness after attaching its display-state
// listener. Flush the buffered state so the first publish never gets dropped.
ipcMain.on('player-ready', () => {
  state.setPlayerReady(true);
  const lastDisplayState = state.getLastDisplayState();
  const playerWindow = state.getPlayerWindow();
  if (lastDisplayState && playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.webContents.send('display-state', lastDisplayState);
  }
});

ipcMain.handle('toggle-player-fullscreen', () => {
  const playerWindow = state.getPlayerWindow();
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.setFullScreen(!playerWindow.isFullScreen());
    playerWindow.webContents.send('toggle-fullscreen');
    return { success: true };
  }
  return { success: false, error: 'Player window not open' };
});

// Handle F11 from player renderer
ipcMain.on('player-toggle-fullscreen', () => {
  const playerWindow = state.getPlayerWindow();
  if (playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.setFullScreen(!playerWindow.isFullScreen());
    playerWindow.webContents.send('toggle-fullscreen');
  }
});

// Export project to .lpa archive
ipcMain.handle('export-project', async (event, projectFolderPath, projectName = null) => {
  try {
    const archiver = require('archiver');
    // Use provided project name or fall back to folder name
    const defaultName = projectName || path.basename(projectFolderPath);
    
    // Show save dialog for .lpa file
    const result = await dialog.showSaveDialog(state.getMainWindow(), {
      title: 'Export Project',
      defaultPath: `${defaultName}.lpa`,
      filters: [
        { name: 'E-LivePlay Archive', extensions: ['lpa'] }
      ]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, canceled: true };
    }

    const outputPath = result.filePath;
    const fileName = path.basename(outputPath);
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      let totalBytes = 0;
      let processedBytes = 0;

      output.on('close', () => {
        event.sender.send('export-progress', { percentage: 100, fileName });
        resolve({
          success: true,
          path: outputPath,
          size: archive.pointer()
        });
      });

      archive.on('error', (err) => {
        reject({ success: false, error: err.message });
      });

      // Track progress by monitoring data being written
      archive.on('data', (chunk) => {
        processedBytes += chunk.length;
        if (totalBytes > 0) {
          const percentage = Math.min(99, Math.round((processedBytes / totalBytes) * 100));
          event.sender.send('export-progress', { percentage, fileName });
        }
      });

      archive.pipe(output);
      
      // Calculate total size first
      const calculateSize = (dirPath) => {
        let size = 0;
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            size += calculateSize(filePath);
          } else {
            size += stats.size;
          }
        }
        return size;
      };
      
      totalBytes = calculateSize(projectFolderPath);
      event.sender.send('export-progress', { percentage: 0, fileName });
      
      // Add the entire project folder to the archive
      archive.directory(projectFolderPath, false);
      
      archive.finalize();
    });
  } catch (error) {
    console.error('Export error:', error);
    return { success: false, error: error.message };
  }
});

// Import project from .lpa archive
ipcMain.handle('import-project', async (event) => {
  try {
    const extractZip = require('extract-zip');
    
    // Show open dialog for .lpa file
    const fileResult = await dialog.showOpenDialog(state.getMainWindow(), {
      title: 'Import Project',
      properties: ['openFile'],
      filters: [
        { name: 'E-LivePlay Archive', extensions: ['lpa'] }
      ]
    });

    if (fileResult.canceled || fileResult.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const archivePath = fileResult.filePaths[0];
    const fileName = path.basename(archivePath);

    // Show folder dialog for extraction location
    const folderResult = await dialog.showOpenDialog(state.getMainWindow(), {
      title: 'Select Extraction Location',
      properties: ['openDirectory', 'createDirectory']
    });

    if (folderResult.canceled || folderResult.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const extractPath = folderResult.filePaths[0];

    // Send initial progress
    event.sender.send('import-progress', { percentage: 0, fileName });

    // Extract the archive with progress updates
    await extractZip(archivePath, { 
      dir: extractPath,
      onEntry: (entry, zipfile) => {
        const percentage = Math.round((zipfile.entriesRead / zipfile.entryCount) * 100);
        event.sender.send('import-progress', { percentage, fileName });
      }
    });

    // Send completion
    event.sender.send('import-progress', { percentage: 100, fileName });

    // Find all .liveplay files in the extracted folder
    const files = fs.readdirSync(extractPath);
    const projectFiles = files.filter(file => file.endsWith('.liveplay'));

    if (projectFiles.length === 0) {
      return { success: false, error: 'No .liveplay file found in archive' };
    }

    // If multiple project files found, return them for user selection
    if (projectFiles.length > 1) {
      return {
        success: true,
        multipleProjects: true,
        projectFiles,
        extractPath
      };
    }

    // Single project file - return its path directly
    const projectPath = path.join(extractPath, projectFiles[0]);

    return {
      success: true,
      projectPath,
      extractPath
    };
  } catch (error) {
    console.error('Import error:', error);
    return { success: false, error: error.message };
  }
});

// Import project from specific .lpa file (for double-click file association)
ipcMain.handle('import-lpa-file', async (event, archivePath) => {
  try {
    const extractZip = require('extract-zip');
    const fileName = path.basename(archivePath);

    // Show folder dialog for extraction location
    const folderResult = await dialog.showOpenDialog(state.getMainWindow(), {
      title: 'Select Extraction Location',
      properties: ['openDirectory', 'createDirectory']
    });

    if (folderResult.canceled || folderResult.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    const extractPath = folderResult.filePaths[0];

    // Send initial progress
    event.sender.send('import-progress', { percentage: 0, fileName });

    // Extract the archive with progress updates
    await extractZip(archivePath, { 
      dir: extractPath,
      onEntry: (entry, zipfile) => {
        const percentage = Math.round((zipfile.entriesRead / zipfile.entryCount) * 100);
        event.sender.send('import-progress', { percentage, fileName });
      }
    });

    // Send completion
    event.sender.send('import-progress', { percentage: 100, fileName });

    // Find all .liveplay files in the extracted folder
    const files = fs.readdirSync(extractPath);
    const projectFiles = files.filter(file => file.endsWith('.liveplay'));

    if (projectFiles.length === 0) {
      return { success: false, error: 'No .liveplay file found in archive' };
    }

    // If multiple project files found, return them for user selection
    if (projectFiles.length > 1) {
      return {
        success: true,
        multipleProjects: true,
        projectFiles,
        extractPath
      };
    }

    // Single project file - return its path directly
    const projectPath = path.join(extractPath, projectFiles[0]);

    return {
      success: true,
      projectPath,
      extractPath
    };
  } catch (error) {
    console.error('Import LPA file error:', error);
    return { success: false, error: error.message };
  }
});

// State viewer: Receive state updates from renderer and forward to state viewer window
ipcMain.on('update-app-state', (event, appState) => {
  const stateViewerWindow = state.getStateViewerWindow();
  if (stateViewerWindow && !stateViewerWindow.isDestroyed()) {
    // Make sure webContents is ready
    if (stateViewerWindow.webContents && !stateViewerWindow.webContents.isDestroyed()) {
      console.log('[Main] Forwarding state to viewer window');
      stateViewerWindow.webContents.send('state-update', appState);
    }
  }
});

// Check if dev mode is enabled
ipcMain.handle('is-dev-mode', () => {
  return state.isDevMode;
});

// Minimal mode — logic lives in windows.js
ipcMain.handle('enter-minimal-mode', () => enterMinimalMode());

ipcMain.handle('exit-minimal-mode', () => exitMinimalMode());

// Check FFmpeg availability
ipcMain.handle('check-ffmpeg', async () => {
  return {
    available: state.getFfmpegAvailable(),
    path: state.getFfmpegPath() || null
  };
});

// Media IPC handlers (waveform generation, YouTube search/download)
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

// MIDI Config Handlers
const midiConfigPath = path.join(app.getPath('userData'), 'midi-config.json');

ipcMain.handle('read-midi-config', async () => {
  try {
    if (fs.existsSync(midiConfigPath)) {
      const data = fs.readFileSync(midiConfigPath, 'utf-8');
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Failed to read MIDI config:', error);
    return {};
  }
});

ipcMain.handle('write-midi-config', async (event, config) => {
  try {
    fs.writeFileSync(midiConfigPath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Failed to write MIDI config:', error);
    throw new Error('Failed to save MIDI configuration');
  }
});

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
