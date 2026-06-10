const { ipcMain, dialog, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathIsInProjectFolder } = require('../lib/path-guard');
const state = require('../state');

// Filesystem and dialog IPC handlers. Called once from main.js.
function register() {
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
}

module.exports = { register };
