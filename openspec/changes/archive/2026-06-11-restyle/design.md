## Context

Post token-sweep, all component colors resolve through `app/assets/styles/main.scss` tokens (see `openspec/specs/theme-tokens/`). Palette change = token value edit. Known pain points (verified in code):

- `--color-accent: #da1e28` red drives all active states; clock is 24px bold accent-red text in a 2px accent-red glowing border (`ProjectHeader.vue` `.digital-clock`)
- `PlaylistItem.vue`: `.item-name { font-weight: 700; font-size: 1.5em }`; `.item-index`/`.item-duration` carry duplicated `font-size: 12px; font-size: 1.5em;` override lines
- User: solo GM, storytelling-first, normal-light room, no reference designs, wants 3–4 visual proposals before committing

## Goals / Non-Goals

**Goals:**
- 4 static mockups faithful enough that picking one is a real decision (real layout proportions, realistic cue data, both interactive states shown: one playing row, one paused row)
- Approval gate honored mechanically: phase 2 tasks blocked until the pick is recorded in this file
- Phase 2 expresses the winner almost entirely through tokens

**Non-Goals:**
- No layout/IA changes (panel arrangement stays; this is skin + typography + clock)
- No new components, no logic edits
- No icon set change
- Mockups are not pixel-perfect clones — representative, not exhaustive (modals, MIDI config etc. inherit tokens later)

## Decisions

### D1: Mockups as self-contained static HTML in `mockups/restyle/`
One `NN-name.html` per direction, zero build step, shared fake data, inline CSS using the same token names as `main.scss` (`--color-*`) so the winning file's `:root` block is nearly copy-paste into phase 2. PNG screenshots generated with playwright-cli (1600×1000) committed next to them.
- *Why HTML+PNG*: PNGs for quick comparison; HTML to open and squint at details. Token-name parity makes phase 2 mechanical.
- *Alternative*: theming the real app behind 4 data-theme variants — higher fidelity but is exactly the "restyle before approval" the user vetoed, and 4× the work before any decision.
- *Location*: repo root `mockups/` (not `docs-site/` — that's the public site; not `public/` — that ships in the build).

### D2: The four directions (concrete palettes)

| Token | 1 Calm Slate | 2 Warm Tavern | 3 Paper Light | 4 Current tamed |
|---|---|---|---|---|
| background | `#1a1d21` | `#211c18` | `#f4f1ea` | `#161616` |
| surface | `#23272d` | `#2b251f` | `#fbf9f4` | `#262626` |
| surface-hover | `#2c313a` | `#352e26` | `#ffffff` | `#333333` |
| border | `#3a404a` | `#4a4035` | `#d8d2c4` | `#525252` |
| text-primary | `#e8eaed` | `#ede4d8` | `#26231e` | `#f4f4f4` |
| text-secondary | `#9aa3af` | `#b3a695` | `#6b655a` | `#c6c6c6` |
| accent | `#4fb3bf` (teal) | `#e0a458` (amber) | `#2a7f7f` (deep teal) | `#4589ff` (cobalt) |
| danger stays red in all four (semantic), success/warning/meters unchanged | | | | |

Headers in Warm Tavern use a serif stack (`Iowan Old Style, Palatino, serif`) for panel titles only; body stays IBM Plex Sans everywhere in all directions.

### D3: Shared typography + clock treatment (all four mockups)
- Playlist row: name `font-weight: 500; font-size: 15px`; index/duration `12px` secondary; **playing row only**: accent-colored left bar + name at 600 weight; paused row: state-paused colored bar
- Clock: plain text, `18px`, `font-weight: 400`, `--color-text-secondary`, tabular numerals, no border/box/glow
- *Why shared*: user already approved these fixes in principle ("font too much", "clock horrible"); varying them per direction would multiply choices without information.

### D4: Approval gate mechanics
Phase 1 ends with a PR containing mockups + PNGs. The pick is recorded here in design.md ("**Chosen direction: N**") before any phase-2 task may start. "None of these" → another mockup round, phase 2 stays blocked.

### D5: Phase 2 scope per winner
- Token values: rewrite chosen palette into `main.scss` theme blocks. Chosen direction styles the *primary* theme (dark for 1/2/4, light for 3); the other theme gets a compatible counterpart drafted during implementation and eyeballed at the gate-holder's leisure.
- New type tokens: `--font-size-list/-meta/-clock`, `--font-weight-normal/-emphasis` so the typography fix is tokenized
- Component edits: `PlaylistItem.vue` (type + playing-row emphasis, remove duplicate font-size lines), `ProjectHeader.vue` (clock), plus whatever the chosen mockup shows that tokens can't carry (kept minimal)

### D6: Named-theme system instead of palette replacement
The two chosen directions plus both existing themes become four selectable named themes: `calm-slate`, `cobalt`, `dark` (classic), `light` (classic). Mechanics: `project.theme.mode` union widens to the four ids; each theme is a `[data-theme='<id>']` token block in `main.scss`; `data-theme` plumbing already generic. A `THEME_LIST` constant (id, label, family) drives UI; `isDarkTheme(mode)` helper replaces raw `=== 'dark'` checks (logo variants etc.). Old projects load unchanged ('dark'/'light' remain valid ids) — no schema migration.
- *Why*: user liked two directions; selector removes the either/or and keeps the old look as fallback at near-zero cost post-token-sweep.

### D7: Defaults and menu surface
- Default theme for new projects (and the pre-project welcome screen): **`cobalt`**.
- The View-menu "Toggle Dark Mode" item is **replaced** by a Theme submenu with four radio items (pattern copied from the language submenu). Renderer mirrors the active theme to the main process (`set-current-theme` IPC, same pattern as `set-visual-display-enabled`) so the radio checked-state survives menu rebuilds. Theme display names are proper nouns, untranslated; the submenu label gets `menu.theme` in `en.json` with an English fallback for the other 19 locales.

## Risks / Trade-offs

- [Mockup flatters, real app disappoints] → mockups reuse real layout proportions and real component CSS patterns; phase 2 ends with both-themes eyeball before merge
- [Serif header font availability cross-platform] → system serif stack only, no new font files
- [User wants mix-and-match (palette from 2, type from 1)] → fine — type is shared anyway; record the combination in the pick

## Open Questions

- **Chosen direction: RESOLVED 2026-06-11** — Steve reviewed the HTML mockups directly (no PNG round needed) and picked **both dark directions as selectable themes**: Calm Slate (1) and Cobalt/current-tamed (4), with the existing dark/light themes kept as backups. See D6/D7.
