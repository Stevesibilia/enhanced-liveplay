## 1. Project schema + state

- [x] 1.1 Add optional `visualDisplayEnabled?: boolean` to `Project` type in `app/types/project.ts`.
- [x] 1.2 In `app/utils/migrations.ts` (or the load path), default `visualDisplayEnabled` to `true` when absent on project load. (Implemented in `useProject.openProject` post-migrations — no migration registered, per design's "no schema bump" decision.)
- [x] 1.3 In `app/composables/useProject.ts` (or current project state holder), expose a reactive `visualDisplayEnabled` ref/computed and a `setVisualDisplayEnabled(value)` setter that mutates the active project and triggers persistence.
- [ ] 1.4 Verify saving and reopening a project round-trips the flag value. (Manual verification step — run the app.)

## 2. Electron menu wiring

- [x] 2.1 Add a "View → Enable Visual Display" `type: 'checkbox'` menu item in `electron/main.js`, with `checked` bound to the current project flag held in main process.
- [x] 2.2 Add IPC channel `menu-toggle-visual-display` (main → renderer) sent on menu click.
- [x] 2.3 Add IPC channel `set-visual-display-enabled` (renderer → main) carrying the new boolean; main process stores it and calls `createMenu(...)` to rebuild. (Renamed from `project-visual-display-changed` to follow existing `setX`/`set-x` naming convention used by `setCurrentProject`.)
- [x] 2.4 On project load/switch in the renderer, send `set-visual-display-enabled` so the menu reflects the newly active project. (Implemented via `watch(visualDisplayEnabled, ..., { immediate: true })` in `useMenuListeners`, which fires on mount and on every change.)
- [x] 2.5 In `app/composables/useMenuListeners.ts`, handle `menu-toggle-visual-display` by calling `setVisualDisplayEnabled(!current)`.

## 3. Player window coupling

- [x] 3.1 In `electron/main.js`, set the "Open/Close Player Window" menu item's `enabled` to follow the visual flag (false when disabled).
- [x] 3.2 When `set-visual-display-enabled` arrives with `false`, call `closePlayerWindow()` if the player window is open.
- [ ] 3.3 Verify `CmdOrCtrl+P` is a no-op while disabled. (Manual verification step — `enabled: false` on the menu item also disables its accelerator in Electron; click handler also guards with `if (!visualDisplayEnabled) return;` as belt-and-braces.)

## 4. UI gating

- [x] 4.1 In `MainWorkspace.vue`, gate the Media tab visibility with `v-if="visualDisplayEnabled"`. If the user is currently on the Media tab when the flag flips off, switch to the Audio tab.
- [x] 4.2 In `MainWorkspace.vue`, gate `LiveDisplayPanel` rendering with `v-if="visualDisplayEnabled"`; let the surrounding flex/grid layout reflow to fill the freed space. (Gated via the enclosing `<template v-if="activeTab === 'media' && visualDisplayEnabled">`, which also unmounts `MediaLibraryPanel` and `VisualPropertiesPane` together.)
- [x] 4.3 Gate the `VisualPropertiesPane` with `v-if="visualDisplayEnabled"`. (Task referenced `PropertiesPanel.vue`, but `VisualPropertiesPane` actually lives in `MainWorkspace.vue` under the Media tab block; gating happens there.)

## 5. Suppress audio→visual firing

- [x] 5.1 In `app/composables/useVisualDisplay.ts`, at the cue-trigger handler that consumes `item.linkedCueUuid`, early-return when `visualDisplayEnabled === false`. (Guard added at the top of `publishLayerWithLinking` — the chokepoint where visual publish triggers the linked audio cue.)
- [ ] 5.2 Verify audio cue playback is unaffected when the flag is off (cues still play, just no visual side effect). (Manual verification step. Note: per the actual `visual-audio-linking` model, the firing direction is push-visual → trigger-cue, not cue-play → trigger-visual; the audio playback path is untouched.)

## 6. Verification

- [ ] 6.1 Load a legacy project without the field → flag is treated as `true`, no behavior change.
- [ ] 6.2 New project → flag defaults to `true`, menu checkbox checked.
- [ ] 6.3 Toggle off → Media tab hidden, composition workspace hidden, Visual Properties pane hidden, player window closes, "Open Player Window" menu item greyed.
- [ ] 6.4 Toggle off → play a cue with a linked visual; audio plays, no visual fires.
- [ ] 6.5 Toggle on after off → all UI returns; composition workspace shows prior layers; linked cues fire visuals again.
- [ ] 6.6 Switch between two projects with different flag values → menu checkbox state updates per active project.
- [ ] 6.7 Save and reopen a project after flipping the flag → value persists.
