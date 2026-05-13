# E-LivePlay — Codebase Pain Points

Snapshot review at v1.4.9 (branch `dev`). Use this as the starting point when planning refactors.

## Top pain points

### 1. ~~`useAudioEngine.ts` is a 1357-line god module with copy-pasted playback paths~~ ✅ Resolved (PR #19)

The ~250-line Howl-creation block is now factored into `setupCueForPlayback`. Both `playCue` and `startCrossfadeTrack` are thin wrappers that delegate to it, differing only in initial volume and fade behavior.

### 2. ~~Audio-thread races baked into the design~~ ✅ Resolved (PR #21)

End detection, crossfade, and stop-fade triggers are now scheduled as `setTimeout` callbacks computed at cue start. The 100 ms interval drives UI only. See `scheduleCueTriggers`, `cancelCueTriggers`, and `finalizeCue` in `useAudioEngine.ts`.

### 3. ~~`applyVolumeOffset` is a -10 dB hack that silently makes everything quieter~~ ✅ Resolved (PR #29)

The offset function has been removed entirely. Volumes now pass through directly, clamped to [0, 1]. The hack never provided real headroom since Howler html5 mode caps at 1.0 — it just made everything quieter. See issue #28 for future GainNode-based real headroom approach.

### 4. ~~Two composables declare `useState('activeCues', …)` with conflicting types~~ ✅ Resolved (PR #23)

Duplicate declaration deleted from `useProject.ts`. The single owner is now `useAudioEngine`.

### 5. ~~Electron IPC handlers expose raw filesystem to the renderer~~ ✅ Resolved (PR #23)

All filesystem IPC handlers now validate paths via `pathIsInProjectFolder()`. Sync `fs.*Sync` calls converted to `fs.promises.*`. `webSecurity: false` still present — separate concern.

### 6. ~~`: any` is everywhere in the IPC boundary~~ ✅ Resolved (PR #25)

Created `app/types/ipc.ts` with typed payloads. Rewrote `global.d.ts` with zero `any`. All `window.electronAPI` methods are now fully typed.

### 7. ~~No tests~~ ✅ Resolved (PR #21 + #24)

28 tests across 3 test files covering event-driven playback (20 tests) and schema migrations (8 tests). vitest configured with `~` alias.

### 8. ~~`saveProject()` is called from 20 sites with no debouncing~~ ✅ Resolved (PR #23)

`saveProject()` is now a 500ms debounced wrapper. `flushPendingSave()` called on close and `beforeunload`.

### 9. ~~Project file format has no schema or version migration~~ ✅ Resolved (PR #24)

Added `schemaVersion` integer field, `runMigrations()`, `validateProjectStructure()`, and `migrateV0ToV1()` in `app/utils/migrations.ts`. Auto-saves after migration.

### 10. ~~Vue components are too big and own too much logic~~ ✅ Resolved (PR #27)

Extracted 5 single-responsibility composables from `app.vue` and `MainWorkspace.vue`: `useMenuListeners`, `useImportExport`, `useUpdateChecker`, `useResizablePanel`, `useWorkspaceListeners`.

### 11. ~~`DEFAULT_AUDIO_ITEM` and `DEFAULT_CART_AUDIO_ITEM` diverge~~ ✅ Resolved (PR #23)

Extracted `BASE_AUDIO_DEFAULTS`; both defaults now spread the base and override only what differs.

### 12. ~~Reactivity foot-guns~~ ✅ Resolved (PR #27)

The `triggerRef` and `waveformUpdateKey` workarounds lived in the bloated components. Component refactor separated concerns so reactivity flows are traceable. Remaining instances in deeper components (WaveformTrimmer, etc.) are a separate scope.

---

## All original pain points resolved ✅

## Remaining opportunities

- **Split `useAudioEngine.ts`** further along lines like `useCuePlayback`, `useDucking`, `useGroupPlayback`, `useMasterMeter` (file is still ~1200 lines)
- **Real >1.0 volume headroom** via Web Audio GainNode (see issue #28)
- **Deeper component refactor** — `WaveformTrimmer.vue` (1719 lines), `CartSlot.vue` (1063), `PlaylistItem.vue` (948), `PropertiesPanel.vue` (909) still own polling/progress state that duplicates `activeCues`
- **Tighten IPC contract** — runtime validation (zod) on inbound payloads for defense-in-depth
- **Issue #22** — ducking `stop-all` conflicts with crossfade
