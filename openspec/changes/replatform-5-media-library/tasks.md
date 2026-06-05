# Tasks — replatform-5-media-library

## Group 1: Port Components

- [ ] 1.1 Copy `MediaLibraryPanel.vue` + `MediaLibraryItem.vue` into `client/app/components/`
- [ ] 1.2 Wire panel into the workspace layout

## Group 2: Rewire to Server File APIs

- [ ] 2.1 Replace IPC browse with `GET /api/fs/list`
- [ ] 2.2 Replace folder creation with `POST /api/fs/mkdir`
- [ ] 2.3 Replace import/copy with `POST /api/upload` + `POST /api/copy_to_media`
- [ ] 2.4 Use `GET /api/metadata` for media metadata (TagLib)
- [ ] 2.5 Add async loading/progress states (reuse `AudioLoadProgress`)

## Group 3: File Picker Reuse

- [ ] 3.1 Compose `ServerFileBrowser` / `ServerFilePickerModal` instead of the old picker
- [ ] 3.2 Reconcile UX so there is one file-browsing experience

## Group 4: Path Portability

- [ ] 4.1 Ensure imported media is referenced by relative `mediaPath`
- [ ] 4.2 Verify portability: project + media open correctly on a second host

## Group 5: Verification

- [ ] 5.1 Browse, create folder, import, organize — all via server
- [ ] 5.2 `nuxi typecheck` + `vitest run` green
- [ ] 5.3 Confirm no server changes were needed
