## Why

The visual display feature needs a second window that can be placed on a player-facing monitor. This window receives display commands from the main window via IPC and shows the current visual content (images/PDFs) fullscreen. Without it, there's no way to present visuals to players.

## What Changes

- Add a new BrowserWindow (player window) that can be opened/closed from the main window
- Implement IPC channel for display state sync (main → player window)
- Player window renders images scaled-to-fit and PDFs at specified page
- Support "black" state (nothing displayed)
- Window remembers position/display on reopen
- Frameless fullscreen-capable window designed for second monitor placement

## Capabilities

### New Capabilities
- `player-window`: Second BrowserWindow for displaying visual content to players, controlled via IPC from the main window

### Modified Capabilities

## Impact

- `electron/main.js` — new BrowserWindow creation, IPC handlers for display commands
- `electron/preload.js` — expose display control methods
- New `electron/preload-player.js` — preload for player window
- New Vue page/component for player window content rendering
- `app/types/global.d.ts` — new IPC type declarations
