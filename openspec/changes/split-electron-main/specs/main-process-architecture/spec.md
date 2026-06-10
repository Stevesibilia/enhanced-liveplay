## ADDED Requirements

### Requirement: Main process is organized into single-concern modules

The Electron main process SHALL be organized as focused CommonJS modules under `electron/`, each owning exactly one concern: `state.js` (shared mutable refs), `windows.js` (window factories and close logic), `menu.js` (locale loading and menu building), `api-server.js` (HTTP remote-control API), `updater.js` (auto-update), `media/ffmpeg.js`, `media/ytdlp.js`, `media/waveform.js` (binary management and media processing), and `ipc/*.js` (IPC handlers grouped by domain). `electron/main.js` SHALL contain only bootstrap and lifecycle wiring: requires, protocol registration, single-instance lock, `app` event subscriptions, and ordered module initialization.

#### Scenario: main.js contains no feature logic
- **WHEN** `electron/main.js` is inspected after the split is complete
- **THEN** it SHALL contain no `ipcMain.handle`/`ipcMain.on` registrations, no window construction, no menu building, and no media-processing logic
- **AND** all such logic SHALL live in the dedicated modules

#### Scenario: app event subscriptions stay in main.js
- **WHEN** any module other than `main.js` is inspected
- **THEN** it SHALL NOT subscribe to `app` lifecycle events (`ready`, `window-all-closed`, `activate`, `open-file`, `second-instance`)

### Requirement: Shared mutable state is owned by state.js

Cross-module mutable references (`mainWindow`, `playerWindow`, `stateViewerWindow`, `currentProject`, `playerReady`, `visualDisplayEnabled`, ffmpeg availability/path, yt-dlp readiness/path, `apiServer`) SHALL be owned by `electron/state.js` and accessed by other modules only through its exported getters and setters. Modules SHALL read state at call time, never capture state values at require time.

#### Scenario: Window reference is read at call time
- **GIVEN** the API server module needs to send an event to the main window
- **WHEN** an HTTP trigger request arrives
- **THEN** the module SHALL obtain the window via the state getter at request time
- **AND** SHALL handle a `null` window without crashing

#### Scenario: No module-scope mutable globals outside state.js
- **WHEN** any module under `electron/` other than `state.js` is inspected
- **THEN** it SHALL NOT declare module-scope mutable variables that other modules read or write

### Requirement: IPC handler modules register explicitly

Each `electron/ipc/*.js` module SHALL export a `register()` function that performs its `ipcMain.handle`/`ipcMain.on` registrations. `main.js` SHALL call each `register()` in a single visible block. Requiring an IPC module SHALL NOT register handlers as a side effect.

#### Scenario: Requiring an IPC module has no side effects
- **WHEN** an `ipc/*.js` module is required without calling `register()`
- **THEN** no IPC handlers SHALL be registered

#### Scenario: All channels remain registered after the split
- **WHEN** the app boots after the split is complete
- **THEN** every IPC channel that existed before the split SHALL be handled, with unchanged channel names and payload shapes

### Requirement: Pure helpers live in electron/lib/ with unit tests

Pure functions used by the main process (`compareVersions`, `getMimeType`, `pathIsInProjectFolder`) SHALL live in `electron/lib/`, SHALL NOT require Electron or read module-scope state, and SHALL have vitest unit test coverage running in a plain Node environment.

#### Scenario: lib modules are Electron-free
- **WHEN** any module under `electron/lib/` is required in a plain Node process (no Electron)
- **THEN** it SHALL load and its functions SHALL be callable without error

#### Scenario: Version comparison is unit-tested
- **WHEN** the test suite runs
- **THEN** `compareVersions` SHALL have tests covering greater/lesser/equal versions and unequal segment counts (e.g. `1.6` vs `1.6.0`)

### Requirement: The split preserves runtime behavior

Each refactor step SHALL be behavior-preserving: same windows, same menu, same IPC contract, same HTTP API, same update flow. The application SHALL boot and pass the manual smoke checklist after every merged step.

#### Scenario: Smoke checklist passes between steps
- **WHEN** any PR in the split sequence is merged
- **THEN** the app SHALL boot, open a project, play a cue, open the player window and publish a layer, search/download from YouTube, export and re-import a `.lpa` archive, switch menu language, and toggle minimal mode
