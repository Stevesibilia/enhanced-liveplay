## Context

Two independent features bundled per issue #48's "Cluster C". They touch different surfaces and share no state, so they can be implemented and verified separately within this one change.

Current relevant behavior:
- `MediaLibraryItem.vue` is `draggable` and on `dragstart` sets a single `application/x-visual-media-uuid`. Selection is a single `selected` boolean driven by a `select` emit.
- `LiveDisplayPanel.onDrop` reads that single UUID and calls `addLayer` once.
- Folders are string labels; an item's folder is `item.folder` (a string or undefined), mutated via `updateVisualMediaItem`. The folder sidebar lists folders but they are not drop targets.
- `useVisualDisplay.blackAll()` sets `published = false` on **all** layers. `addLayer` defaults a new layer to centered, `50%` size, `published=false`.

## Feature #3 — Multi-select + drag

### Selection model
Replace the single-selected concept in `MediaLibraryPanel.vue` with `selectedUuids: Set<string>` plus an `anchorUuid` for range selection.

```
click (no modifier)      → selectedUuids = { uuid };          anchor = uuid
Ctrl/Cmd + click         → toggle uuid in selectedUuids;      anchor = uuid
Shift + click            → select range [anchor … uuid] over the *current filtered order*
```

`MediaLibraryItem` receives `:selected="selectedUuids.has(item.uuid)"`. Single-click with no modifier is unchanged from today's behavior (one item selected).

### Group drag payload
On `dragstart` in `MediaLibraryItem`:
- If the dragged item is in `selectedUuids` → payload = all selected UUIDs.
- If not → select just it, payload = `[uuid]`.

Payload is a new MIME type carrying JSON:

```
e.dataTransfer.setData('application/x-visual-media-uuids', JSON.stringify(uuids));
// keep setting the legacy single key too, for any handler not yet updated
e.dataTransfer.setData('application/x-visual-media-uuid', primaryUuid);
```

Handlers read the array key first, fall back to the single key. This keeps existing drop targets working during/after the change (cart slots, etc. — see `drag-drop-interop`).

### Drop on composition (LiveDisplayPanel.onDrop)
Parse the array, resolve each UUID to a `VisualMediaItem`, and `addLayer` each image with a **cascade offset** so they don't stack exactly:

```
parsed.forEach((item, i) => {
  const off = i * 3;               // percent
  addLayer(item, { x: baseX + off, y: baseY + off });  // PDFs skipped by addLayer
});
```

Drop position seeds `baseX/baseY` from the cursor as today; clamp so cascaded layers stay on-canvas.

### Drop on folder (folder sidebar)
Make each `.folder-item` (including "Unfiled") a drop target:

```
@dragover.prevent  @drop.prevent="onFolderDrop(folder)"
onFolderDrop(folder) → moveItemsToFolder(parsedUuids, folder)   // '__unfiled__' → undefined
```

`useVisualMedia.moveItemsToFolder(uuids, folder)` loops `updateVisualMediaItem(uuid, { folder })`, reusing the existing persistence path.

## Feature #4 — Background layer role

### Data
Add `isBackground?: boolean` to `DisplayLayer` and `PublishedLayer` (`app/types/ipc.ts`). Absent/false = normal layer.

### Behavior (useVisualDisplay)

```
setBackground(id, value):
  if value:
    // clear any existing background first (single background invariant)
    for L in layers where L.isBackground && L.id != id: updateLayer(L.id, { isBackground:false })
    updateLayer(id, { isBackground:true, x:0, y:0, width:100, height:100, zIndex: <below all> })
  else:
    updateLayer(id, { isBackground:false })   // geometry stays; user can move/resize again

blackAll():
  cancel pending timers
  layers = layers.map(L => L.isBackground ? L : { ...L, published:false })
```

"Below all": reuse the `sendToBack` idea — set zIndex to `min(zIndex) - 1`. Foreground layers keep their own z; a background layer is just the lowest. The player already sorts by zIndex, so no player change is needed — a full-screen, lowest-z, still-published layer renders behind everything and survives black-out automatically because it stays in `getPublishedState`.

### UI (LiveDisplayPanel)
- Action bar: add a toggle button "Set as background" / "Unset background" bound to `selectedLayer.isBackground`.
- A background layer's box is locked to full-screen; suppress its resize handles and disable move-drag while `isBackground` (it can't be repositioned). Visually distinguish (e.g. a "BG" badge) so the GM knows which layer is the backdrop.

### Single-background invariant
Marking a layer as background clears the previous one. This avoids ambiguous stacking and matches the mental model of "the backdrop".

## Alternatives considered

- **#3: a dedicated drag-handle instead of dragging the item itself.** Rejected — items are already `draggable`; group-drag-on-selection is the least surprising and matches file managers.
- **#4: a separate `backgroundMediaPath` on the project rather than a layer role.** Rejected — reusing the layer model means background gets fades, linking, and the same publish pipeline for free; only `blackAll` and geometry-lock differ.
- **#4: allow multiple backgrounds.** Rejected — full-screen opaque backgrounds would occlude each other by z; one active background is unambiguous. (Multiple can be revisited if stacked semi-transparent backdrops are ever needed.)

## Verification

Manual (Electron). #3: Ctrl/Shift multi-select, drag group to composition (all added, cascaded), drag group to a folder (all moved), single-click still selects one. #4: mark a layer background → snaps full-screen behind; press Black → foreground clears, background stays; unset → layer movable again; mark a second layer background → first reverts.
