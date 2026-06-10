## Purpose

Confine renderer-initiated filesystem access to the active project's folder. The path guard is the security boundary for all filesystem IPC in the Electron main process.
## Requirements
### Requirement: Filesystem IPC handlers reject paths outside the project folder

The Electron main process filesystem IPC handlers (`read-file`, `write-file`, `copy-file`) SHALL reject any request whose resolved path does not start with the active project's folder path. If no project is loaded, all requests are allowed (the user is interacting via native OS dialogs).

#### Scenario: Valid path inside project folder is accepted
- **GIVEN** a project is loaded at `/home/user/shows/my-show`
- **WHEN** the renderer requests `read-file` with path `/home/user/shows/my-show/media/song.mp3`
- **THEN** the handler SHALL read and return the file contents

#### Scenario: Path outside project folder is rejected
- **GIVEN** a project is loaded at `/home/user/shows/my-show`
- **WHEN** the renderer requests `read-file` with path `/etc/passwd`
- **THEN** the handler SHALL return an error with `success: false`
- **AND** SHALL NOT read the file

#### Scenario: Path traversal is rejected
- **GIVEN** a project is loaded at `/home/user/shows/my-show`
- **WHEN** the renderer requests `write-file` with path `/home/user/shows/my-show/../../.ssh/authorized_keys`
- **THEN** the resolved path SHALL be outside the project folder
- **AND** the handler SHALL return an error with `success: false`

#### Scenario: No project loaded allows all requests
- **GIVEN** no project is currently loaded
- **WHEN** the renderer requests any filesystem IPC call
- **THEN** the handler SHALL allow the request (user is selecting files via native OS dialogs)

#### Scenario: Copy-file only guards destination
- **GIVEN** a project is loaded
- **WHEN** the renderer requests `copy-file` with a source outside the project folder and destination inside
- **THEN** the handler SHALL allow the copy (source comes from a native file picker)
- **AND** SHALL reject if the destination is outside the project folder

### Requirement: Filesystem IPC handlers use async I/O

The `read-file`, `write-file`, and `copy-file` IPC handlers SHALL use `fs.promises` (async) instead of synchronous `fs.*Sync` methods. The main process event loop SHALL NOT be blocked by filesystem operations.

#### Scenario: Large file read does not block the main process
- **WHEN** a `read-file` request is made for a large file
- **THEN** the handler SHALL use `fs.promises.readFile`
- **AND** other IPC messages SHALL continue to be processed during the read

### Requirement: Path guard is a pure, parameterized, unit-tested function

The project-folder path guard SHALL be a pure function `pathIsInProjectFolder(requestedPath, projectPath)` in `electron/lib/`, taking the active project file path as a parameter instead of reading module-scope state. Guard semantics are unchanged: resolve the requested path, return it if it equals the project folder or starts with the project folder plus a path separator, return `null` otherwise, and allow all paths when `projectPath` is null/undefined. The function SHALL have vitest unit test coverage.

#### Scenario: Guard is callable without Electron
- **WHEN** `pathIsInProjectFolder` is imported in a plain Node test process
- **THEN** it SHALL be callable with explicit arguments and return resolved-path or `null` results

#### Scenario: Prefix-trick path is rejected in unit tests
- **GIVEN** a project at `/home/user/shows/my-show/project.liveplay`
- **WHEN** the guard is called with `/home/user/shows/my-show-evil/file.mp3`
- **THEN** it SHALL return `null` (the separator check prevents sibling-folder prefix tricks)

#### Scenario: Path traversal is rejected in unit tests
- **GIVEN** a project at `/home/user/shows/my-show/project.liveplay`
- **WHEN** the guard is called with `/home/user/shows/my-show/../../../etc/passwd`
- **THEN** it SHALL return `null`

#### Scenario: No project allows access
- **WHEN** the guard is called with any path and a null/undefined project path
- **THEN** it SHALL return the resolved requested path

#### Scenario: IPC handlers pass the active project explicitly
- **WHEN** a filesystem IPC handler validates a path
- **THEN** it SHALL call the guard with the current project path obtained from the shared state module

