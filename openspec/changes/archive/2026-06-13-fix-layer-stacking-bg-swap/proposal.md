## Why

In the composition workspace, selecting a layer pins it on top of everything via a `z-index: 9999 !important` rule, which silently overrides each layer's real z-index. As a result the GM's Front/Back buttons appear to do nothing (the layer they act on is the selected one, which is forced to the top), and marking a layer as Background leaves it full-screen on top of the others instead of behind them. Replacing one background with another also fails: the outgoing background stays published and full-screen at a higher z than the new one, so the new backdrop is hidden. The player window renders correctly — only the GM's editing surface lies, which makes the controls feel broken.

## What Changes

- Selection styling SHALL no longer override layer z-ordering in the composition workspace. The selected-layer outline/handles stay visible without forcing the layer to the top, so Front/Back and Background reflect the true stacking immediately.
- Marking a layer as Background SHALL leave it ordered behind all other layers in the workspace exactly as it already is in the player.
- Replacing the active background (marking a new layer as background while one already exists) SHALL retire the previous background so the new full-screen backdrop is the only live one — the outgoing background is unpublished and reverts to a normal movable/resizable layer rather than lingering full-screen on top.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `layer-display`: clarify that workspace selection styling MUST NOT override z-ordering; tighten the single-background invariant so the outgoing background is retired (unpublished + reverted to normal layer) and never covers the new backdrop.

## Impact

- `app/components/LiveDisplayPanel.vue` — remove/scope the `.selected { z-index: 9999 !important }` rule so selection no longer reorders layers; decouple selection visuals from stacking.
- `app/composables/useVisualDisplay.ts` — `setBackground` outgoing-background handling: unpublish and reset the previously-marked background to a normal layer when a new one is set.
- No IPC, player (`electron/player.html`), or persisted-schema changes; player rendering is already correct.
