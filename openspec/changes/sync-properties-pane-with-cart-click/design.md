## Context

The properties pane (`components/PropertiesPanel.vue`) is rendered in `MainWorkspace.vue` gated on `v-if="selectedItem"`. The `selectedItem` ref lives in `composables/useProject.ts` as a `useState<BaseItem | null>` and is the single source of truth for which item the pane shows.

Two surfaces select items today:
- **Playlist** (`components/PlaylistItem.vue`): bare click → `toggleItemSelection(uuid, ctrl, shift)` which updates both `selectedItems` and `selectedItem`.
- **Cart** (`components/CartSlot.vue`): bare click on `slot-header` → `handlePlay` (plays only, no selection). The gear button → `handleEdit` (clears `selectedItems`, adds this uuid, sets `selectedItem = props.item`).

The asymmetry is intentional for live use — a cart's primary gesture is "fire the cue", not "select it". The fix must preserve that during shows while syncing the pane during edit/audition workflows.

## Goals / Non-Goals

**Goals:**
- Clicking a populated cart while the properties pane is open updates the pane to show that cart item.
- Zero behavior change when the properties pane is closed (live-show ergonomics preserved).
- No new gestures, modifier keys, or UI affordances; the gear button remains the pane-opening entry point.

**Non-Goals:**
- Changing playlist click behavior (already correct).
- Syncing the pane from MIDI- or keyboard-triggered cart fires (those bypass `handlePlay`).
- Adding pane sync to `ActiveCueItem` (no select gesture there).
- Auto-opening the properties pane on cart click when it is closed.

## Decisions

**Decision: Gate the selection update on `selectedItem.value !== null`.**
The "pane is open" condition is read directly from the shared `selectedItem` ref rather than introducing a separate "pane open" flag. `MainWorkspace.vue` already mounts the pane via `v-if="selectedItem"`, so non-null ↔ pane mounted. No new state.

Alternatives considered:
- *Always update on click* — simpler but mutates selection during live shows, even when the pane is closed. Rejected.
- *Modifier-click (alt/ctrl) to select* — explicit but undiscoverable; the gear button already covers this. Rejected.
- *Click waveform area to select, header to play* — splits the gesture spatially but is subtle and changes the slot's visual contract. Rejected.

**Decision: Mirror `handleEdit`'s multi-selection semantics.**
The selection branch clears `selectedItems`, adds the cart uuid, and sets `selectedItem = props.item`. This matches what the gear button already does and keeps behavior consistent regardless of which entry point a user uses to land a cart in the pane.

**Decision: Keep the change in `handlePlay`, not at the call site.**
`handlePlay` is the single click handler on `slot-header` and the play action button. Adding the gate inside `handlePlay` means both the slot-header click and the explicit play button get the sync behavior, which is the right unification — both are "user pressed play on this cart" gestures.

## Risks / Trade-offs

- **Risk**: User opens the pane to inspect a playlist item, then fires a cart during audition, and is surprised the pane jumped. → **Mitigation**: This is the desired behavior per the issue. The escape hatch is the pane's existing close button.
- **Risk**: External code paths that call `handlePlay` programmatically (if any) would also trigger selection sync. → **Mitigation**: Quick grep shows `handlePlay` is only wired to template `@click` handlers in `CartSlot.vue`. MIDI and keyboard hotkeys call `playCue` directly via composables, bypassing this function. Verified no programmatic callers exist.
- **Trade-off**: We read `selectedItem` inside `handlePlay` rather than passing it as a prop. Acceptable — `useProject()` is already destructured at the top of the component's script.
