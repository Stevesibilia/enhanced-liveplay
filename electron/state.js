const { app } = require('electron');

// Shared mutable state for the Electron main process.
//
// Every cross-module mutable reference lives here. Modules must read
// values through the getters at call time — never capture a value at
// require time — so late-bound state (windows created after startup,
// ffmpeg/yt-dlp paths resolved asynchronously) is always current.

const state = {
  mainWindow: null,
  stateViewerWindow: null, // Debug state viewer window
  playerWindow: null, // Player display window (second monitor)
  currentProject: null,
  playerReady: false, // True once the player renderer has signalled it is listening
  visualDisplayEnabled: true, // Per-project flag mirrored from renderer; gates player window menu item
  lastDisplayState: null, // Newest display state; buffered for flush + reopen
  apiServer: null,
  ffmpegPath: null,
  ffmpegAvailable: false,
  ytDlpPath: null,
  ytDlpReady: false,
};

// True when launched with --dev or running unpackaged
const isDevMode = process.argv.includes('--dev') || !app.isPackaged;

module.exports = {
  isDevMode,

  getMainWindow: () => state.mainWindow,
  setMainWindow: (win) => { state.mainWindow = win; },

  getStateViewerWindow: () => state.stateViewerWindow,
  setStateViewerWindow: (win) => { state.stateViewerWindow = win; },

  getPlayerWindow: () => state.playerWindow,
  setPlayerWindow: (win) => { state.playerWindow = win; },

  getCurrentProject: () => state.currentProject,
  setCurrentProject: (projectPath) => { state.currentProject = projectPath; },

  getPlayerReady: () => state.playerReady,
  setPlayerReady: (ready) => { state.playerReady = ready; },

  getVisualDisplayEnabled: () => state.visualDisplayEnabled,
  setVisualDisplayEnabled: (enabled) => { state.visualDisplayEnabled = enabled; },

  getLastDisplayState: () => state.lastDisplayState,
  setLastDisplayState: (displayState) => { state.lastDisplayState = displayState; },

  getApiServer: () => state.apiServer,
  setApiServer: (server) => { state.apiServer = server; },

  getFfmpegPath: () => state.ffmpegPath,
  setFfmpegPath: (p) => { state.ffmpegPath = p; },

  getFfmpegAvailable: () => state.ffmpegAvailable,
  setFfmpegAvailable: (available) => { state.ffmpegAvailable = available; },

  getYtDlpPath: () => state.ytDlpPath,
  setYtDlpPath: (p) => { state.ytDlpPath = p; },

  getYtDlpReady: () => state.ytDlpReady,
  setYtDlpReady: (ready) => { state.ytDlpReady = ready; },
};
