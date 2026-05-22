## 1. Workspace Tab System

- [ ] 1.1 Add tab bar component to MainWorkspace.vue with Audio/Media tabs
- [ ] 1.2 Implement tab switching logic (v-if or keep-alive) preserving audio playback
- [ ] 1.3 Style tab bar consistent with existing UI theme

## 2. Media Library Panel Component

- [ ] 2.1 Create `MediaLibraryPanel.vue` — main container with folder sidebar + grid area
- [ ] 2.2 Implement folder sidebar (list of folders + "All" + "Unfiled" entries)
- [ ] 2.3 Implement thumbnail grid with CSS Grid layout (responsive columns)
- [ ] 2.4 Create `MediaLibraryItem.vue` — thumbnail cell with image preview or PDF icon + filename

## 3. Import Functionality

- [ ] 3.1 Add drag-and-drop zone (dragover/drop event handlers) on the media library panel
- [ ] 3.2 Add import button triggering native file picker dialog (multi-select, filtered to supported types)
- [ ] 3.3 Wire imports to IPC `import-visual-media` handler and refresh grid on completion
- [ ] 3.4 Show visual feedback during drag (highlight drop zone) and import progress for multi-file

## 4. Folder Management

- [ ] 4.1 Add "New Folder" button/dialog in folder sidebar
- [ ] 4.2 Add rename folder via double-click or context menu
- [ ] 4.3 Add delete folder with confirmation dialog (items become unfiled)

## 5. Item Operations

- [ ] 5.1 Add context menu on grid items (rename, move to folder, delete)
- [ ] 5.2 Implement rename inline edit or dialog
- [ ] 5.3 Implement move-to-folder submenu
- [ ] 5.4 Implement delete with confirmation dialog

## 6. Selection & State

- [ ] 6.1 Create `useVisualDisplay.ts` composable — manages selectedItem, stagedItem, liveItem state
- [ ] 6.2 Wire grid item click to select and emit to preview panel
- [ ] 6.3 Add visual highlight on selected item
