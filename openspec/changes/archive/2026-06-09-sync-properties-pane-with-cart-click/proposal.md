## Why

When the properties pane is open, clicking a cart slot plays the cue but does not update the pane — it keeps showing whichever item was previously selected (typically from the playlist). The only way to make the pane follow a cart is to click the small gear button on the slot's action bar. This is inconsistent with how playlist items behave (a click selects, updating the pane) and creates friction when auditioning or editing cart items. Closes issue #34.

## What Changes

- A bare click on a populated cart slot, when the properties pane is already open, also updates `selectedItem` to that cart's audio item (in addition to playing it).
- When the properties pane is closed, cart click behavior is unchanged (play only, no selection side-effect).
- Selection update mirrors `handleEdit` semantics: clears any existing multi-selection (`selectedItems` Set) and adds the cart item's uuid.
- Empty-slot click (import) and gear-button behavior (`handleEdit`) are unchanged.

## Capabilities

### New Capabilities
- `cart-properties-sync`: Defines the interaction between cart slot clicks and the properties pane — specifically when click-to-play should additionally update the selected item.

### Modified Capabilities
<!-- None. No existing capability spec covers cart click semantics. -->

## Impact

- **Code**: `components/CartSlot.vue` — `handlePlay` gains a conditional selection update (only when `selectedItem.value !== null`).
- **State**: Reads `selectedItem` / `selectedItems` from `useProject()`; mutates them only on the conditional branch.
- **Out of scope**: `PlaylistItem.vue` (already correct), `ActiveCueItem.vue` (no select gesture), MIDI/keyboard cart triggers (those fire `playCue` directly, not via `handlePlay`).
- **No breaking changes.** No API, persistence, or migration impact.
