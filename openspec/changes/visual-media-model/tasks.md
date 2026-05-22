## 1. Type Definitions

- [ ] 1.1 Add `VisualMediaItem` interface to `app/types/project.ts` with all fields (uuid, displayName, mediaFileName, mediaPath, mediaType, folder, linkedCueUuid, pdfPage)
- [ ] 1.2 Add `visualMedia: VisualMediaItem[]` and `visualFolders: string[]` to the `Project` interface
- [ ] 1.3 Add supported file extensions constant and mediaType derivation helper

## 2. Schema Migration

- [ ] 2.1 Increment `CURRENT_SCHEMA_VERSION` in project composable
- [ ] 2.2 Add migration function that adds `visualMedia: []` and `visualFolders: []` to projects missing them
- [ ] 2.3 Register the migration in the migration chain

## 3. File I/O (Electron Main Process)

- [ ] 3.1 Add IPC handler `import-visual-media` that copies a file to `media/visuals/<uuid>_<filename>` and returns the relative path
- [ ] 3.2 Add IPC handler `read-visual-media` that reads a visual file from the project and returns its data
- [ ] 3.3 Ensure `media/visuals/` directory is created on first import
- [ ] 3.4 Add file extension validation (reject unsupported types)

## 4. Project Composable Helpers

- [ ] 4.1 Add `addVisualMedia(item: VisualMediaItem)` to project state
- [ ] 4.2 Add `removeVisualMedia(uuid: string)` — deletes from array and optionally from disk
- [ ] 4.3 Add `updateVisualMedia(uuid: string, updates: Partial<VisualMediaItem>)` for folder assignment and linking
- [ ] 4.4 Add `addVisualFolder(name: string)` / `removeVisualFolder(name: string)` with item cleanup
- [ ] 4.5 Add stale link validation on project load (clear linkedCueUuid if referenced audio item doesn't exist)

## 5. Export/Import

- [ ] 5.1 Update .lpa export to include `media/visuals/` directory contents
- [ ] 5.2 Update .lpa import to extract `media/visuals/` files to the project folder

## 6. Preload API

- [ ] 6.1 Expose `importVisualMedia` and `readVisualMedia` IPC calls in preload.js
- [ ] 6.2 Add TypeScript declarations in `app/types/global.d.ts`

## 7. Tests

- [ ] 7.1 Unit test for VisualMediaItem creation helper and extension validation
- [ ] 7.2 Unit test for schema migration (project without visual fields → with)
- [ ] 7.3 Unit test for stale link cleanup logic
