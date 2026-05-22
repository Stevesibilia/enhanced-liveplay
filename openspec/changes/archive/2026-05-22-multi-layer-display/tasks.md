## 1. Data Model & Composable

- [x] 1.1 Define `DisplayLayer` interface in `app/types/ipc.ts` (id, mediaItem, x, y, width, height, zIndex, published, pdfPage)
- [x] 1.2 Define `PlayerDisplayState` interface (layers array of published layers with absolute mediaPath)
- [x] 1.3 Rewrite `useVisualDisplay` composable — replace single stagedItem/liveItem with `layers: DisplayLayer[]` array
- [x] 1.4 Add composable methods: `addLayer`, `removeLayer`, `updateLayer`, `publishLayer`, `unpublishLayer`, `publishAll`, `blackAll`
- [x] 1.5 Add `getPublishedState()` helper that builds `PlayerDisplayState` from current layers

## 2. Composition Workspace (LiveDisplayPanel)

- [x] 2.1 Replace current LiveDisplayPanel with composition workspace — render all layers as positioned elements
- [x] 2.2 Implement layer rendering: images as `<img>`, PDFs as `<canvas>`, positioned absolutely with percentage-based coordinates
- [x] 2.3 Add visual distinction: draft layers = dashed border + 60% opacity, published = solid green border
- [x] 2.4 Implement layer selection (click to select, show handles, click background to deselect)
- [x] 2.5 Implement drag-to-move on layers (update x/y on drag end)
- [x] 2.6 Implement resize handles (corner = proportional, edge = single dimension)
- [x] 2.7 Add layer action bar (visible when layer selected): Publish/Unpublish toggle, Remove, Bring to Front, Send to Back
- [x] 2.8 Add "Publish All" and "Black" buttons in workspace header
- [x] 2.9 Add drop zone for drag-from-library (create layer at drop position)
- [x] 2.10 Show placeholder when no layers exist ("Drag or push items here")

## 3. Media Library Integration

- [x] 3.1 Update MediaLibraryPanel `pushItem` — call `addLayer` instead of `pushLive` + direct IPC
- [x] 3.2 Add drag support on MediaLibraryItem (HTML5 drag with item data in dataTransfer)
- [x] 3.3 Remove `isLive` prop from MediaLibraryItem (no longer single-item live state)

## 4. IPC & Player Window

- [x] 4.1 Update `push-to-player` IPC handler to accept `PlayerDisplayState` (array of layers)
- [x] 4.2 Add `syncToPlayer()` function in composable — sends full published state via IPC on any publish/unpublish/update of published layer
- [x] 4.3 Rewrite `player.html` rendering: clear and re-render all layers on each `display-state` message
- [x] 4.4 Player renders each layer as absolutely-positioned element (img or canvas) with percentage coords
- [x] 4.5 Player shows black when layers array is empty
- [x] 4.6 Update `local-media://` protocol usage for layer image sources

## 5. Layer State Sync

- [x] 5.1 Call `syncToPlayer()` when a layer is published or unpublished
- [x] 5.2 Call `syncToPlayer()` when a published layer is moved or resized
- [x] 5.3 Call `syncToPlayer()` on "Black All" (sends empty layers)
- [x] 5.4 Handle player window not open — queue state, sync when window opens

## 6. Cleanup

- [x] 6.1 Remove old `stagedItem`/`liveItem`/`selectItem`/`stageItem` from useVisualDisplay
- [x] 6.2 Update any remaining references to old visual display API
- [x] 6.3 Style workspace consistent with app theme (dark mode, accent colors)
