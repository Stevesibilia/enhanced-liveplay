# E-LivePlay — Codebase Pain Points

Snapshot review at v1.4.9 (branch `dev`). Use this as the starting point when planning refactors.

## Top pain points

### 1. ~~`useAudioEngine.ts` is a 1357-line god module with copy-pasted playback paths~~ — **Resolved (PR #19, commit `f5388bf`)**

The ~250-line Howl-creation block is now factored into `setupCueForPlayback` (`app/composables/useAudioEngine.ts:226`). Both `playCue` (:423) and `startCrossfadeTrack` (:719) are thin wrappers that delegate to it, differing only in initial volume and fade behavior. File is down to 1109 lines and the duplicate-bug class is closed.

Minor residual: `applyVolumeOffset(item.volume)` is recomputed at the call site in `playCue` and the `initialVolume` parameter is ignored when building `ActiveCueState` inside `setupCueForPlayback` (:388). Not a bug, just minor redundancy.

### 2. ~~Audio-thread races baked into the design~~ ✅ Addressed

The progress interval polls `howl.seek()` every 100 ms and uses it to detect "ended", trigger crossfades, fire stop-fades, and update group progress. That polling-based control-plane is the source of the bugs fixed in PR #17 — loop boundary, loop-toggle, audio-thread vs JS-thread events. The proper signals exist (`onend`, `onplay`, `onstop`) but are partially used. Long-term: replace polling for *decisions* with Howler events; keep polling only for *display* (`currentTime` updates).

> **Resolved by the `event-driven-playback` change.** End detection, crossfade, and stop-fade triggers are now scheduled as `setTimeout` callbacks computed at cue start. The 100 ms interval drives UI only (`currentTime`, levels, group progress). Pause/resume/seek/mutation all reschedule triggers correctly. See `scheduleCueTriggers`, `cancelCueTriggers`, and `finalizeCue` in `useAudioEngine.ts`.

### 3. `applyVolumeOffset` is a -10 dB hack that silently makes everything quieter

`app/utils/audio.ts:45` subtracts 10 dB from every per-cue volume "to give +10 dB headroom" — but Howler clamps `.volume()` to [0,1], which is exactly the issue we hit on master volume. So the offset doesn't buy headroom; it just lowers the noise floor by 10 dB. The UI label "0 dB" is actually -10 dB at the speakers. Either remove the offset or do the GainNode-bypass for real (and document it clearly).

### 4. ~~Two composables declare `useState('activeCues', …)` with conflicting types~~ ✅ Addressed

- `useAudioEngine.ts:40` → `Map<string, ActiveCueState>`
- ~~`useProject.ts:17` → `Map<string, any>`~~ — removed

Duplicate declaration deleted from `useProject.ts`. The single owner is now `useAudioEngine`; `closeProject` imports it from there. All consumers get full type safety.

### 5. ~~Electron IPC handlers expose raw filesystem to the renderer~~ ✅ Addressed

All filesystem IPC handlers (`read-file`, `read-audio-file`, `write-file`, `copy-file`, `ensure-directory`) now validate paths via `pathIsInProjectFolder()` — resolves the path and checks it starts with the active project folder. Sync `fs.*Sync` calls converted to `fs.promises.*`. `webSecurity: false` still present (line 418) — separate concern.

### 6. `: any` is everywhere in the IPC boundary

63 occurrences in `app/`, most of them `event: any` in IPC listener signatures (`app/types/global.d.ts` and `app.vue`). The whole `window.electronAPI` surface is the trust boundary, and it's effectively unchecked at the type level. A typed `IpcRendererEvent` import and runtime validation (zod or just narrow guards) on inbound payloads would catch a class of bugs at compile time.

### 7. No tests

Zero `*.test.*` / `*.spec.*` files, no `tests/` directory, no test script in `package.json`. For a desktop audio app where the core engine has subtle timing/race issues, this is the most expensive omission. Even a handful of unit tests around `useCartHotkeys` (binding match, conflict detection, key formatting) and `audio.ts` (dB conversion math) would have made the last few days of fixes trivial to verify.

### 8. ~~`saveProject()` is called from 20 sites with no debouncing~~ ✅ Addressed

`saveProject()` is now a 500ms debounced wrapper around `saveProjectImmediate()`. `flushPendingSave()` is called on `closeProject` and registered on `beforeunload`. All 18 existing call sites work without changes — the debounce is transparent.

### 9. Project file format has no schema or version migration

`Project` is a TS interface; on disk it's free-form JSON. No `schemaVersion` check on load, no migrations. The `version: '1.0.0'` field exists on `Project` but is never read. The moment you change a required field (you've added `cartSlotKeys`, `globalKeyBindings`, etc.), old project files break or load with `undefined` fields and silently miss features. Add a `schemaVersion`, a `loadProject` validator (zod), and a migrations table.

### 10. Vue components are too big and own too much logic

`WaveformTrimmer.vue` 1719 lines, `CartSlot.vue` 1063, `PlaylistItem.vue` 948, `PropertiesPanel.vue` 909. Each has its own `setInterval` for progress polling (10 `setInterval` call sites total), each with its own cleanup. The state these components own (progress, polling, fade triggers) duplicates what's already in `useAudioEngine.activeCues`. Subscribe to a single source of truth and let the cue state drive the UI.

### 11. ~~`DEFAULT_AUDIO_ITEM` and `DEFAULT_CART_AUDIO_ITEM` diverge~~ ✅ Addressed

Extracted `BASE_AUDIO_DEFAULTS` with the 9 shared fields; `DEFAULT_AUDIO_ITEM` and `DEFAULT_CART_AUDIO_ITEM` now spread the base and override only `endBehavior` and `duckingBehavior`.

### 12. Reactivity foot-guns

`triggerRef` import in `useProject.ts:2` and the `waveformUpdateKey` counter (`useState<number>('waveformUpdateKey', () => 0)` incremented to force re-renders) are signs Vue's reactivity isn't tracking what you expect. Usually means an object is being mutated in a way Vue can't observe — likely the per-item `waveform` field. Worth tracing because every workaround like this is a future bug.

---

## Quick wins (low effort, high payoff)

1. ~~Extract Howl creation in `playCue` and `startCrossfadeTrack` into one `createHowlForItem(item, opts)` function~~ — done in PR #19 as `setupCueForPlayback`.
2. ~~Wrap the three filesystem IPC handlers in a `pathIsInProjectFolder` check~~ — done in quick-wins-batch-1.
3. Add a `schemaVersion` field and a `validateProject(json)` in `openProject` (~1 hour, prevents the next "old project file crashes" bug).
4. ~~Add a single `vitest` config and write tests for `app/utils/audio.ts` and the pure helpers in `useCartHotkeys`~~ — vitest established in event-driven-playback (20 tests).
5. ~~Fix the `Map<string, any>` duplication in `useProject`~~ — done in quick-wins-batch-1.
6. ~~Debounce `saveProject`~~ — done in quick-wins-batch-1.

## Bigger projects (sequenced)

1. **Replace polling-based decisions with Howler events** in `useAudioEngine.ts`. Keep the 100 ms polling only for `currentTime` updates feeding the UI. This is where almost every audio bug originates.
2. **Split `useAudioEngine.ts`** along lines like `useCuePlayback`, `useDucking`, `useGroupPlayback`, `useMasterMeter`. Each one is testable in isolation.
3. **Schema + migrations for project files.** Pair with versioning of the `.liveplay` format.
4. **Tighten the IPC contract.** Either zod-validate every IPC payload or generate the types from a single source.

## Recommended starting point

With deduplication done (PR #19), the natural next step is **bigger project #1** — replace polling-based decisions inside `setupCueForPlayback`'s progress interval with Howler events. The seam now exists in one place, so end-detection, crossfade trigger, and stop-fade trigger can be migrated to `onend` / event-driven scheduling without the previous "fix it in two places" tax.
