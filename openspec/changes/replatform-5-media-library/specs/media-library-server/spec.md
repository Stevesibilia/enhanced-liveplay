## ADDED Requirements

### Requirement: Server-backed File Operations

The media library SHALL perform all filesystem operations via server REST endpoints (`/api/fs/list`, `/api/fs/mkdir`, `/api/upload`, `/api/copy_to_media`, `/api/metadata`) and SHALL NOT use the removed renderer/IPC file layer for these.

#### Scenario: Browse via server

- **WHEN** the user browses media
- **THEN** the listing SHALL come from `GET /api/fs/list`

#### Scenario: Import via server

- **WHEN** the user imports a media file
- **THEN** it SHALL be uploaded/copied via `/api/upload` and `/api/copy_to_media`

### Requirement: File Picker Reuse

The panel SHALL compose upstream's `ServerFileBrowser` / `ServerFilePickerModal` rather than duplicating file-browsing UI.

#### Scenario: Single browsing experience

- **WHEN** the user opens a file picker from the media library
- **THEN** it SHALL use the upstream server file-browser components

### Requirement: Portable Media References

Imported media SHALL be referenced by relative `mediaPath` (relative to the project folder), relying on the server's relativize-on-save.

#### Scenario: Media resolves on another host

- **WHEN** a project with imported media is opened on a different host
- **THEN** media SHALL resolve via its relative path

### Requirement: Asynchronous UX

File operations SHALL present asynchronous loading/progress states and SHALL NOT assume synchronous IPC.

#### Scenario: Progress during import

- **WHEN** a large media file is imported
- **THEN** the UI SHALL show progress and remain responsive

### Requirement: No Server Changes

The capability SHALL be implementable against existing upstream server file endpoints with no server-side changes.

#### Scenario: Works on vanilla server

- **WHEN** the media library runs against an unmodified upstream server
- **THEN** all file operations SHALL succeed
