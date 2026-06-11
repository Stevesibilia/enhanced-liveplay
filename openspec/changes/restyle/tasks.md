## 1. Phase 1 — Mockups

- [x] 1.1 Study the real main workspace layout and capture proportions + structure for the mockup skeleton
- [x] 1.2 Build shared mockup skeleton with realistic TTRPG fake data
- [x] 1.3 Produce the four direction mockups under `mockups/restyle/`
- [x] 1.4 ~~PNG screenshots~~ obsolete — Steve reviewed the HTML files directly
- [x] 1.5 ~~Separate phase-1 PR~~ obsolete — decision made from direct review; mockups committed with phase 2 as record

## 2. GATE — direction approval

- [x] 2.1 Decision recorded in design.md: **Calm Slate + Cobalt as selectable themes**, classic dark/light kept, default `cobalt`, Theme submenu replaces Toggle Dark Mode (D6/D7)

## 3. Phase 2 — Theme system + global fixes

- [x] 3.1 `main.scss`: add typography tokens (`--font-size-list/-meta/-clock`, `--font-weight-normal/-emphasis`) and the `calm-slate` + `cobalt` theme blocks (signal/meter tokens included, custom-accent override preserved)
- [x] 3.2 `app/types/project.ts`: widen `Theme.mode` union, add `THEME_LIST` (id/label/family) + `isDarkTheme()`, default theme `cobalt`
- [x] 3.3 Replace raw `=== 'dark'` checks with `isDarkTheme()` (ProjectHeader, WelcomeScreen, AboutModal) and update pre-project theme defaults to `cobalt`
- [x] 3.4 Renderer menu flow: replace `onMenuToggleDarkMode` with `onMenuSetTheme(themeId)` in `useMenuListeners`, mirror via new `set-current-theme` IPC; update `preload.js`, `app/types/ipc.ts`, `app/types/global.d.ts`
- [x] 3.5 Electron: `state.js` currentTheme, `ipc/misc.js` `set-current-theme` handler (+ rebuildMenu dep), `menu.js` Theme submenu radios replacing Toggle Dark Mode, `menu.theme` key in `en.json` with fallback
- [x] 3.6 Global typography fix in `PlaylistItem.vue` (tokenized sizes/weights, remove duplicated font-size lines, playing-row-only emphasis)
- [x] 3.7 Quiet clock in `ProjectHeader.vue` (plain text, secondary color, tabular numerals, no box/glow)
- [x] 3.8 Unit tests: `isDarkTheme` families + new-project default theme
- [x] 3.9 `npm run test` green; scan: no new hardcoded literals

## 4. Verification

- [ ] 4.1 Steve eyeballs all four themes in the real app against mockups; tweaks until approved
- [ ] 4.2 Phase-2 PR merged
