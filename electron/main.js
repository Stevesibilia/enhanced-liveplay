const { app, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const state = require('./state');
const { createWindow } = require('./windows');
const menu = require('./menu');
const updater = require('./updater');
const { startAPIServer } = require('./api-server');
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

// Configure auto-update feed and renderer event forwarding.
updater.configure();

let fileToOpen = null; // Store file path if app is opened with a file

// IPC handler registration — all handlers live in electron/ipc/ and
// electron/media/; registered explicitly in one ordered block.
filesIpc.register();
projectIpc.register({ rebuildMenu: menu.rebuildMenu });
playerIpc.register({ rebuildMenu: menu.rebuildMenu });
miscIpc.register({
  createMenu: menu.createMenu,
  rebuildMenu: menu.rebuildMenu,
  checkForManualUpdate: updater.checkForManualUpdate,
  getLocaleFiles: menu.getLocaleFiles,
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
    
    createWindow({ createMenu: menu.createMenu, startAPIServer });
    
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
    createWindow({ createMenu: menu.createMenu, startAPIServer });
  }
});
