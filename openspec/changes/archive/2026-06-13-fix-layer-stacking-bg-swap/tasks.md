## 1. Fix selection stacking (bugs 1 & 2)

- [x] 1.1 Remove `z-index: 9999 !important` from `.layer.selected` in `app/components/LiveDisplayPanel.vue`
- [x] 1.2 Confirm selected layer keeps its outline/handles and renders at its real `zIndex` (no other rule re-introduces a stacking boost)

## 2. Fix background replace semantics (bug 3)

- [x] 2.1 In `setBackground` (`app/composables/useVisualDisplay.ts`), when retiring the previous background set both `isBackground: false` and `published: false` so the outgoing backdrop reverts to a normal draft layer
- [x] 2.2 Verify the newly-marked background ends at the lowest z (`minZ − 1`) and is not covered by the retired one
- [x] 2.3 Add workspace-only `prevBox` to `DisplayLayer` (`app/types/ipc.ts`); capture the box when a layer becomes background and restore it on retire/un-mark so the retired full-screen layer shrinks back instead of blanketing the canvas (also fixes the latent un-mark-stays-fullscreen quirk)

## 2b. Push reorder to player

- [x] 2b.1 Front/Back action handlers call `syncIfReady()` for published layers so the player restacks (was missing — workspace updated but player did not)

## 2c. Negative z-index visibility

- [x] 2c.1 Add `isolation: isolate` to the 16:9 canvas in both `app/components/LiveDisplayPanel.vue` (`.canvas`) and `electron/player.html` (`#canvas`) so negative-z layers paint above the canvas black fill instead of being hidden behind it (broke background-replace: 2nd background got z `−1` and vanished; also fixes repeated send-to-back)

## 3. Verify

- [x] 3.1 Selected layer: Front moves it above neighbors, Back moves it below, both visible immediately while still selected
- [x] 3.2 Marking a layer Background snaps it full-screen and behind other layers in the workspace
- [x] 3.3 Marking a second layer Background: first reverts to a normal unpublished layer, new backdrop is visible behind others
- [x] 3.4 Player window still renders correct order and Black still preserves only the live background
- [x] 3.5 Run `npm run test` / lint and exercise the workspace in the running app (61/61 tests pass; no lint script; 3.1–3.4 pending GM smoke test)
