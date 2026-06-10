const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const state = require('../state');
const { enterMinimalMode, exitMinimalMode } = require('../windows');

const midiConfigPath = path.join(app.getPath('userData'), 'midi-config.json');

// Locale, update, dev-mode, minimal-mode, ffmpeg-status, and MIDI-config
// IPC handlers.
// deps: { createMenu, checkForManualUpdate, getLocaleFiles } — provided by
// main.js while the menu and updater still live there (moves in PR 5).
function register(deps) {
  // Update menu language from renderer
  ipcMain.handle('update-menu-language', async (event, locale) => {
    deps.createMenu(locale, state.isDevMode);
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
        const manualUpdateInfo = await deps.checkForManualUpdate();
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
    return Object.keys(deps.getLocaleFiles()).map(code => ({
      code,
      name: deps.getLocaleFiles()[code]._metadata.nativeName,
      direction: deps.getLocaleFiles()[code]._metadata.direction
    }));
  });

  ipcMain.handle('get-locale-data', (event, localeCode) => {
    // Return the full locale data for a specific locale
    if (localeCode in deps.getLocaleFiles()) {
      return deps.getLocaleFiles()[localeCode];
    }
    // Fallback to English if locale not found
    return deps.getLocaleFiles().en;
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
}

module.exports = { register };
