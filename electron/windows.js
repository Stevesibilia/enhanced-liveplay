const { BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const state = require('./state');

// Session-only player window bounds, restored when the window reopens
let playerWindowBounds = null;
// Main-window bounds saved on entering minimal mode, restored on exit
let savedBounds = null;

// deps: { createMenu, startAPIServer } — provided by main.js to avoid a
// require cycle while menu and API server still live there.
function createWindow(deps) {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(__dirname, '../assets/icons/2x/app_icon_darkmode@2x.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false // Allow loading local files
    },
    show: false
  });
  state.setMainWindow(mainWindow);

  if (state.isDevMode) {
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load the generated static files
    const indexPath = path.join(__dirname, '../.output/public/index.html');
    console.log('Loading production index from:', indexPath);
    console.log('File exists:', fs.existsSync(indexPath));

    mainWindow.loadFile(indexPath).catch(err => {
      console.error('Failed to load index.html:', err);
    });
  }

  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    // Check for updates only in production
    if (!state.isDevMode) {
      // Wait a bit for the window to fully load before checking updates
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
          console.error('Failed to check for updates:', err);
        });
      }, 3000);
    }
  });

  mainWindow.on('closed', () => {
    state.setMainWindow(null);
  });

  deps.createMenu('en', state.isDevMode);
  deps.startAPIServer();
}

// Create state viewer window for debugging
function createStateViewerWindow() {
  const existing = state.getStateViewerWindow();
  if (existing) {
    existing.focus();
    return;
  }

  const stateViewerWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'E-LivePlay - Current State Viewer',
    icon: path.join(__dirname, '../assets/icons/2x/app_icon_darkmode@2x.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-state-viewer.js')
    }
  });
  state.setStateViewerWindow(stateViewerWindow);

  // Create a simple HTML page for the state viewer
  const stateViewerHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>E-LivePlay State Viewer</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: #1e1e1e;
          color: #d4d4d4;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          height: 100vh;
        }
        
        .header {
          background: #252526;
          padding: 12px 20px;
          border-bottom: 1px solid #3e3e42;
          flex-shrink: 0;
        }
        
        h1 {
          font-size: 16px;
          font-weight: 600;
          color: #cccccc;
        }
        
        .container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }
        
        .state-section {
          margin-bottom: 24px;
          background: #252526;
          border: 1px solid #3e3e42;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .section-header {
          background: #2d2d30;
          padding: 10px 16px;
          font-weight: 600;
          font-size: 13px;
          color: #cccccc;
          border-bottom: 1px solid #3e3e42;
          cursor: pointer;
          user-select: none;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .section-header:hover {
          background: #3e3e42;
        }
        
        .collapse-icon {
          font-size: 12px;
          transition: transform 0.2s;
        }
        
        .collapse-icon.collapsed {
          transform: rotate(-90deg);
        }
        
        .section-content {
          padding: 16px;
          overflow: hidden;
        }
        
        .section-content.collapsed {
          display: none;
        }
        
        pre {
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.5;
          overflow-x: auto;
          white-space: pre;
        }
        
        /* JSON Syntax Highlighting */
        .json-key {
          color: #9cdcfe;
        }
        
        .json-string {
          color: #ce9178;
        }
        
        .json-number {
          color: #b5cea8;
        }
        
        .json-boolean {
          color: #569cd6;
        }
        
        .json-null {
          color: #569cd6;
        }
        
        .update-time {
          font-size: 11px;
          color: #858585;
          margin-top: 8px;
        }
        
        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }
        
        ::-webkit-scrollbar-track {
          background: #1e1e1e;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #424242;
          border-radius: 5px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #4e4e4e;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>E-LivePlay - Current State Viewer (Development Mode)</h1>
      </div>
      <div class="container" id="container"></div>
      
      <script>
        const collapsedSections = new Set();
        const scrollPositions = new Map();
        
        function syntaxHighlight(json) {
          json = JSON.stringify(json, null, 2);
          json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return json.replace(/("(\\\\u[a-zA-Z0-9]{4}|\\\\[^u]|[^\\\\"])*"(\\s*:)?|\\b(true|false|null)\\b|-?\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d+)?)/g, function (match) {
            let cls = 'json-number';
            if (/^"/.test(match)) {
              if (/:$/.test(match)) {
                cls = 'json-key';
              } else {
                cls = 'json-string';
              }
            } else if (/true|false/.test(match)) {
              cls = 'json-boolean';
            } else if (/null/.test(match)) {
              cls = 'json-null';
            }
            return '<span class="' + cls + '">' + match + '</span>';
          });
        }
        
        function toggleSection(sectionId) {
          const section = document.getElementById(sectionId);
          const icon = document.getElementById(sectionId + '-icon');
          const content = document.getElementById(sectionId + '-content');
          
          if (collapsedSections.has(sectionId)) {
            collapsedSections.delete(sectionId);
            content.classList.remove('collapsed');
            icon.classList.remove('collapsed');
          } else {
            // Save scroll position before collapsing
            scrollPositions.set(sectionId, content.scrollTop);
            collapsedSections.add(sectionId);
            content.classList.add('collapsed');
            icon.classList.add('collapsed');
          }
        }
        
        function updateState(state) {
          console.log('[State Viewer] updateState called with:', Object.keys(state));
          const container = document.getElementById('container');
          if (!container) {
            console.error('[State Viewer] Container not found!');
            return;
          }
          
          const currentScroll = container.scrollTop;
          
          // Save scroll positions for each section
          const sections = container.querySelectorAll('.section-content');
          sections.forEach(section => {
            if (section.id) {
              scrollPositions.set(section.id, section.scrollTop);
            }
          });
          
          let html = '';
          
          for (const [key, value] of Object.entries(state)) {
            const sectionId = 'section-' + key;
            const isCollapsed = collapsedSections.has(sectionId);
            
            html += \`
              <div class="state-section">
                <div class="section-header" onclick="toggleSection('\${sectionId}')">
                  <span>\${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                  <span class="collapse-icon \${isCollapsed ? 'collapsed' : ''}" id="\${sectionId}-icon">▼</span>
                </div>
                <div class="section-content \${isCollapsed ? 'collapsed' : ''}" id="\${sectionId}-content">
                  <pre>\${syntaxHighlight(value)}</pre>
                  <div class="update-time">Last updated: \${new Date().toLocaleTimeString()}</div>
                </div>
              </div>
            \`;
          }
          
          container.innerHTML = html;
          console.log('[State Viewer] Updated DOM with', Object.keys(state).length, 'sections');
          
          // Restore scroll positions
          container.scrollTop = currentScroll;
          scrollPositions.forEach((scrollTop, sectionId) => {
            const section = document.getElementById(sectionId);
            if (section) {
              section.scrollTop = scrollTop;
            }
          });
        }
        
        // Listen for state updates
        window.electronAPI.onStateUpdate((event, state) => {
          console.log('[State Viewer] Received state update:', Object.keys(state));
          updateState(state);
        });
        
        // Initial message
        console.log('[State Viewer] Initialized, waiting for updates...');
        updateState({
          message: 'Waiting for state updates from main application...'
        });
      </script>
    </body>
    </html>
  `;

  stateViewerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(stateViewerHTML));

  // Make sure the window is ready before we start receiving updates
  stateViewerWindow.webContents.once('did-finish-load', () => {
    console.log('[Main] State viewer window loaded and ready');
  });

  stateViewerWindow.on('closed', () => {
    state.setStateViewerWindow(null);
  });
}

// Create player window for second-monitor display output
function createPlayerWindow() {
  const existing = state.getPlayerWindow();
  if (existing) {
    existing.focus();
    return;
  }

  const windowOptions = {
    width: 1280,
    height: 720,
    frame: true,
    backgroundColor: '#000000',
    title: 'E-LivePlay Player',
    icon: path.join(__dirname, '../assets/icons/2x/app_icon_darkmode@2x.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload-player.js'),
      webSecurity: false // Allow loading local file:// images and PDFs
    },
    show: false
  };

  // Restore previous bounds if available (session-only)
  if (playerWindowBounds) {
    windowOptions.x = playerWindowBounds.x;
    windowOptions.y = playerWindowBounds.y;
    windowOptions.width = playerWindowBounds.width;
    windowOptions.height = playerWindowBounds.height;
  }

  const playerWindow = new BrowserWindow(windowOptions);
  state.setPlayerWindow(playerWindow);

  // Renderer is not listening until it signals 'player-ready'.
  state.setPlayerReady(false);

  // Load the player HTML
  const playerHtmlPath = path.join(__dirname, 'player.html');
  playerWindow.loadFile(playerHtmlPath);

  playerWindow.once('ready-to-show', () => {
    playerWindow.show();
  });

  // Fallback flush in case the 'player-ready' handshake is ever missed:
  // re-send the last state once the contents finish loading.
  playerWindow.webContents.on('did-finish-load', () => {
    const lastDisplayState = state.getLastDisplayState();
    if (lastDisplayState && !playerWindow.isDestroyed()) {
      playerWindow.webContents.send('display-state', lastDisplayState);
    }
  });

  // Handle F11 for fullscreen toggle in player window
  playerWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      event.preventDefault();
      playerWindow.setFullScreen(!playerWindow.isFullScreen());
      playerWindow.webContents.send('toggle-fullscreen');
    }
  });

  playerWindow.on('closed', () => {
    state.setPlayerWindow(null);
    // Keep lastDisplayState so a reopen restores content; just mark not-ready.
    state.setPlayerReady(false);
  });

  // Notify main renderer that player window opened
  const mainWindow = state.getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('player-window-status-changed', true);
  }
}

function closePlayerWindow() {
  const playerWindow = state.getPlayerWindow();
  if (!playerWindow) return;

  // Persist bounds in memory for session restore
  try {
    playerWindowBounds = playerWindow.getBounds();
  } catch (e) {
    // Window may already be destroyed
  }

  playerWindow.close();
  state.setPlayerWindow(null);

  // Notify main renderer that player window closed
  const mainWindow = state.getMainWindow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('player-window-status-changed', false);
  }
}

// Minimal mode — save bounds, resize, always-on-top
function enterMinimalMode() {
  const mainWindow = state.getMainWindow();
  if (!mainWindow) return;
  savedBounds = mainWindow.getBounds();
  mainWindow.setMinimumSize(200, 100);
  mainWindow.setResizable(false);
  mainWindow.setResizable(true);
  mainWindow.setMenuBarVisibility(false);
  setTimeout(() => {
    const win = state.getMainWindow();
    if (win) win.setSize(420, 340);
  }, 200);
}

function exitMinimalMode() {
  const mainWindow = state.getMainWindow();
  if (!mainWindow) return;
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setMenuBarVisibility(true);
  mainWindow.setMinimumSize(1200, 700);
  mainWindow.setMaximumSize(0, 0); // Unrestricted in full mode
  if (savedBounds) {
    mainWindow.setBounds(savedBounds);
    savedBounds = null;
  }
}

module.exports = {
  createWindow,
  createStateViewerWindow,
  createPlayerWindow,
  closePlayerWindow,
  enterMinimalMode,
  exitMinimalMode,
};
