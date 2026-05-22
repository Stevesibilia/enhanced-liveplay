## 1. Window Creation

- [x] 1.1 Add `createPlayerWindow()` function in `electron/main.js` — frameless, black bg, 1920x1080 default
- [x] 1.2 Add `closePlayerWindow()` function with bounds persistence in memory
- [x] 1.3 Add position restore logic on reopen (session-only, not persisted to disk)
- [x] 1.4 Add menu item "Open/Close Player Window" to native menu
- [x] 1.5 Create `electron/preload-player.js` with minimal IPC exposure (receive display state)

## 2. IPC Protocol

- [x] 2.1 Add IPC handler `push-to-player` in main process — receives DisplayState, forwards to player webContents
- [x] 2.2 Add IPC handler `open-player-window` / `close-player-window` callable from main renderer
- [x] 2.3 Add IPC handler `get-player-window-status` returning whether window is open
- [x] 2.4 Expose `pushToPlayer`, `openPlayerWindow`, `closePlayerWindow` in main preload.js
- [x] 2.5 Add TypeScript types for DisplayState and IPC methods in `app/types/`

## 3. Player Window Renderer

- [x] 3.1 Create player window HTML/Vue entry point (minimal — just display area)
- [x] 3.2 Implement image display component (object-fit: contain, centered, black bg)
- [x] 3.3 Implement PDF page display using pdfjs-dist (render single page to canvas)
- [x] 3.4 Implement "black" state (default)
- [x] 3.5 Listen for display-state IPC messages and switch between states

## 4. Fullscreen & Input

- [x] 4.1 Add F11 keyboard handler for fullscreen toggle in player window
- [x] 4.2 Add programmatic fullscreen toggle callable from main window

## 5. Dependencies

- [x] 5.1 Add `pdfjs-dist` to package.json
- [x] 5.2 Configure pdf.js worker for Electron environment

## 6. Build Integration

- [x] 6.1 Ensure player window HTML and preload are included in electron-builder output
- [ ] 6.2 Test window creation in both dev and production builds
