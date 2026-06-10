const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const state = require('../state');

// Project lifecycle IPC handlers: active-project tracking, .lpa
// export/import, and the state-viewer forwarder.
// deps: { rebuildMenu } — re-renders the app menu with the current locale.
function register(deps) {
  ipcMain.handle('set-current-project', async (event, projectPath) => {
    state.setCurrentProject(projectPath);
    // Rebuild menu to update enabled/disabled state of menu items
    deps.rebuildMenu();
    return { success: true };
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
}

module.exports = { register };
