## Why

The visual player display only renders inside a local Electron `BrowserWindow` on the operator's machine (second monitor via `createPlayerWindow`). Running a TTRPG session where the visual (JPGs/backgrounds) needs to be seen on a screen away from the operator — e.g. a tablet propped at the table — currently requires HDMI/casting hardware. A remote Android tablet running a plain browser could act as that viewer screen if the player display were reachable over the LAN.

## What Changes

- Serve the player display over HTTP from the existing Express API server (port `8080`) so any LAN browser (Android Chrome, kiosk mode) can render it — no app install.
- Add an HTTP media endpoint that streams local media files by path, replacing the Electron-only `local-media://` custom protocol for remote clients.
- Add a live push channel (SSE) that broadcasts every `displayState` update to connected remote viewers, mirroring the current IPC `display-state` flow to the local player window.
- Ship a browser variant of `player.html` whose `mediaUrl()` resolves to the HTTP media endpoint instead of `local-media://`.
- Expose the viewer URL (LAN IP + port) in the UI so the operator can point the tablet at it.
- LAN-trust security model: bind documented, no auth added in this change (matches the existing unauthenticated trigger API). **BREAKING**: none — additive.

## Capabilities

### New Capabilities
- `remote-viewer`: Serving the player display, its media, and live display-state updates over HTTP so a remote browser (Android tablet) renders the same visual output as the local player window.

### Modified Capabilities
<!-- None. player-window spec keeps its local IPC behavior unchanged; remote-viewer is a parallel delivery path. -->

## Impact

- **Code**: `electron/api-server.js` (new routes: `/player`, `/media/*`, `/events` SSE), reuse of the file-streaming logic from the `local-media` protocol handler in `electron/main.js`, a hook on `state.setLastDisplayState` to broadcast, a browser-variant player HTML asset, and UI surfacing of the viewer URL.
- **Dependencies**: none new — SSE over the existing Express server; no WebSocket library required.
- **Systems**: server now serves media file contents (not just trigger commands) on the LAN; scope of exposure widens from control API to file streaming. Same-LAN, unauthenticated — documented as a trust boundary.
- **Unaffected**: local player window IPC path, renderer layer/fade logic, displayState schema.
