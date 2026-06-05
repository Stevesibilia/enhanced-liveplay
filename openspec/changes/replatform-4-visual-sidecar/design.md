## Context

Verified in upstream source:

- `ProjectState::save()` dumps the raw stored `document_` verbatim — unknown fields are NOT stripped ("Persist the full client-shaped document"). Visual data baked in `.liveplay` survives on disk even on a vanilla upstream server.
- `GET /api/project` returns `full_document()` (entire raw JSON, unknown fields included) — the client can READ arbitrary fields back.
- Write endpoints are typed: `to_json(CueMeta)` serializes only known fields and drops `linkDelay` and anything non-standard. There is no generic "set arbitrary field" endpoint → no clean server WRITE path.

The visual subsystem needs nothing from the C++ audio engine — it is a second Electron window rendering images/PDFs, triggered by playback events. So it can be fully client-owned.

## Goals / Non-Goals

**Goals:**

- Zero server coupling: track upstream's server verbatim, no fork patch.
- Drop-in module; removing the folder leaves the base app intact.
- Preserve the shared-folder, non-simultaneous workflow.
- Lossless migration from the current in-`.liveplay` layout.

**Non-Goals:**

- Remote-client topology (client on a different host than project files) — `file://` to media won't resolve; deferred.
- Pushing visual data through the server or upstreaming the feature now.

## Decisions

1. **Sidecar storage** — `<projectFolder>/visuals.json`, not in `.liveplay`. Client reads/writes via Electron fs on the client host (which, in the bundled-local-server topology, is the project-folder host).
2. **Link map keyed by audio item `uuid`** — stored in the sidecar as `{ audioItemUuid, visualUuid, linkDelay }[]`. The `uuid` is stable and present in the `/api/cues` catalogue + full document, so the feature NEVER writes to audio items and needs no server write endpoint.
3. **Read-only server consumption** — the second window is driven by `useLiveplayServer.onDocPatch` + transport WS events; `linkDelay` is applied client-side.
4. **Media via `file://`** — visual window loads images/PDFs directly from the project folder on the client host.
5. **Module boundary** — everything under `client/app/modules/visual/`; one registration point in the workspace; deletable without touching base app.
6. **Future promotion path** — if upstream later adopts it, promote sidecar → in-document fields with a small migration; no data-model loss either direction.

## Risks / Trade-offs

- [Two files (project + sidecar) must travel together] → sidecar lives inside the project folder, same as media; covered by existing folder-sharing.
- [Remote topology unsupported in v1] → explicitly out of scope; add static-file serve later if needed.
- [Migration correctness] → one-time, idempotent; verify legacy fields fully captured before ceasing to write them to the document.
- [Sidecar concurrency on shared folder] → same non-simultaneous assumption as the project file; last-write-wins.
