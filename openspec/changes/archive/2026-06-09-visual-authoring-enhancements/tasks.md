## 1. Multi-selection model (MediaLibraryPanel.vue)

- [x] 1.1 Replace single-selection state with `selectedUuids = ref<Set<string>>()` and an `anchorUuid` ref.
- [x] 1.2 Implement click logic on item select: plain click → select only that item + set anchor; `Ctrl/Cmd+click` → toggle membership + set anchor; `Shift+click` → select the range between anchor and clicked item over the current filtered/sorted order.
- [x] 1.3 Pass `:selected="selectedUuids.has(item.uuid)"` to each `MediaLibraryItem`; clear selection on background/empty-area click and on folder switch as appropriate.
- [x] 1.4 Confirm plain single-click behavior is unchanged for downstream consumers (properties pane, etc.).

## 2. Group drag payload (MediaLibraryItem.vue)

- [x] 2.1 Accept the current selection set (or a derived `isSelected`) so the item knows whether to drag the group.
- [x] 2.2 In `onDragStart`: if dragged item is selected → payload = all selected UUIDs; else → select just it and payload = `[uuid]`.
- [x] 2.3 Set `application/x-visual-media-uuids` = `JSON.stringify(uuids)`; also keep setting the legacy `application/x-visual-media-uuid` = primary UUID for back-compat.

## 3. Drop on composition (LiveDisplayPanel.vue)

- [x] 3.1 In `onDrop`, read `application/x-visual-media-uuids` (JSON array); fall back to the single-UUID key.
- [x] 3.2 Resolve each UUID to a `VisualMediaItem`; for each, `addLayer` with a cascade offset (e.g. `i * 3%` on x/y) seeded from the drop position; clamp to canvas. Non-image items are skipped by `addLayer`.
- [x] 3.3 Select the last-added layer (or leave selection cleared) consistently.

## 4. Drop on folder (MediaLibraryPanel.vue + useVisualMedia.ts)

- [x] 4.1 Add `moveItemsToFolder(uuids, folder)` to `useVisualMedia.ts` looping `updateVisualMediaItem(uuid, { folder })`; map the `__unfiled__` sentinel to `folder: undefined`.
- [x] 4.2 Make each folder sidebar item (including "All"/"Unfiled" as applicable) a drop target with `@dragover.prevent` + `@drop.prevent`.
- [x] 4.3 On folder drop, parse the multi-UUID payload and call `moveItemsToFolder`; show drop affordance (highlight) on dragover.

## 5. Background layer role — data + logic

- [x] 5.1 Add `isBackground?: boolean` to `DisplayLayer` and `PublishedLayer` in `app/types/ipc.ts`.
- [x] 5.2 In `useVisualDisplay.ts`, add `setBackground(id, value)`: when enabling, clear any other layer's `isBackground`, then set `isBackground:true`, snap geometry to full-screen (`x:0,y:0,width:100,height:100`), and force lowest z (`min(zIndex)-1`); when disabling, just set `isBackground:false`.
- [x] 5.3 Modify `blackAll()` to unpublish only `!isBackground` layers (background layers stay published).
- [x] 5.4 Ensure `getPublishedState` includes background layers (it should already, since they remain `published`).

## 6. Background layer role — UI (LiveDisplayPanel.vue)

- [x] 6.1 Add an action-bar toggle "Set as background" / "Unset background" bound to `selectedLayer.isBackground`, calling `setBackground`.
- [x] 6.2 While a layer `isBackground`: lock it full-screen — suppress resize handles and disable move-drag; add a visual "BG" badge.
- [x] 6.3 Re-sync to player on background toggle and on black-all (existing `syncIfReady`).

## 7. Verification (manual — Electron)

- [x] 7.1 Plain single-click still selects exactly one item.
- [x] 7.2 `Ctrl/Cmd+click` toggles individual items; `Shift+click` selects a contiguous range.
- [x] 7.3 Drag a multi-selection onto the composition → all images added, cascaded, none exactly overlapping; PDFs in the selection are skipped.
- [x] 7.4 Drag a multi-selection onto a folder → all items move into that folder; drop onto "Unfiled" clears their folder.
- [x] 7.5 Mark a layer as background → it snaps full-screen behind all other layers and can't be moved/resized.
- [x] 7.6 Press Black with a background set → all foreground layers clear, the background stays published/visible in the player.
- [x] 7.7 Mark a second layer as background → the first reverts to a normal layer (single-background invariant).
- [x] 7.8 Unset background → the layer becomes movable/resizable again.
