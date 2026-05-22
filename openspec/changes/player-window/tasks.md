## 1. Window Creation

- [ ] 1.1 Add `createPlayerWindow()` function in `electron/main.js` — frameless, black bg, 1920x1080 default
- [ ] 1.2 Add `closePlayerWindow()` function with bounds persistence in memory
- [ ] 1.3 Add position restore logic on reopen (session-only, not persisted to disk)
- [ ] 1.4 Add menu item "Open/Close Player Window" to native menu
- [ ] 1.5 Create `electron/preload-player.js` with minimal IPC exposure (receive display state)

## 2. IPC Protocol

- [ ] 2.1 Add IPC handler `push-to-player` in main process — receives DisplayState, forwards to player webContents
- [ ] 2.2 Add IPC handler `open-player-window` / `close-player-window` callable from main renderer
- [ ] 2.3 Add IPC handler `get-player-window-status` returning whether window is open
- [ ] 2.4 Expose `pushToPlayer`, `openPlayerWindow`, `closePlayerWindow` in main preload.js
- [ ] 2.5 Add TypeScript types for DisplayState and IPC methods in `app/types/`

## 3. Player Window Renderer

- [ ] 3.1 Create player window HTML/Vue entry point (minimal — just display area)
- [ ] 3.2 Implement image display component (object-fit: contain, centered, black bg)
- [ ] 3.3 Implement PDF page display using pdfjs-dist (render single page to canvas)
- [ ] 3.4 Implement "black" state (default)
- [ ] 3.5 Listen for display-state IPC messages and switch between states

## 4. Fullscreen & Input

- [ ] 4.1 Add F11 keyboard handler for fullscreen toggle in player window
- [ ] 4.2 Add programmatic fullscreen toggle callable from main window

## 5. Dependencies

- [ ] 5.1 Add `pdfjs-dist` to package.json
- [ ] 5.2 Configure pdf.js worker for Electron environment

## 6. Build Integration

- [ ] 6.1 Ensure player window HTML and preload are included in electron-builder output
- [ ] 6.2 Test window creation in both dev and production builds
