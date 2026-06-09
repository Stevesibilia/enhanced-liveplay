## Context

`syncToPlayer` (in `app/composables/usePlayerSync.ts`) is the single chokepoint that pushes published composition state to the player window. Current flow:

```
syncToPlayer(state)
  └─ getPlayerWindowStatus()
       ├─ open?  ── yes ──▶ pushToPlayer(state)            // works (window already up)
       └─ no  ──▶ openPlayerWindow()
                   await sleep(500ms)        ← THE BUG: hope renderer is ready
                   pushToPlayer(pendingState)              // dropped if not ready yet
```

`pushToPlayer` → `ipcMain.handle('push-to-player')` → `playerWindow.webContents.send('display-state', ...)`. `webContents.send` to a renderer that has not yet executed `window.playerAPI.onDisplayState(renderState)` is silently lost — Electron does not queue renderer-bound sends.

## Goals

- First publish after auto-open renders reliably, no matter how long `player.html` takes to load.
- Closing and reopening the player window restores the current composition.
- Remove the timing guess; make delivery deterministic.

## Decision: main-process buffer + renderer-ready handshake

Two coordinated pieces:

**1. Main caches the last state and owns delivery.**

```
let lastDisplayState = null;   // newest state, survives across renderer reloads

ipcMain.handle('push-to-player', (e, state) => {
  lastDisplayState = state;
  if (playerWindow && !playerWindow.isDestroyed() && playerReady) {
    playerWindow.webContents.send('display-state', state);
    return { success: true };
  }
  return { success: false, queued: true };   // will flush on player-ready
});
```

**2. Renderer signals readiness after attaching its listener.**

`player.html`, at the end of its script (after `onDisplayState(renderState)` is registered and `clearDisplay()` has run):

```
window.playerAPI.signalReady();   // → ipcRenderer.send('player-ready')
```

Main, on `player-ready`, marks ready and flushes:

```
ipcMain.on('player-ready', () => {
  playerReady = true;
  if (lastDisplayState && playerWindow && !playerWindow.isDestroyed()) {
    playerWindow.webContents.send('display-state', lastDisplayState);
  }
});
```

Belt-and-braces: also flush on `playerWindow.webContents.on('did-finish-load')` in case the handshake is ever missed. On `createPlayerWindow`, reset `playerReady = false` so a reopened window re-handshakes; **keep** `lastDisplayState` so reopen restores content.

**3. `usePlayerSync` stops racing.**

```
const syncToPlayer = async (state) => {
  if (!import.meta.client || !window.electronAPI) return;
  const status = await window.electronAPI.getPlayerWindowStatus();
  if (!status.open) await window.electronAPI.openPlayerWindow();
  await window.electronAPI.pushToPlayer(state);   // main buffers until ready
};
```

The `pendingState` useState and the `setTimeout(500)` are removed. Buffering moves from renderer to main, where the readiness signal actually lives.

## Alternatives considered

- **Increase the timeout (e.g. 1500 ms).** Rejected — still a race, just a slower failure; also adds latency to every first publish on fast machines.
- **Renderer-side retry loop.** Rejected — renderer can't know if its own send landed; the authority on "am I loaded" is the renderer, and the authority on "is there a window" is main. The handshake puts each fact where it lives.
- **Poll `webContents.isLoading()` from main before sending.** Rejected — `isLoading()` false ≠ listener attached; the script may run after load completes. Explicit `player-ready` is precise.

## Verification

Manual (Electron app, multi-window): cold-start a project with published layers, trigger first publish, confirm image renders immediately. Repeat on a large project. Close + reopen player window → composition restored. Black button → window clears.
