## 1. Renderer readiness signal

- [ ] 1.1 In `electron/preload-player.js`, expose `signalReady: () => ipcRenderer.send('player-ready')` on `playerAPI`.
- [ ] 1.2 In `electron/player.html`, call `window.playerAPI.signalReady()` at the end of the script, after `onDisplayState(renderState)` is registered and the initial `clearDisplay()` has run.

## 2. Main-process buffering + flush

- [ ] 2.1 In `electron/main.js`, add module-level `let lastDisplayState = null;` and `let playerReady = false;`.
- [ ] 2.2 In `push-to-player` handler, store `lastDisplayState = displayState` first, then send only if `playerWindow` exists and `playerReady`; otherwise return `{ success: false, queued: true }`.
- [ ] 2.3 Add `ipcMain.on('player-ready', ...)`: set `playerReady = true`, then flush `lastDisplayState` to the player window if present.
- [ ] 2.4 In `createPlayerWindow`, set `playerReady = false` before load; add `playerWindow.webContents.on('did-finish-load', ...)` that flushes `lastDisplayState` as a fallback if the handshake is missed.
- [ ] 2.5 In `closePlayerWindow` / `'closed'` handler, set `playerReady = false` but DO NOT clear `lastDisplayState` (so reopen restores content).

## 3. Simplify usePlayerSync

- [ ] 3.1 In `app/composables/usePlayerSync.ts`, remove the `pendingState` useState and the `setTimeout(500)` wait.
- [ ] 3.2 New flow: check status → if not open call `openPlayerWindow()` → call `pushToPlayer(state)` unconditionally (main buffers until ready).
- [ ] 3.3 Confirm `PlayerDisplayState` type usage and `pushToPlayer` signature are unchanged.

## 4. Verification (manual — Electron multi-window)

- [ ] 4.1 Cold-start a project with published layers; trigger the first publish → image renders immediately, no black window.
- [ ] 4.2 Repeat on a large project (slow renderer load) → still renders on first publish.
- [ ] 4.3 Close the player window, reopen it → current composition is restored (not black).
- [ ] 4.4 Press the Black button → player clears to black; next publish renders again.
- [ ] 4.5 Rapid publish/unpublish before the window finishes loading → only the latest state shows, no stale render.
