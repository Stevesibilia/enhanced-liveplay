## 1. Shared renderer extraction (refactor, no behavior change)

- [x] 1.1 Extract the layer/geometry/z-order/fade renderer from `electron/player.html` into a shared player asset both builds load
- [x] 1.2 Add a transport shim: state arrives via `window.playerApi.onDisplayState` (Electron) and `mediaUrl()` returns `local-media://…`
- [x] 1.3 Wire the Electron player window to load the shared asset; confirm no renderer regression
- [ ] 1.4 Smoke gate: local player window renders images, layering, and fades identically to before (player-window spec)

## 2. Media HTTP endpoint

- [ ] 2.1 Add `GET /media?path=<encoded-abs-path>` to `electron/api-server.js`, streaming the file with correct content-type (port logic from the `local-media` handler in `electron/main.js`)
- [ ] 2.2 Add a path-traversal guard confining served files to the current project's media directory; refuse escapes (per `ipc-path-safety`)
- [ ] 2.3 Return not-found for missing files
- [ ] 2.4 Verify: request a project image by path → contents returned; request an outside/traversal path → refused; request a missing path → 404

## 3. SSE push channel

- [ ] 3.1 Add `GET /events` SSE route to `api-server.js` with a connected-client registry
- [ ] 3.2 On connect, immediately send the buffered `lastDisplayState` (`state.getLastDisplayState`)
- [ ] 3.3 Broadcast on every `displayState` update: hook alongside `state.setLastDisplayState` / the `ipc/player.js` send, pushing the same payload to all SSE clients
- [ ] 3.4 Verify: two viewers connect; operator triggers a visual → both receive and re-render; a viewer reconnecting after drop restores current state

## 4. Browser viewer page

- [ ] 4.1 Add `GET /player` route serving the browser build of the shared asset (wires `EventSource('/events')`, `mediaUrl()` → `/media?path=…`)
- [ ] 4.2 Confirm 16:9 letterbox renders correctly in Android Chrome, both orientations
- [ ] 4.3 Smoke gate: tablet on LAN opens `http://<pc-ip>:8080/player`, sees current visual, updates live on operator trigger

## 5. Remote viewer toggle (default off)

- [ ] 5.1 Add a `remoteViewerEnabled` flag (state + IPC toggle handlers, mirroring `open-player-window`/`close-player-window` in `ipc/player.js`)
- [ ] 5.2 Gate `/player`, `/media`, `/events` on the flag — refuse (403/404) when off; close open SSE connections when toggled off
- [ ] 5.3 Verify: default off → routes refused, no media streamed; enable → routes respond; disable mid-session → viewers dropped

## 6. Viewer controls + URL in UI

- [ ] 6.1 Have the API server report its actual bound port to the renderer (accounts for `EADDRINUSE` increment)
- [ ] 6.2 Enumerate non-internal IPv4 via `os.networkInterfaces()`; build `http://<lan-ip>:<port>/player`
- [ ] 6.3 Surface unified viewer-output controls: local player-window toggle beside the remote viewer toggle
- [ ] 6.4 Show the viewer URL as selectable text and a client-side QR code (self-contained generator, no network) while remote is enabled
- [ ] 6.5 Verify displayed text URL and QR both match a fallback bind when the default port is taken

## 7. Docs & guardrails

- [ ] 7.1 Document the LAN-trust boundary (unauthenticated, binds all interfaces, streams project media, opt-in via toggle) in README/guides
- [ ] 7.2 Update the `player-window` / relevant guide to mention the remote viewer path and unified toggles
- [ ] 7.3 Add/adjust tests for the media path-safety guard, SSE broadcast, and route gating where practical

