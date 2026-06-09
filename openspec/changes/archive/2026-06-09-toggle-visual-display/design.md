## Context

LivePlay is gaining significant visual subsystem surface area: media library, multi-layer composition workspace, visual properties pane on cart slots, audio→visual linking with timed reveals, and a separate player window. Many projects (e.g., live music sessions) will not use any of this and want a simpler UI. Today the visual subsystem is always-on with no per-project way to opt out.

The visual subsystem is rooted in two composables (`useVisualDisplay`, `useVisualMedia`) and surfaces in four primary components plus the Electron player window. A precedent already exists for menu-driven toggles (Cmd+P player window, Cmd+M minimal mode, dark mode, language) wired through `electron/main.js` → IPC → renderer composable.

Stakeholders: solo GMs running mixed (audio + visual) and audio-only projects; project files are portable across machines, so the flag must persist with the project.

## Goals / Non-Goals

**Goals:**
- Single per-project boolean controls the entire visual subsystem.
- Disabling hides UI, suppresses audio→visual firing, and auto-closes the player window — without destroying any data.
- Re-enabling restores prior UI state (composition layers, library state) untouched.
- Menu item state (checkbox + Cmd+P enabled/disabled) reflects the active project's flag.
- Existing projects open with visuals enabled (no behavior change for current users).

**Non-Goals:**
- No app-wide preference (per-project only).
- No per-feature granularity (no separate "hide library but keep workspace" toggle).
- No status indicator outside the menu (menu checkmark is enough).
- No change to Minimal Mode semantics — Minimal Mode and the visual flag remain orthogonal.
- No data migration of existing visual media or `linkedCueUuid` references.
- No re-architecture of visual composables; gating is additive.

## Decisions

### Per-project flag, not app preference
Stored on the project object as `visualDisplayEnabled: boolean` (default `true`). Persists to `.lpa`.

**Why over app preference:** a project file represents a context (a band rehearsal, a stage show). The audio-only vs visual choice is a trait of that context, not of the user's machine. Two GMs sharing a project file see the same mode.

**Alternative considered:** global setting in app config. Rejected — would not travel with the project and would not let one user maintain multiple projects with different modes without re-flipping every time they switch.

### Single boolean, no per-feature granularity
One flag gates all five effects (UI hides + cue suppression + player auto-close + menu disable + visual props hide).

**Why:** complexity ceiling. Per-feature toggles multiply surface area and configuration confusion. The exploration confirmed all five effects are the *same* user intent ("I'm not using visuals this project").

### Menu item is a checkbox bound to active project
Electron menu item `type: 'checkbox'`; `checked` reflects current project's flag. Click sends IPC; renderer mutates project state; menu is rebuilt to reflect the new state.

**Why rebuild over runtime mutation:** menu rebuild is already the established pattern in `electron/main.js` (e.g., language change calls `createMenu(...)` after IPC). Consistent with existing code.

**Alternative considered:** keeping menu state in main process and broadcasting; rejected as it duplicates the source of truth (the project state in the renderer/store).

### Player window auto-closes on flag-off; "Open Player" menu item disabled while off
Flipping the flag off triggers `closePlayerWindow()` via existing IPC. The "Open/Close Player Window" menu item is set to `enabled: false` while the flag is off, so Cmd+P does nothing.

**Why disable rather than no-op or auto-enable:** explicit feedback (greyed menu) communicates state. No surprising mode flip from a window-open keystroke.

### Linking direction confirmed: visual → cue
`linkedCueUuid` lives on the visual media item, not the cue. When visuals are disabled, the cart slot UI requires no badge changes — the renderer simply does not query/render visual references. No cart-side gating needed.

### Migration: opt-in default to `true`
`app/utils/migrations.ts` runs at project load. Projects without the field are treated as `visualDisplayEnabled: true`. No schema version bump required if we treat the field as optional with a default; bump only if we want explicit migration tracking.

**Decision:** treat as optional with default `true`. No schema bump. Less ceremony for a backwards-compatible additive field.

### Suppression point for audio→visual firing
Gate inside `useVisualDisplay`'s cue-trigger handler (where `linkedUuid = item.linkedCueUuid` is consumed). Single chokepoint, one early return.

**Why not gate at the cue-playback caller:** keeps audio playback code unaware of the visual flag, preserving separation of concerns.

### UI hiding via `v-if`, not `v-show`
Use `v-if` on the gated panels (`MediaLibraryPanel`, `LiveDisplayPanel`, `VisualPropertiesPane`) so the components unmount entirely. Layout reflows naturally.

**Why `v-if` over `v-show`:** unmounting avoids running watchers/composables for hidden visual UI when disabled. Cheaper and cleaner.

## Risks / Trade-offs

- **[Risk]** A user toggles off mid-show with linked visuals already mid-fade on the player window → **Mitigation:** flag-off transition explicitly calls `closePlayerWindow()`, which terminates any in-flight visual state.
- **[Risk]** Stale menu checkbox state if multiple projects are switched rapidly → **Mitigation:** menu is rebuilt on every project load/switch event (extend existing project-load IPC).
- **[Risk]** A future feature couples to visual UI assuming it's always mounted → **Mitigation:** document the flag in the new `visual-display-toggle` spec and reference it from modified-capability deltas.
- **[Trade-off]** No app-wide default — every new project starts with visuals on, even for users who never use them. Acceptable: one toggle per project lifetime is low cost.
- **[Trade-off]** No status indicator in main UI — possible confusion ("why is the media tab gone?"). Acceptable: menu state is the source of truth; user just flipped it.

## Migration Plan

1. Add optional `visualDisplayEnabled?: boolean` to project type; default to `true` in load path (`migrations.ts`).
2. Add menu item + IPC channels (`menu-toggle-visual-display`, optional `request-toggle-visual-display` if renderer initiates).
3. Add reactive flag accessor in project store/composable.
4. Gate UI with `v-if`; gate cue firing with early return in `useVisualDisplay`.
5. Wire player-window auto-close + Cmd+P disable on flag-off.
6. Existing `.lpa` files load with `visualDisplayEnabled` absent → defaulted to `true`. No user-facing change.

**Rollback:** field is additive and optional; deleting the menu item + gating logic restores prior behavior without project-file changes.

## Open Questions

- Should the flag-off transition show a brief confirmation if the player window is currently displaying live content? (Probably no — match existing "Black" button behavior, which is instant.)
- Should `Cmd+P` press while disabled show a transient hint, or stay silently a no-op? (Default: silent, consistent with disabled menu items.)
