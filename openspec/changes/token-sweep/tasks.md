## 1. Inventory and mapping

- [x] 1.1 Build the hex→token mapping table: every hex/chromatic-rgba in component style blocks, its intent, and target token (existing or new); record the table in this file under task 1.1 when done

  | Literal(s) | Intent | Token |
  |---|---|---|
  | `#ef4444`, `rgb(a)(239,68,68)`, `rgb(a)(220,38,38)`, `#F44336` + flash rgba, `#da1e28`, `rgba(218,30,40,…)` in UpdateModal, fallbacks `#e57373`/`#e53935` | destructive / error | `--color-danger` (+ `color-mix` for alphas) |
  | `rgba(218,30,40,…)` in CuePicker/MediaLibrary*/LiveDisplayPanel | selection/hover tint | `color-mix(var(--color-accent) N%)` |
  | `rgba(59,130,246,0.1)` (+ dead `--color-accent-bg` fallback) | info/selected background | `color-mix(var(--color-info) 10%)` — new token `#3b82f6` |
  | `#FFC107` + `rgba(255,193,7,…)` | armed/flash amber | `--color-state-armed` (new, `#ffc107`) |
  | `#ff9800`/`#FF9800` + `rgba(255,152,0,…)`, `#f56d1f` | paused/orange | `--color-state-paused` (new, `#ff9800`) |
  | `#ffb74d` | queued/draft layer | `--color-state-queued` (new, `#ffb74d`) |
  | `#fbbf24` | unsaved/saving | `--color-warning` (existing) |
  | `rgb(a)(234,179,8)` (trim handles) | warning handles | `--color-warning` |
  | `rgb(a)(34,197,94)` (in-points) | success markers | `--color-success` (existing) |
  | `#4caf50` (published border) | success | `--color-success` |
  | `#1a4d2e/#22c55e/#16a34a/#eab308/#dc2626/#991b1b` (gradients), VUMeter `#4caf50/#ffc107/#f44336` | VU meter zones | `--color-meter-lowest/-low/-mid/-high/-peak/-clip` (new) |
  | `#dc2626` (ProjectHeader error) | error badge | `--color-danger` |
  | `#FF0000/#CC0000/#990000` | emergency stop-all button | `--color-stop-all` (new, `#ff0000`) + `color-mix(… , black)` darkening |
  | `#666666/#555555` | disabled stop-all | `--color-text-disabled` + `color-mix(…, black)` |
  | `var(--color-accent, #3b82f6)`, `var(--color-accent, #0f62fe)`, `var(--color-error, #da1e28)` | dead/contradicting fallbacks | bare `var(--color-accent)` / `var(--color-danger)` |
  | `#000`, `#fff` (player preview bg, text on colored badges, outline on black) | fixed-contrast neutrals | exempt, left as-is |
- [x] 1.2 Classify the exceptions: script-block literals (meter JS, wavesurfer options, accent swatches, dynamic cue colors), neutral overlays — confirm pink/magenta one-offs are swatch data
- [x] 1.3 Spot-check `color-mix()` renders correctly in the running app (one usage, dev mode) before sweeping — done statically: Electron 42 ships Chromium far past 111 (first color-mix support); visual confirmation folded into 4.3

## 2. Token definitions

- [x] 2.1 Add semantic state tokens to `main.scss` (playing, paused, armed/flash, info/selection; reuse existing danger/warning/success where intent matches) — both theme blocks
- [x] 2.2 Add VU-meter zone tokens `--color-meter-low/-mid/-high/-clip` (same values both themes), with a comment noting the JS literals in WaveformTrimmer/VUMeter that must stay in sync

## 3. Component sweep

- [x] 3.1 Replace hex literals with `var(--...)` per the mapping table across all component style blocks
- [x] 3.2 Replace chromatic `rgba()` literals with `color-mix()` over tokens
- [x] 3.3 Drop stray fallbacks: `var(--color-accent, #3b82f6)` → `var(--color-accent)` (8 sites)
- [x] 3.4 Add sync-comments next to JS meter-color literals pointing at the meter tokens

## 4. Verification

- [x] 4.1 Re-run the scan: zero non-exempt hex/chromatic-rgba literals in component style blocks
- [x] 4.2 `npm run test` green (style-only change; suite untouched)
- [ ] 4.3 Manual eyeball in dev, both themes: playlist states (playing/paused), cart slot flash states, VU meter gradient, modals (MIDI/control config), waveform trimmer, properties panel — nothing illegible or obviously off
