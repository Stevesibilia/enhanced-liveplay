## Context

The visual player display renders only in a local Electron `BrowserWindow` (`createPlayerWindow` in `electron/windows.js`), loading `electron/player.html` from disk and receiving `displayState` over IPC (`ipc/player.js` → `display-state` channel). Images resolve via the Electron-only `local-media://` custom protocol (`electron/main.js`), with a `file://` fallback — neither works in a remote browser.

The Express API server (`electron/api-server.js`, port `8080`) already runs and already sends messages into the main window over IPC. It currently exposes unauthenticated trigger/stop/project routes bound to all interfaces.

Goal: let a remote Android tablet's browser render the same visual output by reaching this server over the LAN.

## Goals / Non-Goals

**Goals:**
- Serve a browser-renderable viewer page over HTTP that renders `displayState` identically to the local player window.
- Stream local media files (JPGs) to remote clients over HTTP, replacing `local-media://` for that path.
- Push every `displayState` update to connected remote viewers live.
- Surface the viewer URL (LAN IP + port) in the operator UI.
- Reuse the existing `player.html` rendering logic — no reimplementation of layer/fade/geometry.

**Non-Goals:**
- Authentication / TLS / internet exposure (LAN-trust model, matches existing trigger API).
- Native Android app, offline caching, or casting hardware.
- Audio playback on the remote (visual viewer only).
- Changing the local player window IPC path or the `displayState` schema.
- Remote control (tablet is view-only; no triggering from it).

## Decisions

### D1: SSE (not WebSocket) for the push channel
Server→client one-way stream of `displayState` JSON. SSE runs over plain HTTP on the existing Express server, auto-reconnects in the browser (`EventSource`), needs no new dependency. WebSocket would add a library and bidirectional plumbing we don't need (tablet is view-only).
- Alternative — polling: rejected, adds latency + wasted requests. Alternative — WebSocket: rejected, no bidirectional need.

### D2: One shared browser player asset, not a fork of `player.html`
Extract the renderer into an asset both the Electron window and the remote page load, differing only in how `mediaUrl()` resolves and how state arrives (IPC callback vs `EventSource`). Avoids two copies of layer/fade logic drifting.
- Transport shim at top: Electron build wires `window.playerApi.onDisplayState`; remote build wires `EventSource('/events')`. `mediaUrl()` returns `local-media://…` in Electron, `/media?path=…` in browser.
- Alternative — duplicate file: rejected, drift risk on every renderer change (layer-display bugs were recent).

### D3: Media endpoint streams by absolute path, reusing the protocol handler logic
`GET /media?path=<encoded-abs-path>` streams the file with correct content-type, porting the resolution/streaming logic already in the `local-media` handler (`electron/main.js`). Path passed as query param, decoded server-side.
- **Path-safety**: confine served files to the current project's media directory — reject paths that escape it (traversal guard), consistent with the `ipc-path-safety` spec. Do not serve arbitrary disk paths.
- Alternative — pre-copy media into a static dir: rejected, doubles disk + staleness on project switch.

### D4: Broadcast hook on the state setter
`displayState` is already buffered via `state.setLastDisplayState` (`electron/state.js`). Add a broadcast so the API server pushes the same payload to all open SSE connections. New viewers connecting mid-session immediately receive the buffered `lastDisplayState` (parity with the local window's reopen-restore behavior).
- Keep the server's SSE client registry in the api-server module; state layer stays transport-agnostic (server subscribes, or `ipc/player.js` calls both the window send and the broadcast).

### D5: Viewer URL surfaced in UI as text + QR
Show `http://<lan-ip>:<port>/player` both as selectable text and as a QR code so the operator can type it or scan it from the tablet camera. Enumerate non-internal IPv4 via `os.networkInterfaces()`; the actual bound port comes from the api-server (it increments on `EADDRINUSE`), so the server must report its final port back to the renderer. QR generated client-side in the renderer (small self-contained generator, no network).
- Alternative — text only: rejected, tablet typing a LAN IP is error-prone. QR is the fast path.

### D6: Remote serving is a toggle, default off; surfaced with the local window toggle
Remote HTTP viewer routes (`/player`, `/media`, `/events`) only respond when the operator has enabled remote viewing. The Express server keeps running (trigger API unchanged); a `remoteViewerEnabled` flag gates the new routes (return 403/404 when off), and SSE connections close when toggled off. This keeps file streaming off by default — the LAN-trust exposure is opt-in.
- Surface it next to the existing local player-window toggle (`open-player-window` / `close-player-window` in `ipc/player.js`) so both viewer outputs — local second-monitor window and remote tablet — are controlled from one place. The local window toggle already exists; this change adds the remote toggle beside it and shows the viewer URL/QR only while remote is enabled.
- Alternative — always-on: rejected, streams project media on the LAN with no opt-in.

## Risks / Trade-offs

- [Unauthenticated file streaming on the LAN widens exposure from control-only to file contents] → Path-traversal guard confining to project media dir (D3); document the LAN-trust boundary; keep it opt-in if a toggle is cheap.
- [Server binds all interfaces `0.0.0.0`] → Pre-existing for the trigger API; note in docs. Optional future: bind-address setting.
- [First JPG load latency over WiFi] → `displayState` payload is tiny (paths+geometry); browser caches media by URL; optional preload of upcoming layers is a follow-up, not this change.
- [Bound port varies (EADDRINUSE increment) so a hardcoded URL misleads] → Server reports its final port; UI shows the real one (D5).
- [SSE connection drops on tablet sleep] → `EventSource` auto-reconnects; on reconnect the server replays `lastDisplayState` (D4).
- [Renderer refactor for shared asset could regress the local window] → Cover with the existing player-window smoke gate; transport shim is thin, layer logic unchanged.

## Migration Plan

Additive — no data migration. Local player window path is untouched, so rollback = revert the change; existing behavior unaffected. Ship behind the normal release; remote viewer is only reachable if the operator opens the URL.

## Open Questions

- Resolved: remote serving is a default-off toggle surfaced beside the local player-window toggle (D6).
- Resolved: viewer URL shown as text + QR code (D5).
