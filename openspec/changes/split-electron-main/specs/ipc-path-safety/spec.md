## ADDED Requirements

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
