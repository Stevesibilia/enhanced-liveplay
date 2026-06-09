const { contextBridge, ipcRenderer } = require('electron');
const path = require('path');

// Resolve pdf.js paths for the renderer
const pdfjsDir = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build');

contextBridge.exposeInMainWorld('playerAPI', {
  onDisplayState: (callback) => ipcRenderer.on('display-state', (event, state) => callback(state)),
  signalReady: () => ipcRenderer.send('player-ready'),
  onToggleFullscreen: (callback) => ipcRenderer.on('toggle-fullscreen', () => callback()),
  requestToggleFullscreen: () => ipcRenderer.send('player-toggle-fullscreen'),
  getPdfjsPath: () => path.join(pdfjsDir, 'pdf.min.mjs'),
  getPdfjsWorkerPath: () => path.join(pdfjsDir, 'pdf.worker.min.mjs')
});
