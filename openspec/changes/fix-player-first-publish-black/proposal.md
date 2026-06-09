## Why

The first publish after opening a project frequently leaves the player window black: the layers never render even though the composition shows them published. A re-publish (or any later state change) then renders correctly. This is a startup race — the very first show cue silently fails, which is the worst possible moment for it.

Root cause is in `usePlayerSync.syncToPlayer`: when the player window isn't open yet it calls `openPlayerWindow()`, waits a **fixed 500 ms**, then pushes the state once via `push-to-player`. The push is fire-and-forget — `main.js` forwards it to `playerWindow.webContents.send('display-state', ...)` with no guarantee the renderer has finished loading `player.html` and attached its `onDisplayState` listener. If the renderer isn't ready within 500 ms (cold start, slow disk, large project), the IPC message is dropped and the window stays black. There is no buffering and no re-flush.

## What Changes

- Replace the fixed 500 ms timeout with a **readiness handshake**: the player renderer signals the main process when it has mounted and attached its display-state listener.
- The main process **caches the last display state** (`lastDisplayState`) and flushes it to the player window as soon as the renderer signals ready (and on every reconnect / `did-finish-load`). Pushes that arrive before the renderer is ready are buffered, not dropped.
- `usePlayerSync` no longer races on a magic timeout; it pushes the state and trusts the main process to deliver it once the window is ready.
- The cached state also makes player-window **reopen** correct: closing and reopening the window restores the current published composition instead of showing black.

## Capabilities

### Modified Capabilities
- `player-window`: Display-state delivery becomes buffered and handshake-driven. The first push after auto-opening the window SHALL render reliably regardless of renderer load time; the last pushed state SHALL be re-flushed on player-window ready and reopen.

## Impact

- **Renderer**: `app/composables/usePlayerSync.ts` — drop the fixed `setTimeout(500)`; push state unconditionally after ensuring the window is open, relying on main-process buffering.
- **Main process**: `electron/main.js` — add a `lastDisplayState` cache; on `push-to-player`, store then send; add a `player-ready` IPC channel; flush `lastDisplayState` on `player-ready` and on `playerWindow` `did-finish-load`; clear nothing on close (keep cache for reopen) but reset to black when state is explicitly cleared.
- **Player renderer**: `electron/player.html` + `electron/preload-player.js` — emit `player-ready` after `onDisplayState` is registered.
- **No schema change.** No data migration. Pure delivery-reliability fix.
- **Risk:** low. Worst case the handshake doesn't fire and we fall back to sending on `did-finish-load`, which is strictly better than the current fixed-timeout behavior.
