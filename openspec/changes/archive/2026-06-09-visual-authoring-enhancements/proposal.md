## Why

Issue #48 collects two authoring-quality features for the visual subsystem that are independent of the publish-reliability and aspect-ratio fixes:

- **#3 — Multi-select + drag.** The media library only supports single-item selection and single-item drag. Building a composition from many images, or re-filing a batch of imports into a folder, means repeating the same drag dozens of times. The GM needs to select multiple media items and drag them as a group — onto the composition workspace (add all as layers) or onto a folder (move all into it).
- **#4 — Background image role.** There is no way to designate a layer as a full-screen background. A backdrop today is just another layer that the "Black" button unpublishes along with everything else, so blacking out the foreground also kills the backdrop. The GM needs a layer role that goes full-screen, always sits behind every other layer, and **survives the Black button** (stays published when everything else is blacked out).

These are additive; neither changes the publish pipeline or the coordinate model.

## What Changes

**Multi-select + drag (#3):**
- Media library items support multi-selection via `Ctrl/Cmd+click` (toggle) and `Shift+click` (range). Clicking a single item without a modifier selects just that item (current behavior).
- Dragging a selected item drags the **entire current selection**; dragging an unselected item drags just that item (and selects it). The drag payload carries the set of media UUIDs.
- Dropping the selection on the **composition workspace** adds every dragged image as a new layer, cascaded so they don't perfectly overlap (PDFs in the set are skipped, per existing layer rules).
- Dropping the selection on a **folder** (in the folder sidebar) moves every dragged item into that folder by setting each item's `folder` field.

**Background image role (#4):**
- A layer can be marked as **background**. A background layer SHALL be forced to full-screen (`x=0, y=0, width=100, height=100`), forced behind all non-background layers, and SHALL remain published when the "Black" button is pressed (Black unpublishes only non-background layers).
- Toggling background **on** snaps the layer to full-screen and behind; toggling **off** returns it to a normal movable/resizable layer.
- At most one background layer is active at a time; marking a new layer as background clears the previous one's background role.

## Capabilities

### Modified Capabilities
- `media-library-panel`: Adds multi-selection, group drag of the selection, drop-to-folder move, and group-add on drop into the composition.
- `layer-display`: Adds a background layer role (full-screen, always-behind, survives Black) and modifies the Black-all behavior to preserve background layers.

## Impact

- **Types**: `app/types/ipc.ts` — add `isBackground?: boolean` to `DisplayLayer` and `PublishedLayer`.
- **Media library**: `app/components/MediaLibraryPanel.vue` — selection state becomes a `Set<uuid>`; `Ctrl/Cmd`/`Shift` click logic; folder sidebar items become drop targets. `app/components/MediaLibraryItem.vue` — `dragstart` emits the full selection (new `application/x-visual-media-uuids` JSON payload) when the dragged item is selected. `app/composables/useVisualMedia.ts` — `moveItemsToFolder(uuids, folder)` helper (reuses existing `updateVisualMediaItem` folder-assignment path).
- **Composition drop**: `app/components/LiveDisplayPanel.vue` `onDrop` — read the multi-UUID payload (fall back to the single-UUID payload), add each image layer with a cascade offset.
- **Background role**: `app/composables/useVisualDisplay.ts` — `setBackground(id, value)` (snaps geometry + z, clears any prior background); modify `blackAll` to unpublish only `!isBackground` layers. `app/components/LiveDisplayPanel.vue` — action-bar toggle "Set as background"; render background layers behind. `electron/player.html` — background already arrives as an ordinary published layer with lowest z and full size; no special handling required beyond honoring zIndex (already does).
- **Specs**: `media-library-panel`, `layer-display`.
- **Risk:** low/medium. Multi-select touches click semantics — keep single-click behavior identical. Background-survives-black changes a destructive control's scope; verify Black still clears all foreground.
