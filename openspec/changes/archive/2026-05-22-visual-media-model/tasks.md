## 1. Type Definitions

- [x] 1.1 Add `VisualMediaItem` interface to `app/types/project.ts` with all fields (uuid, displayName, mediaFileName, mediaPath, mediaType, folder, linkedCueUuid, pdfPage)
- [x] 1.2 Add `visualMedia: VisualMediaItem[]` and `visualFolders: string[]` to the `Project` interface
- [x] 1.3 Add supported file extensions constant and mediaType derivation helper

## 2. Schema Migration

- [x] 2.1 Increment `CURRENT_SCHEMA_VERSION` in project composable
- [x] 2.2 Add migration function that adds `visualMedia: []` and `visualFolders: []` to projects missing them
- [x] 2.3 Register the migration in the migration chain

## 3. File I/O (Electron Main Process)

- [x] 3.1 Add IPC handler `import-visual-media` that copies a file to `media/visuals/<uuid>_<filename>` and returns the relative path
- [x] 3.2 Add IPC handler `read-visual-media` that reads a visual file from the project and returns its data
- [x] 3.3 Ensure `media/visuals/` directory is created on first import
- [x] 3.4 Add file extension validation (reject unsupported types)

## 4. Project Composable Helpers

- [x] 4.1 Add `addVisualMedia(item: VisualMediaItem)` to project state
- [x] 4.2 Add `removeVisualMedia(uuid: string)` — deletes from array and optionally from disk
- [x] 4.3 Add `updateVisualMedia(uuid: string, updates: Partial<VisualMediaItem>)` for folder assignment and linking
- [x] 4.4 Add `addVisualFolder(name: string)` / `removeVisualFolder(name: string)` with item cleanup
- [x] 4.5 Add stale link validation on project load (clear linkedCueUuid if referenced audio item doesn't exist)

## 5. Export/Import

- [x] 5.1 Update .lpa export to include `media/visuals/` directory contents
- [x] 5.2 Update .lpa import to extract `media/visuals/` files to the project folder

## 6. Preload API

- [x] 6.1 Expose `importVisualMedia` and `readVisualMedia` IPC calls in preload.js
- [x] 6.2 Add TypeScript declarations in `app/types/global.d.ts`

## 7. Tests

- [x] 7.1 Unit test for VisualMediaItem creation helper and extension validation
- [x] 7.2 Unit test for schema migration (project without visual fields → with)
- [x] 7.3 Unit test for stale link cleanup logic
