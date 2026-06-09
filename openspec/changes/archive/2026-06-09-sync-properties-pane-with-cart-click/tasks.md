## 1. Implementation

- [x] 1.1 In `components/CartSlot.vue`, ensure `selectedItem` and `selectedItems` are available from `useProject()` at the top of `<script setup>` (they are currently destructured inside `handleEdit`; lift them to module scope so `handlePlay` can read/write them without re-destructuring).
- [x] 1.2 Modify `handlePlay` in `components/CartSlot.vue`: after the existing playback call, if `selectedItem.value !== null`, clear `selectedItems`, add `props.item.uuid` to it, and set `selectedItem.value = props.item`. Take no selection action when `selectedItem.value` is null.
- [x] 1.3 Confirm `handleEdit` continues to work unchanged (gear button still opens the pane on a cart from a closed state).
- [x] 1.4 In `app/composables/useCartHotkeys.ts` `triggerSlot`, after the `playCue(item)` branch, apply the same gated sync (if `selectedItem.value !== null`, clear `selectedItems`, add the cart uuid, set `selectedItem = item`). Leave the stop branch untouched.
- [x] 1.5 In `app/composables/useMidiController.ts` `dispatchDiscrete`, after the `playCue(item)` call for `trigger-slot-*` actions, apply the same gated sync. Leave the stop/resume branches untouched.

## 2. Manual Verification

- [x] 2.1 With pane closed, click a populated cart slot → cue plays, pane stays closed.
- [x] 2.2 Open pane via a playlist item, then click a populated cart → pane switches to the cart's item; cart plays.
- [x] 2.3 With pane open on a cart, fire a different cart via keyboard hotkey or MIDI → pane switches to that cart's item (gated sync applies to click, hotkey, and MIDI when the pane is already open).
- [x] 2.4 Multi-select two playlist items (ctrl-click) with pane open, then click a cart → `selectedItems` collapses to just the cart's uuid; pane shows the cart.
- [x] 2.5 Click an empty cart slot → import dialog opens; no selection change.
- [x] 2.6 With pane open on a cart, click the pane's close button → pane closes; clicking another cart afterwards plays only, no pane reopens.
