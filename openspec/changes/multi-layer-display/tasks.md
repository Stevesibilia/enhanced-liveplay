## 1. Data Model & Composable

- [ ] 1.1 Define `DisplayLayer` interface in `app/types/ipc.ts` (id, mediaItem, x, y, width, height, zIndex, published, pdfPage)
- [ ] 1.2 Define `PlayerDisplayState` interface (layers array of published layers with absolute mediaPath)
- [ ] 1.3 Rewrite `useVisualDisplay` composable — replace single stagedItem/liveItem with `layers: DisplayLayer[]` array
- [ ] 1.4 Add composable methods: `addLayer`, `removeLayer`, `updateLayer`, `publishLayer`, `unpublishLayer`, `publishAll`, `blackAll`
- [ ] 1.5 Add `getPublishedState()` helper that builds `PlayerDisplayState` from current layers

## 2. Composition Workspace (LiveDisplayPanel)

- [ ] 2.1 Replace current LiveDisplayPanel with composition workspace — render all layers as positioned elements
- [ ] 2.2 Implement layer rendering: images as `<img>`, PDFs as `<canvas>`, positioned absolutely with percentage-based coordinates
- [ ] 2.3 Add visual distinction: draft layers = dashed border + 60% opacity, published = solid green border
- [ ] 2.4 Implement layer selection (click to select, show handles, click background to deselect)
- [ ] 2.5 Implement drag-to-move on layers (update x/y on drag end)
- [ ] 2.6 Implement resize handles (corner = proportional, edge = single dimension)
- [ ] 2.7 Add layer action bar (visible when layer selected): Publish/Unpublish toggle, Remove, Bring to Front, Send to Back
- [ ] 2.8 Add "Publish All" and "Black" buttons in workspace header
- [ ] 2.9 Add drop zone for drag-from-library (create layer at drop position)
- [ ] 2.10 Show placeholder when no layers exist ("Drag or push items here")

## 3. Media Library Integration

- [ ] 3.1 Update MediaLibraryPanel `pushItem` — call `addLayer` instead of `pushLive` + direct IPC
- [ ] 3.2 Add drag support on MediaLibraryItem (HTML5 drag with item data in dataTransfer)
- [ ] 3.3 Remove `isLive` prop from MediaLibraryItem (no longer single-item live state)

## 4. IPC & Player Window

- [ ] 4.1 Update `push-to-player` IPC handler to accept `PlayerDisplayState` (array of layers)
- [ ] 4.2 Add `syncToPlayer()` function in composable — sends full published state via IPC on any publish/unpublish/update of published layer
- [ ] 4.3 Rewrite `player.html` rendering: clear and re-render all layers on each `display-state` message
- [ ] 4.4 Player renders each layer as absolutely-positioned element (img or canvas) with percentage coords
- [ ] 4.5 Player shows black when layers array is empty
- [ ] 4.6 Update `local-media://` protocol usage for layer image sources

## 5. Layer State Sync

- [ ] 5.1 Call `syncToPlayer()` when a layer is published or unpublished
- [ ] 5.2 Call `syncToPlayer()` when a published layer is moved or resized
- [ ] 5.3 Call `syncToPlayer()` on "Black All" (sends empty layers)
- [ ] 5.4 Handle player window not open — queue state, sync when window opens

## 6. Cleanup

- [ ] 6.1 Remove old `stagedItem`/`liveItem`/`selectItem`/`stageItem` from useVisualDisplay
- [ ] 6.2 Update any remaining references to old visual display API
- [ ] 6.3 Style workspace consistent with app theme (dark mode, accent colors)
