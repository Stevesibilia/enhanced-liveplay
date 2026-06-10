## Context

`app/assets/styles/main.scss` defines the theme: spacing/radius/transition tokens plus light/dark palettes (Carbon-flavored — surfaces, text, `--color-accent` defaulting to IBM red `#da1e28`, `--color-danger/success/warning`). Components mostly use `var(--...)`, but an inventory found:

- ~118 hardcoded hex literals and ~120 raw `rgba()` literals in component `<style>` blocks (and some `<script>` blocks)
- Three palettes mixed: Carbon (theme), Tailwind (`#dc2626`, `#ef4444`, `#eab308`, `#22c55e`, `#16a34a`, `#3b82f6`, `#991b1b`), Material (`#ff9800`, `#ffc107`, `#f44336`, `#4caf50`, `#e57373`, `#ffb74d`, `#e53935`) — same intent, different colors per component
- Two special clusters that are **not** drift:
  - `var(--color-accent, #3b82f6)` ×8 — token usage with a stray blue fallback that contradicts the red accent
  - `#1a4d2e/#22c55e/#eab308/#dc2626` — the VU-meter dB scale (green→yellow→red zones), used in WaveformTrimmer/VUMeter both as CSS gradients and as return values of JS functions that paint canvas

## Goals / Non-Goals

**Goals:**
- Every color in a component `<style>` block resolves through a `main.scss` token
- Semantic state tokens defined per theme; consolidated families (one red, one amber, one green per intent)
- Chromatic alpha variants derive from their base token (no separate hardcoded rgba)

**Non-Goals:**
- No token *value* redesign (restyle comes later; this change keeps today's look modulo shade consolidation)
- No JS refactors: hexes in `<script>` blocks (canvas painting, wavesurfer options, accent-swatch data, dynamic `rgba(${r},...)` from user cue colors) stay
- No `electron/` HTML (player.html, state-viewer) changes
- No neutral overlay/shadow tokenization (`rgba(0,0,0,.3)` etc. stay; optional follow-up)

## Decisions

### D1: Semantic tokens, not palette tokens
New tokens are named by intent (`--color-state-playing`, `--color-state-paused`, `--color-state-recording`, `--color-info`, `--color-meter-low/-mid/-high/-clip`), not by hue (`--color-red-600`). Existing `--color-danger/success/warning` are reused where intent matches.
- *Why*: restyle changes meaning-to-color mapping in one place; palette tokens would just relocate the drift.
- *Alternative*: Tailwind-style scale tokens — rejected, invites the same per-component shade shopping that caused this.

### D2: Consolidation over verbatim preservation
Near-duplicate shades collapse to one token even when pixels shift slightly (e.g. `#f44336`/`#e53935`/`#ef4444`/`#cc0000` → `--color-danger`). The exact hex→token mapping table is built as the first implementation task and recorded in the tasks file; anything ambiguous maps to the closest existing token rather than minting a new one.
- *Why*: verbatim preservation would need ~30 tokens and keep the inconsistency; the whole point is one color per intent.
- *Trade-off*: small visible shifts — accepted, verified by eyeballing both themes.

### D3: Alpha variants via color-mix()
`rgba(220,38,38,.2)` → `color-mix(in srgb, var(--color-danger) 20%, transparent)`. Electron 42's Chromium supports `color-mix`.
- *Alternative*: parallel `--color-danger-rgb` triplet tokens with `rgb(var(...) / .2)` — works but doubles token bookkeeping.

### D4: Meter scale gets dedicated tokens, JS keeps literals
The dB zone colors become `--color-meter-low/-mid/-high/-clip` (same values both themes) and CSS gradients use them. The JS functions that return hexes for canvas painting keep literals, with a comment pointing at the tokens they must match.
- *Why*: reading CSS custom properties from JS (`getComputedStyle`) is a refactor with reactivity edge cases — out of proportion for this change.

### D5: Stray accent fallbacks dropped
`var(--color-accent, #3b82f6)` → `var(--color-accent)`. The token is always defined in both themes; the blue fallback is dead code that lies about the accent color.

## Risks / Trade-offs

- [Consolidated shade looks wrong in some spot] → mapping table reviewed before replacement; both-themes eyeball pass; trivially revertable per-line
- [color-mix unsupported in some context] → spot-check one usage in dev before sweeping all; fall back to D3-alternative if broken
- [A "style" hex is actually load-bearing data (e.g. matching a canvas color)] → meter cluster already identified; mapping task flags any CSS hex that pairs with a JS literal

## Migration Plan

Single PR: extend tokens in `main.scss` → mechanical replacement per component → `npm run test` (style-only; tests should be untouched) → eyeball both themes in dev. Rollback = revert PR.

## Open Questions

- None blocking. Pink/magenta one-offs (`#ff7eb6`, `#ee5396`, `#d02670`) are likely accent-swatch data in script blocks — confirmed during the mapping task; if they are style, they map to accent or get a one-off token.
