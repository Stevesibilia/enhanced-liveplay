# theme-tokens Specification

## Purpose
Keep every component color flowing through the central token system in `app/assets/styles/main.scss` so themes switch cleanly and a restyle is a one-file edit. Defines the semantic state and VU-meter tokens and bans hardcoded chromatic literals in component style blocks.
## Requirements
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

### Requirement: Typography tokens exist alongside color tokens

`main.scss` SHALL define typography tokens for the recurring text roles — at minimum list-item size, metadata size, clock size, and normal/emphasis font weights — and the playlist and header components SHALL consume them instead of hardcoded font sizes and weights.

#### Scenario: Type scale changes in one place
- **WHEN** a typography token value is changed in `main.scss`
- **THEN** playlist rows and the header clock reflect the change without component edits

#### Scenario: No duplicate font-size declarations
- **WHEN** `PlaylistItem.vue` styles are inspected
- **THEN** each rule declares `font-size` at most once, via a token

### Requirement: Multiple named themes are selectable

The app SHALL offer named themes — at minimum `calm-slate`, `cobalt`, `dark` (classic), and `light` (classic) — each defined as a complete `[data-theme='<id>']` token block in `main.scss`. The active theme SHALL be a per-project setting selectable from a View-menu Theme submenu, with `cobalt` as the default for new projects. Code that needs a light/dark distinction SHALL use a family helper rather than comparing the theme id to `'dark'`.

#### Scenario: Switching theme from the menu
- **WHEN** the user picks a theme in the View → Theme submenu
- **THEN** the workspace restyles immediately, the choice is saved with the project, and the submenu radio reflects it after menu rebuilds

#### Scenario: Legacy projects keep their look
- **WHEN** a project saved with theme mode 'dark' or 'light' is opened
- **THEN** it renders with the classic theme it was saved with

#### Scenario: New project default
- **WHEN** a new project is created
- **THEN** its theme is `cobalt`

