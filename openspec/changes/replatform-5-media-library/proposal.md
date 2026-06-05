## Why

The fork's media library panel manages project media (browse, import, organize) via the old Electron/IPC file layer. Under the client-server architecture, the server owns the filesystem and exposes file operations over REST (`/api/fs/list`, `/api/fs/mkdir`, `/api/upload`, `/api/copy_to_media`, `/api/metadata`). The panel must be re-homed on the new client and rewired to these server endpoints so it works in both bundled-local and (future) remote topologies.

## What Changes

- Port `MediaLibraryPanel.vue` + `MediaLibraryItem.vue` into `client/app/`.
- Replace direct IPC file access with server endpoints: `/api/fs/list`, `/api/fs/mkdir`, `/api/upload`, `/api/copy_to_media`, `/api/metadata`.
- Reuse upstream's `ServerFileBrowser` / `ServerFilePickerModal` where they overlap rather than duplicating file-picker UI.
- Ensure media references use the server's relative `mediaPath` scheme (portable across hosts).

## Capabilities

### New Capabilities

- `media-library-server`: the media library panel re-homed on the client and backed by server file endpoints.

### Modified Capabilities

_(supersedes the fork's pre-replatform `media-library-panel` spec)_

## Impact

- New components under `client/app/`.
- Consumes upstream server file APIs; no server changes expected.
- Aligns media paths with the server's relativize-on-save behavior.
- Depends on: `replatform-1-foundation`. Benefits from `replatform-3-ui-ports` patterns.
