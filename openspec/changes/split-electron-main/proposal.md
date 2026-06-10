## Why

`electron/main.js` is a 2225-line monolith mixing nine unrelated concerns (ffmpeg discovery, yt-dlp management, an HTTP remote-control API, auto-update, three window factories, menu/locale loading, ~28 IPC handlers, project import/export, app lifecycle). Every main-process feature edits this one file, agents must read all of it to safely change 20 lines, and none of it is unit-testable — including `pathIsInProjectFolder()`, the security guard for all filesystem IPC. With more features planned (visual subsystem is still growing, Spotify import pending), this file keeps getting hit.

## What Changes

- Split `electron/main.js` into focused CommonJS modules under `electron/` — no TypeScript migration, no behavior change:
  - `state.js` — shared mutable refs (`mainWindow`, `playerWindow`, `stateViewerWindow`, `currentProject`, ffmpeg/yt-dlp paths) exposed via getters/setters, eliminating cross-module globals
  - `windows.js` — main / state-viewer / player window factories, close logic, minimal mode
  - `menu.js` — locale file loading and menu building
  - `api-server.js` — Express remote-control HTTP API
  - `updater.js` — autoUpdater config, manual update check, `compareVersions`
  - `media/ffmpeg.js`, `media/ytdlp.js`, `media/waveform.js` — binary discovery/management, YouTube search/download, waveform generation
  - `ipc/files.js`, `ipc/project.js`, `ipc/player.js`, `ipc/misc.js` — IPC handlers grouped by domain, each exporting an explicit `register(state)` function called from `main.js`
  - `main.js` shrinks to bootstrap + lifecycle (~120 lines)
- Extract pure functions first (`compareVersions`, `getMimeType`, `pathIsInProjectFolder`) into `electron/lib/` with vitest unit tests — `pathIsInProjectFolder` takes the project path as a parameter instead of reading a global
- Delete stale root files `spike-onend.html` and `visual.md`
- Incremental delivery: one module group per PR, app boots and full manual smoke passes between every step

## Capabilities

### New Capabilities

- `main-process-architecture`: module boundaries, shared-state ownership, and the explicit IPC `register(state)` contract for the Electron main process; pure helpers live in `electron/lib/` and are unit-tested

### Modified Capabilities

- `ipc-path-safety`: the path guard becomes a pure, parameterized function (`pathIsInProjectFolder(requestedPath, projectPath)`) with required unit test coverage; guard semantics (resolve, prefix check with separator, allow-when-no-project) are unchanged

## Impact

- **Code**: `electron/main.js` (rewritten as thin bootstrap), ~14 new files under `electron/`; `tests/` gains unit tests for extracted pure functions
- **No renderer changes**: `app/` untouched; IPC channel names, payloads, and preload scripts unchanged
- **No dependency changes**: same npm packages, still CommonJS (`"type": "commonjs"`)
- **Build/packaging**: `electron-builder` config and `package.json` `main` entry unchanged; new files ship inside the same asar
- **Risk**: main process has zero existing test coverage, so each PR must be small and manually smoke-tested (app boot, project open, audio play, player window, YouTube download, export/import)
