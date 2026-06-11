## Why

The current look fights the app's actual use: a solo GM tool used during storytelling, in a normally lit room, where the screen must be glanceable and calm. Today: IBM-red accent on near-black drives every active state (alarm semantics), every playlist row is bold at 1.5em (the list shouts), and the clock is a red bold glowing box that reads as a REC indicator. Steve has explicitly vetoed restyling without seeing options first.

## What Changes

- **Phase 1 — mockups (no app code)**: build 4 static HTML pages faking the main workspace (header with clock, playlist with realistic TTRPG cue data, cart grid, playback bar), one per design direction, plus PNG screenshots:
  1. *Calm Slate* — cool dark gray, teal/blue accent, light weights, quiet clock
  2. *Warm Tavern* — warm charcoal-brown, amber accent, subtly serif headers
  3. *Paper Light* — warm off-white, ink text, muted deep-teal accent (normal-light room candidate)
  4. *Current, tamed* — Carbon dark kept, red→cobalt accent, normalized type, de-boxed clock
  All four share the typography fix (playlist rows 400–500 weight, ~14–15px, emphasis only on the playing row) and the quiet clock (plain text, secondary color, no border/glow).
- **HARD GATE**: Steve picks a direction (or asks for tweaks/another round). No application code changes before his approval.
- **Phase 2 — apply the winner**: update token values in `main.scss` (palette per chosen direction), fix playlist typography in `PlaylistItem.vue` (including the duplicated `font-size` override lines), restyle the clock in `ProjectHeader.vue`, and adjust any component styles the chosen direction requires. Both themes remain functional; the non-chosen theme gets a compatible variant of the palette.
- Mockups live under `docs-site/` or a `mockups/` folder (decided in design) — not shipped in the app build.

## Capabilities

### New Capabilities

- `visual-design`: the app's visual design principles — calm-by-default emphasis hierarchy (only the playing row and live states draw attention), quiet chrome (clock, headers), palette set by the approved direction

### Modified Capabilities

- `theme-tokens`: token *values* change to the chosen palette; typography tokens (font-size/weight scale) added so type is tokenized like color

## Impact

- **Phase 1**: new static files only; zero app behavior or style changes
- **Phase 2**: `app/assets/styles/main.scss` (token values + new type tokens), `PlaylistItem.vue`, `ProjectHeader.vue`, and direction-dependent component tweaks; no logic, no IPC, no electron/ changes
- **Risk**: low — token sweep (archived `2026-06-10-token-sweep`) made palette changes a one-file edit; typography/clock are scoped component edits
