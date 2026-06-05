# Re-platform Migration Plan — onto Upstream v2.1.1 Client-Server + C++ Engine

**Status:** planning · **Decided:** 2026-06-05 · **Target base:** `upstream/main` (LivePlay v2.1.1)

## Goal

Adopt upstream's decoupled client-server architecture (C++20 audio engine in `server/`,
Electron+Nuxt client in `client/`) and re-port this fork's unique features onto it, while
keeping the visual subsystem fully decoupled so it never depends on upstream acceptance.

## Background / divergence

- Fork point (merge-base): `c8c6b93` (2026-05-10). Both were the same monolithic
  Nuxt/Electron/Howler app then.
- Since split: this fork **+72 commits**, upstream **+63 commits**. Opposite directions —
  **no clean `git merge`** (files moved `app/`→`client/app/`, audio core swapped Howler→C++).
- Upstream now: C++20 engine (miniaudio, Crow, TagLib), REST `:4480`, WebSocket `/ws`
  60 Hz meters, UDP `:4481` LAN discovery, server-owned project state + BackupManager,
  device routing + loudness standards. Cross-platform preserved (Win x64, macOS x64/arm64,
  Linux). Desktop app bundles a **local server per host** (`client/electron/main.js` spawns it).

## Strategy: reverse the base

Treat this fork's features as a patch set on top of upstream's working foundation. Do **not**
merge upstream's rewrite into this tree.

1. Branch `feat/replatform-server` **from `upstream/main`** (gets working server + client + all
   63 upstream fixes).
2. Re-land root infra: `.claude/`, `AGENTS.md`, `openspec/`, `tests/`, CI, `justfile`.
3. Copy this fork's unique feature files into `client/app/`.
4. Rewrite each feature's data source: Howler/IPC → `useLiveplayServer` REST/WS.
5. Reconcile features both forks built independently (keep best).
6. Decide framework version (upstream Nuxt 3 vs this fork's Nuxt 4 migration).
7. Drop Howler remnants; verify meters/volume/routing via server.

## Feature inventory

### Port (unique to this fork)

| Feature                                                   | Files                                                                                                                     | Audio-coupled?                        | Cost              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------- |
| Visual display subsystem                                  | `LiveDisplayPanel`, `VisualPropertiesPane`, `useVisualDisplay`, `useVisualMedia`, `usePlayerSync`, `electron/player.html` | No (2nd window)                       | MED — see Phase 4 |
| Media library panel                                       | `MediaLibraryPanel`, `MediaLibraryItem`                                                                                   | File ops → wire to server `/api/fs/*` | MED               |
| Minimal mode                                              | `MinimalWorkspace` + always-on-top window                                                                                 | No                                    | LOW-MED           |
| Cue picker                                                | `CuePicker`                                                                                                               | No                                    | LOW               |
| Import/export, listeners, resizable panel, update checker | `useImportExport`, `useMenuListeners`, `useWorkspaceListeners`, `useResizablePanel`, `useUpdateChecker`                   | No                                    | LOW               |

### Reconcile (both forks built it)

- MIDI (`useMidiController` + `MidiConfigModal`) — upstream added MIDI too.
- Cart hotkeys (`useCartHotkeys`).
- Framework/runtime upgrade (this fork: Nuxt 4 / Electron 42; upstream: own migration).
- `utils/migrations.ts` vs upstream server-side `ProjectState::load` migration + `RepairInfo`.
  Diff cases; port only what the C++ loader lacks, else drop.

### Drop (obsolete under C++ engine)

- `useAudioEngine.ts` (Howler, ~42 KB) → replaced by `useLiveplayServer`/`useLiveMeters`/`useOutputTarget`.
- `VUMeter` → upstream `StereoMeter`/`LiveMeterBar` (server-fed).
- Volume/master slider → upstream `VolumeSlider` + routing matrix.
- Howler-specific bug fixes (loop Howl-leak, stop-fade skip, −10 dB offset).

## Phases

1. **Foundation** — branch from upstream; build C++ server (CMake 3.21+, vcpkg, Ninja,
   C++20); confirm client↔server runs. (Biggest unknown — upstream CI shows macOS/Linux
   toolchain pain. Spike this first.)
2. **Infra** — re-land repo tooling, CI, tests, AGENTS/openspec at root.
3. **Cheap UI ports** — cue picker, minimal mode, listeners, resizable panel, import/export.
4. **Visual subsystem** — as a self-contained client-side sidecar plugin (see below).
5. **Media library** — wire to server `/api/fs/*` + upload endpoints.
6. **Reconcile** — MIDI, cart hotkeys, migrations/project-state, framework version.
7. **Drop & verify** — remove Howler remnants; verify meters/volume/routing via server.

## Phase 4 — Visual subsystem as a self-contained sidecar plugin

### Why a plugin

Upstream maintainer may not adopt the visual feature. The visual subsystem needs **nothing**
from the C++ audio engine — it is a second Electron window rendering images/PDFs, triggered by
playback events. Decouple it fully from both the `.liveplay` document and the server so it
survives any upstream change and tracks upstream's server verbatim (zero server fork).

### Findings that make this safe (verified in upstream source)

- `ProjectState::save()` dumps the raw stored `document_` verbatim — **unknown fields are NOT
  stripped** ("Persist the full client-shaped document"). So visual data baked in `.liveplay`
  would survive on disk even on a vanilla upstream server.
- `GET /api/project` returns `full_document()` (entire raw JSON, unknown fields included) —
  the client **can read** arbitrary fields back.
- **Write gap:** write endpoints (`/api/cues` POST) are typed (`to_json(CueMeta)` drops
  `linkDelay` and all non-standard fields). There is no generic "set arbitrary field" endpoint.

Conclusion: disk-safe + read-safe, but no clean server write path → store visual state in a
**sidecar file** the client owns directly. Avoids any server fork.

### Design

```
client/app/modules/visual/            (drop-in module — remove ⇒ base app unaffected)
  useVisualDisplay.ts     state, reads <projectFolder>/visuals.json
  useVisualMedia.ts       CRUD, writes sidecar via electron fs (client host)
  usePlayerSync.ts        drives 2nd BrowserWindow (electron/player.html)
  LiveDisplayPanel.vue
  VisualPropertiesPane.vue
  trigger: useLiveplayServer.onDocPatch + transport WS → apply linkDelay → show visual
```

- **Storage:** `visuals.json` sidecar in the project folder (NOT in `.liveplay`). Travels with
  the project folder like media — works with the shared-folder, non-simultaneous workflow.
- **Audio↔visual link:** stored in the sidecar keyed by audio item `uuid` (stable; present in
  `/api/cues` catalogue and full document). **Never write to audio items** → no server write
  endpoint needed.
- **Sync:** read-only consumer of server WS transport events; no engine change.
- **Media files:** in the bundled-local-server topology the client host _is_ the project-folder
  host → visual window loads media via `file://` directly.

### Sidecar schema (`<projectFolder>/visuals.json`)

```jsonc
{
  "schemaVersion": 1,
  "visualDisplayEnabled": true,
  "visualFolders": ["Maps", "Slides"],
  "visualMedia": [
    {
      "uuid": "a1b2c3d4",
      "displayName": "Battle Map",
      "mediaPath": "media/visuals/a1b2c3d4_battle-map.jpg", // relative to project folder
      "mediaType": "image", // "image" | "pdf"
      "folder": "Maps",
    },
  ],
  "links": [
    {
      "audioItemUuid": "f9e8d7c6", // key into /api/cues catalogue
      "visualUuid": "a1b2c3d4",
      "linkDelay": -2.0, // signed seconds: >0 audio first, <0 visual first, 0 = simultaneous
    },
  ],
}
```

Migration from current in-`.liveplay` layout: on first open of a legacy project, read
`visualMedia`/`visualFolders`/`visualDisplayEnabled` + per-item `linkDelay` from the project
document (via `GET /api/project`), write them out to `visuals.json`, and stop persisting them
into the project doc. The existing `saveProject()`-based visual write path disappears in the
re-platform regardless, so this rewrite is required, not optional.

### Future promotion path

If upstream later adopts the feature, promote the sidecar into the project document with a
small migration (sidecar → in-doc fields). No data model loss either direction.

### Out of scope (v1)

- **Remote-client topology** (client on a different host than the project files): `file://`
  won't reach visuals; would need a static-file serve endpoint. Not needed for the
  shared-folder/local-server workflow.

## Cross-cutting risks

- **C++ toolchain in CI** — vcpkg + Ninja + C++20 per platform; upstream history shows real
  macOS/Linux build friction. Spike in Phase 1.
- **Shared-folder concurrency** — upstream has **no `.liveplay` lock** (only a port-in-use
  guard). Non-simultaneous open is fine (last-save-wins on conflict). Consider adding a lock
  file if simultaneous-open safety is ever needed. Keep server versions in sync across hosts
  (first newer server to save upgrades the file to v2 schema).
- **AGPL-3.0** — server distribution keeps source obligations.
  </content>
