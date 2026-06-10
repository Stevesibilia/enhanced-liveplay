## ADDED Requirements

### Requirement: Component style colors resolve through the central token system

All color values in component `<style>` blocks (`app/components/*.vue`, `app/app.vue`) SHALL be expressed as `var(--...)` references to tokens defined in `app/assets/styles/main.scss`, or as `color-mix()` expressions over such tokens. Hardcoded hex and chromatic `rgba()` literals SHALL NOT appear in component style blocks, with these allowed exceptions: neutral black/white overlays and shadows, and `<script>`-block literals (canvas painting, library options, color data).

#### Scenario: No hardcoded chromatic colors in style blocks
- **WHEN** component style blocks are scanned for hex literals and chromatic `rgba()` literals
- **THEN** every match is one of the allowed exceptions

#### Scenario: Alpha variants track their base token
- **WHEN** a style needs a translucent variant of a themed color
- **THEN** it SHALL use `color-mix(in srgb, var(--token) N%, transparent)` so changing the token changes the variant

### Requirement: Semantic state tokens exist in both themes

`main.scss` SHALL define semantic tokens for the recurring UI intents — at minimum playback states (playing, paused, armed/flash), danger, warning, success, info/selection, and the VU-meter zones (low, mid, high, clip) — with values declared in both the light and dark theme blocks.

#### Scenario: Theme switch restyles state colors
- **WHEN** the user switches between light and dark themes
- **THEN** every state color used by components resolves to the value declared for the active theme

#### Scenario: One token per intent
- **WHEN** two components express the same intent (e.g. a destructive action)
- **THEN** they reference the same token rather than different literals

### Requirement: Accent token usage carries no contradicting fallbacks

References to `--color-accent` (and other always-defined theme tokens) SHALL NOT declare inline fallback values.

#### Scenario: Accent reference without fallback
- **WHEN** a component styles an element with the accent color
- **THEN** it uses `var(--color-accent)` with no second argument
