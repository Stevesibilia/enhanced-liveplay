const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
const https = require('https');
const { compareVersions } = require('./lib/version');
const state = require('./state');

// Configures the auto-updater feed and event forwarding to the renderer.
// Called once from main.js at startup (matches previous module-load timing).
function configure() {
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
}

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

module.exports = { configure, checkForManualUpdate };
