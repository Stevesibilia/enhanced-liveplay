## Why

E-LivePlay currently only handles audio. GMs need to display visual content (maps, handouts, NPC art) to players during TTRPG sessions. Adding a visual media data model is the foundation for the entire visual display feature — without it, no other visual component can store or reference media.

## What Changes

- Add `VisualMediaItem` interface to the type system (uuid, displayName, mediaFileName, mediaPath, mediaType, folder, linkedCueUuid, pdfPage)
- Add `visualMedia: VisualMediaItem[]` and `visualFolders: string[]` fields to the `Project` interface
- Bump project schema version to support migration
- Store visual media files in `media/visuals/` subdirectory within the project folder
- Include visual media in `.lpa` project export/import

## Capabilities

### New Capabilities
- `visual-media-model`: Data types, project schema fields, and storage conventions for visual media items (images and PDFs)

### Modified Capabilities
- `project-schema-versioning`: New schema version to accommodate visual media fields, with migration from previous version

## Impact

- `app/types/project.ts` — new interfaces and Project field additions
- `app/composables/useProject.ts` — schema migration logic, visual media CRUD helpers
- `app/composables/useImportExport.ts` — include `media/visuals/` in .lpa archives
- `electron/main.js` — file I/O handlers for visual media (read, copy into project)
