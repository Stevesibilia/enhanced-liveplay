## Why

The theme system in `app/assets/styles/main.scss` (CSS custom properties, light/dark) is bypassed by ~118 hardcoded hex colors and ~120 raw `rgba()` literals across 27 component style blocks. Three different palettes are mixed in (Carbon theme tokens, Tailwind hexes like `#dc2626`/`#22c55e`, Material hexes like `#ff9800`/`#4caf50`), so the same intent uses different colors in different components, hardcoded colors ignore theme switches, and the planned restyle cannot be done in one file until these flow through tokens.

## What Changes

- Extend `main.scss` with semantic state tokens (e.g. danger/stop, warning/paused, success/playing, info/selection, plus the cart-slot flash states), each defined for both light and dark themes
- Replace hardcoded hex colors in component `<style>` blocks with `var(--...)` references, consolidating near-duplicate shades (3+ reds, 4+ ambers, 4+ greens) onto single tokens — **intentional minor visual shifts** where drifted shades collapse to one
- Replace chromatic `rgba(R,G,B,a)` literals with `color-mix(in srgb, var(--token) N%, transparent)` so alpha variants track their base token
- Out of scope: neutral black/white overlay/shadow `rgba()`s, hexes in `<script>` blocks (data like accent swatches, canvas/wavesurfer options), `electron/` HTML (player, state viewer), and any token *value* redesign (that is the future restyle)

## Capabilities

### New Capabilities

- `theme-tokens`: all component style colors resolve through the central token system; semantic state tokens exist in both themes

### Modified Capabilities

<!-- none — no existing spec covers styling/theming -->

## Impact

- **Code**: `app/assets/styles/main.scss` (token additions), ~20 component `.vue` style blocks; no logic changes anywhere
- **Visuals**: mostly pixel-identical; consolidated shades shift slightly by design (mapping table in design.md, eyeball verification in both themes)
- **No dependencies, no IPC, no renderer logic**: style-only change, single PR
- **Unblocks**: the graphic restyle becomes a one-file edit afterwards
