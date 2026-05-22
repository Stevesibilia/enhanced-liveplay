## 1. Cue Picker Component

- [ ] 1.1 Create `CuePicker.vue` — modal listing all audio items (flattened from groups)
- [ ] 1.2 Add search/filter input for filtering by displayName
- [ ] 1.3 Highlight currently linked cue (if any)
- [ ] 1.4 Emit selected UUID on click, close modal

## 2. Link Assignment UI

- [ ] 2.1 Add "Linked Audio" section to PreviewPanel.vue (below staged preview)
- [ ] 2.2 Show linked cue displayName or "None"
- [ ] 2.3 Add "Link" / "Change" button that opens CuePicker
- [ ] 2.4 Add "Clear" button to remove linked cue
- [ ] 2.5 Wire to `updateVisualMedia(uuid, { linkedCueUuid })` on selection/clear

## 3. Auto-trigger Logic

- [ ] 3.1 Extend push logic in `useVisualDisplay.ts` — after setting live state, check linkedCueUuid
- [ ] 3.2 If linkedCueUuid exists and references valid audio item, call playCue(uuid)
- [ ] 3.3 If linkedCueUuid references non-existent item, skip silently (visual still pushes)

## 4. Grid Badge

- [ ] 4.1 Add music-note badge overlay to `MediaLibraryItem.vue` when item has linkedCueUuid
- [ ] 4.2 Style badge (small icon, corner position, semi-transparent background)
