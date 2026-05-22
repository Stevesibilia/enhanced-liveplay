## Why

With the visual media data model in place, the GM needs a way to browse, import, organize, and select visual media. A dedicated Media Library panel provides the UI for managing all visual assets within a project — the "file browser" for maps, handouts, and NPC art.

## What Changes

- New tab/panel in main window UI for visual media browsing
- Folder tree navigation with user-created folders
- Import via drag-and-drop and file picker (both)
- Thumbnail grid/list view of media items
- Folder management (create, rename, delete)
- Context menu for item operations (rename, move to folder, delete)
- Clicking an item stages it in the preview panel (handled by preview-panel change, but selection event emitted here)

## Capabilities

### New Capabilities
- `media-library-panel`: UI panel for browsing, importing, and organizing visual media items with folder structure

### Modified Capabilities

## Impact

- New `app/components/MediaLibraryPanel.vue` component
- New `app/components/MediaLibraryItem.vue` for individual item rendering
- `app/components/MainWorkspace.vue` — add tab/panel toggle for media library
- `app/composables/useProject.ts` — consume CRUD helpers from visual-media-model
- New composable `app/composables/useVisualDisplay.ts` — manages selection/staging state
