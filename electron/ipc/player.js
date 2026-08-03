const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getMimeType } = require('../lib/mime');
const state = require('../state');
const { createPlayerWindow, closePlayerWindow } = require('../windows');
const { broadcastDisplayState, closeAllViewers } = require('../remote-viewer');

// Non-internal IPv4 addresses the tablet could reach the server on.
function lanAddresses() {
  const out = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) out.push(iface.address);
    }
  }
  return out;
}

// Reachable viewer URLs for every LAN address on the actual bound port.
function remoteViewerUrls() {
  const port = state.getApiServerPort();
  if (!port) return [];
  return lanAddresses().map((ip) => `http://${ip}:${port}/player`);
}

// Player window and visual media IPC handlers.
// deps: { rebuildMenu } — re-renders the app menu with the current locale.
function register(deps) {
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
    deps.rebuildMenu();
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

  // Remote viewer (LAN browser) toggle + status.
  ipcMain.handle('set-remote-viewer-enabled', (event, enabled) => {
    const next = !!enabled;
    state.setRemoteViewerEnabled(next);
    // Disabling drops connected tablets immediately.
    if (!next) closeAllViewers();
    return { success: true, enabled: next };
  });

  ipcMain.handle('get-remote-viewer-status', () => {
    return {
      enabled: state.getRemoteViewerEnabled(),
      localEnabled: state.getLocalViewerEnabled(),
      port: state.getApiServerPort(),
      urls: remoteViewerUrls(),
    };
  });

  // Local viewer (second-monitor player window) toggle. Enabling opens the
  // window; disabling closes it. The window lifecycle also keeps
  // localViewerEnabled in sync (see windows.js), so this stays consistent with
  // the menu item and OS-driven window close.
  ipcMain.handle('set-local-viewer-enabled', (event, enabled) => {
    const next = !!enabled;
    if (next) {
      state.setLocalViewerEnabled(true);
      const pw = state.getPlayerWindow();
      if (!pw || pw.isDestroyed()) createPlayerWindow();
    } else {
      // closePlayerWindow -> 'closed' handler clears the flag.
      if (state.getPlayerWindow()) closePlayerWindow();
      state.setLocalViewerEnabled(false);
    }
    return { success: true, localEnabled: next };
  });

  // Accepts a PlayerDisplayState payload: { layers: PublishedLayer[] }.
  // (Legacy single-item payloads are no longer emitted by the renderer; the
  // player.html handler keeps a compatibility branch for safety.)
  ipcMain.handle('push-to-player', (event, displayState) => {
    // Cache the newest state first so it survives a not-yet-ready renderer and
    // a window reopen. Only send now if the renderer has signalled readiness;
    // otherwise 'player-ready' (or did-finish-load) will flush it.
    state.setLastDisplayState(displayState);
    // Mirror to any connected remote viewers (SSE). Independent of the local
    // player window's readiness — the buffered state also replays on connect.
    broadcastDisplayState(displayState);
    // Auto-open the local player window only when it is a wanted output. This
    // is independent of the remote viewer: both outputs can be on at once, and
    // a remote-only operator (local disabled) never gets the window forced open.
    let playerWindow = state.getPlayerWindow();
    if (state.getLocalViewerEnabled() && (!playerWindow || playerWindow.isDestroyed())) {
      createPlayerWindow();
      playerWindow = state.getPlayerWindow();
    }
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
}

module.exports = { register };
