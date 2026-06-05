## Context

These features were built on the monolith but touch only UI state, window management, or generic IPC — not Howler. In the new client, transport state and project data arrive via `useLiveplayServer` (REST + WS `doc_patch`/transport events). Minimal mode also needs an always-on-top BrowserWindow, which is an Electron-main concern that survives the replatform.

## Goals / Non-Goals

**Goals:**

- Each feature works on the upstream client with its data source repointed.
- Establish the reusable port pattern: copy → repoint → typecheck → test.

**Non-Goals:**

- Visual subsystem (Phase 4), media library (Phase 5).
- Reconciling MIDI / cart hotkeys (Phase 6) — those exist upstream too.

## Decisions

1. **Repoint, don't rewrite** — keep component markup/logic; swap data sources to `useLiveplayServer` / surviving IPC.
2. **Minimal mode window stays Electron-main** — reuse upstream's window-management code; add an always-on-top compact window.
3. **Import/export targets server file ops where needed** — pure in-renderer transforms stay; disk access uses `/api/fs/*` or IPC as appropriate.
4. **Order by independence** — land cue picker + listeners + resizable panel first (smallest blast radius), then minimal mode, then import/export.

## Risks / Trade-offs

- [Composables assumed Howler/global state] → audit each for engine references; replace with server state.
- [Minimal mode window lifecycle vs upstream window code] → integrate rather than duplicate window management.
- [import/export schema] → align with the server-owned project document (Phase 6 covers migrations).
