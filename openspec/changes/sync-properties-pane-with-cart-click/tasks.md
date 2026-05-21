## 1. Implementation

- [x] 1.1 In `components/CartSlot.vue`, ensure `selectedItem` and `selectedItems` are available from `useProject()` at the top of `<script setup>` (they are currently destructured inside `handleEdit`; lift them to module scope so `handlePlay` can read/write them without re-destructuring).
- [x] 1.2 Modify `handlePlay` in `components/CartSlot.vue`: after the existing playback call, if `selectedItem.value !== null`, clear `selectedItems`, add `props.item.uuid` to it, and set `selectedItem.value = props.item`. Take no selection action when `selectedItem.value` is null.
- [x] 1.3 Confirm `handleEdit` continues to work unchanged (gear button still opens the pane on a cart from a closed state).

## 2. Manual Verification

- [ ] 2.1 With pane closed, click a populated cart slot → cue plays, pane stays closed.
- [ ] 2.2 Open pane via a playlist item, then click a populated cart → pane switches to the cart's item; cart plays.
- [ ] 2.3 With pane open on a cart, fire a different cart via keyboard hotkey or MIDI → pane does NOT change (sync is click-only).
- [ ] 2.4 Multi-select two playlist items (ctrl-click) with pane open, then click a cart → `selectedItems` collapses to just the cart's uuid; pane shows the cart.
- [ ] 2.5 Click an empty cart slot → import dialog opens; no selection change.
- [ ] 2.6 With pane open on a cart, click the pane's close button → pane closes; clicking another cart afterwards plays only, no pane reopens.
