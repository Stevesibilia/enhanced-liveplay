## Context

`electron/main.js` (2225 lines, CommonJS) is the entire Electron main process. Current internal layout:

```
  1–17     requires + local-media protocol registration
 24–103    ffmpeg/ffprobe discovery (bundled → system fallback)
109–210    yt-dlp binary download / 7-day refresh
211–220    pathIsInProjectFolder() — security guard for all fs IPC
226–293    Express remote-control API (port 8080+, trigger/stop cues over HTTP)
295–430    autoUpdater config + checkForManualUpdate + compareVersions
431–870    window factories: main / state-viewer / player, closePlayerWindow
872–1113   locale loading + menu builder (20 languages)
1114–1456  ~25 ipcMain.handle/on — fs, dialogs, locale, update, visual media, player
1482–1709  project import/export (.lpa archives via archiver/extract-zip)
1710–1760  app state push, minimal mode, ffmpeg check
1762–2086  waveform generation + YouTube search/download
2087–2230  single-instance lock, lifecycle, open-file, MIDI config IPC
```

Cross-cutting mutable globals: `mainWindow`, `playerWindow`, `stateViewerWindow`, `currentProject`, `ffmpegPath`/`ffmpegAvailable`, `ytDlpPath`/`ytDlpReady`, `apiServer`, `playerReady`, `visualDisplayEnabled`, `isDevMode`. Everything reads/writes them from shared module scope.

Constraints:
- Renderer (`app/`) is Nuxt 4 + TS and must not change; IPC channel names and payload shapes are frozen (typed in `app/types/ipc.ts`).
- Main process has zero test coverage; only manual smoke testing catches boot breakage.
- Repo workflow is small sequential PRs against `dev` on the fork (see AGENTS.md); CI release triggers on `package.json` version changes only, so refactor PRs do not cut releases.

## Goals / Non-Goals

**Goals:**
- `main.js` becomes a thin bootstrap (~120 lines): requires, protocol registration, single-instance lock, lifecycle hooks, ordered calls into modules.
- Each concern lives in one focused CommonJS module with explicit dependencies.
- Pure helpers (`compareVersions`, `getMimeType`, `pathIsInProjectFolder`) become unit-tested functions in `electron/lib/`.
- App boots and passes manual smoke after every PR in the sequence.

**Non-Goals:**
- No TypeScript migration of the main process (separate decision, maybe never).
- No behavior changes: same IPC channels, same windows, same menu, same API server, same update flow.
- No fixing of `webSecurity: false` (tracked separately).
- No renderer or preload changes.

## Decisions

### D1: Shared state via `state.js` module with getters/setters

A single `electron/state.js` owns the mutable refs (`mainWindow`, `playerWindow`, `stateViewerWindow`, `currentProject`, `playerReady`, `visualDisplayEnabled`, ffmpeg/yt-dlp status, `apiServer`). Modules import it and use `state.getMainWindow()` / `state.setCurrentProject(p)`.

- *Why*: the globals are the only thing coupling the nine concerns. A state module makes every dependency an explicit import and breaks require cycles (api-server needs mainWindow; windows need menu; menu needs windows).
- *Alternative considered*: dependency injection (pass refs into every factory). Rejected: heavier ceremony than a hobby app needs, and CJS module singletons give the same effect with less plumbing.

### D2: IPC modules export explicit `register()` functions

Each `ipc/*.js` exports `register()` (importing `state.js` itself); `main.js` calls them in a visible, ordered block. No self-registration on require.

- *Why*: registration order is auditable in one place, modules are loadable in tests without touching `ipcMain`, and a forgotten registration fails loudly at review time rather than silently at runtime.
- *Alternative considered*: side-effectful `require('./ipc/files')` auto-registering. Rejected: hides behavior in import order, untestable.

### D3: Pure functions extracted to `electron/lib/` and parameterized

`pathIsInProjectFolder(requestedPath, projectPath)` takes the active project path as an argument instead of reading the `currentProject` global; `main.js`/`ipc/files.js` pass `state.getCurrentProject()`. `compareVersions` and `getMimeType` move as-is.

- *Why*: removing the global read makes the security guard a pure function — trivially unit-testable (prefix tricks, `..` traversal, no-project case) with plain vitest, no Electron mocking.
- *Alternative considered*: testing via `electron-mocha` or mocking `electron` in vitest. Rejected: heavy setup for three functions; parameterization is simpler and improves the API.

### D4: Keep CommonJS, no build step for main

Modules are plain `.js` CJS files, `package.json` `main` stays `electron/main.js`, electron-builder config untouched.

- *Why*: zero toolchain risk; the win here is structure and testability, not types. TS-for-main would couple a build-pipeline decision to a mechanical refactor.

### D5: One module group per PR, strict sequence

1. **PR 1 — `lib/` + cleanup**: extract `compareVersions`, `getMimeType`, `pathIsInProjectFolder` to `electron/lib/`, add vitest unit tests, delete `spike-onend.html` and `visual.md`.
2. **PR 2 — `state.js` + `windows.js`**: riskiest move (everything touches window refs); do it while the rest is still in main.js so only one seam changes.
3. **PR 3 — `media/`**: ffmpeg, ytdlp, waveform — biggest line count, most self-contained.
4. **PR 4 — `ipc/`**: handler groups with `register()` pattern.
5. **PR 5 — leaf modules**: `menu.js`, `api-server.js`, `updater.js`; `main.js` reaches final thin-bootstrap form.

- *Why*: app must boot between steps and there is no automated safety net; small diffs keep manual smoke meaningful and rollback trivial (revert one PR).

### D6: Vitest stays the single test runner

Unit tests for `electron/lib/*` live in `tests/` next to existing suites and run in plain Node environment — possible only because extracted functions are Electron-free (D3).

## Risks / Trade-offs

- [Main process has no automated tests; a bad move breaks app boot] → small PRs (D5), manual smoke checklist per PR: app boots, project opens, cue plays, player window opens/publishes, YouTube search/download works, .lpa export/import works, menu language switches, minimal mode toggles.
- [Hidden temporal coupling: some globals are set during `app.whenReady` and read later (e.g. `ffmpegPath` inside waveform/download handlers)] → `state.js` getters preserve late-binding semantics; never capture state values at require time, always read at call time.
- [Require cycles between windows/menu (menu actions create windows; windows set menu)] → both depend only on `state.js`; cross-calls go through callbacks or lazy `require` inside functions, verified per PR.
- [Single-instance/`open-file` logic interacts with window creation timing on macOS] → keep all lifecycle wiring in `main.js`; modules never subscribe to `app` events themselves.
- [`getMimeType` duplication risk: a MIME map may also exist renderer-side] → check during PR 1; if duplicated, note it but do not unify across process boundary in this change.

## Migration Plan

Each PR: branch from `dev`, mechanical move with no logic edits (except D3 parameterization), `npm run test`, manual smoke checklist, merge. Rollback = revert the single PR; no data, schema, or IPC contract changes anywhere in the sequence.

## Open Questions

- None blocking. Final grouping of `ipc/misc.js` (locale/update/midi/clipboard) may shift slightly once PR 4 is cut; acceptable drift.
