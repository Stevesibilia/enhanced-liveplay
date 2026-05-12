# E-LivePlay — Codebase Pain Points

Snapshot review at v1.4.9 (branch `dev`). Use this as the starting point when planning refactors.

## Top pain points

### 1. `useAudioEngine.ts` is a 1357-line god module with copy-pasted playback paths

`playCue` (line 219) and `startCrossfadeTrack` (line 764) are essentially the same ~250-line function pasted twice — same Howl config, same sprite math, same progress-interval, same end-detection block. That's why every loop fix in PR #17 required `replace_all: true`. Any change to playback (volume offset, sprite handling, end behavior) has to be applied to both, and we just lived through what happens when one drifts. **Highest-leverage refactor in the codebase.**

### 2. Audio-thread races baked into the design

The progress interval polls `howl.seek()` every 100 ms and uses it to detect "ended", trigger crossfades, fire stop-fades, and update group progress. That polling-based control-plane is the source of the bugs fixed in PR #17 — loop boundary, loop-toggle, audio-thread vs JS-thread events. The proper signals exist (`onend`, `onplay`, `onstop`) but are partially used. Long-term: replace polling for *decisions* with Howler events; keep polling only for *display* (`currentTime` updates).

### 3. `applyVolumeOffset` is a -10 dB hack that silently makes everything quieter

`app/utils/audio.ts:45` subtracts 10 dB from every per-cue volume "to give +10 dB headroom" — but Howler clamps `.volume()` to [0,1], which is exactly the issue we hit on master volume. So the offset doesn't buy headroom; it just lowers the noise floor by 10 dB. The UI label "0 dB" is actually -10 dB at the speakers. Either remove the offset or do the GainNode-bypass for real (and document it clearly).

### 4. Two composables declare `useState('activeCues', …)` with conflicting types

- `useAudioEngine.ts:40` → `Map<string, ActiveCueState>`
- `useProject.ts:17` → `Map<string, any>`

Nuxt shares state by key, so the runtime is one Map but `useProject` sees it as `any`. Every consumer that pulls activeCues via `useProject` loses type safety. Pick one owner (`useAudioEngine`), expose a typed getter, delete the duplicate.

### 5. Electron IPC handlers expose raw filesystem to the renderer

`electron/main.js:997-1024`:

```js
ipcMain.handle('read-file', (event, filePath) => fs.readFileSync(filePath, 'utf8'))
ipcMain.handle('write-file', (event, filePath, data) => fs.writeFileSync(filePath, data))
ipcMain.handle('copy-file', (event, source, destination) => …)
```

No path validation, no allow-list, no check that the path is inside the project folder. Combined with `webSecurity: false` on the main window (line 418) and the fact that the app loads user-supplied `.liveplay` JSON files, a malicious project file that triggers HTML/JS injection anywhere in the renderer could read or overwrite arbitrary files on the user's disk. Wrap these with a `pathIsInProjectFolder()` guard.

Also: `readFileSync` / `writeFileSync` in handlers block the main process event loop. Use `fs.promises`.

### 6. `: any` is everywhere in the IPC boundary

63 occurrences in `app/`, most of them `event: any` in IPC listener signatures (`app/types/global.d.ts` and `app.vue`). The whole `window.electronAPI` surface is the trust boundary, and it's effectively unchecked at the type level. A typed `IpcRendererEvent` import and runtime validation (zod or just narrow guards) on inbound payloads would catch a class of bugs at compile time.

### 7. No tests

Zero `*.test.*` / `*.spec.*` files, no `tests/` directory, no test script in `package.json`. For a desktop audio app where the core engine has subtle timing/race issues, this is the most expensive omission. Even a handful of unit tests around `useCartHotkeys` (binding match, conflict detection, key formatting) and `audio.ts` (dB conversion math) would have made the last few days of fixes trivial to verify.

### 8. `saveProject()` is called from 20 sites with no debouncing

Every mutation calls `saveProject()` synchronously: `JSON.stringify` the entire project + write to disk. For large projects (lots of cart-only items with waveforms), this stalls the UI on every keypress in a numeric input. A 500 ms debounce in the composable would be invisible to users and remove the worst latency spikes.

### 9. Project file format has no schema or version migration

`Project` is a TS interface; on disk it's free-form JSON. No `schemaVersion` check on load, no migrations. The `version: '1.0.0'` field exists on `Project` but is never read. The moment you change a required field (you've added `cartSlotKeys`, `globalKeyBindings`, etc.), old project files break or load with `undefined` fields and silently miss features. Add a `schemaVersion`, a `loadProject` validator (zod), and a migrations table.

### 10. Vue components are too big and own too much logic

`WaveformTrimmer.vue` 1719 lines, `CartSlot.vue` 1063, `PlaylistItem.vue` 948, `PropertiesPanel.vue` 909. Each has its own `setInterval` for progress polling (10 `setInterval` call sites total), each with its own cleanup. The state these components own (progress, polling, fade triggers) duplicates what's already in `useAudioEngine.activeCues`. Subscribe to a single source of truth and let the cue state drive the UI.

### 11. `DEFAULT_AUDIO_ITEM` and `DEFAULT_CART_AUDIO_ITEM` diverge

`app/types/project.ts:182` and `:201` are nearly identical except `endBehavior` and `duckingBehavior`. Easy to forget to update both when adding a field (e.g., the new `crossFade: 0` was added). Compose one base with category overrides.

### 12. Reactivity foot-guns

`triggerRef` import in `useProject.ts:2` and the `waveformUpdateKey` counter (`useState<number>('waveformUpdateKey', () => 0)` incremented to force re-renders) are signs Vue's reactivity isn't tracking what you expect. Usually means an object is being mutated in a way Vue can't observe — likely the per-item `waveform` field. Worth tracing because every workaround like this is a future bug.

---

## Quick wins (low effort, high payoff)

1. Extract Howl creation in `playCue` and `startCrossfadeTrack` into one `createHowlForItem(item, opts)` function (~2 hours, eliminates the duplicate-bug class entirely).
2. Wrap the three filesystem IPC handlers in a `pathIsInProjectFolder` check (~30 min, closes the renderer-escape attack surface).
3. Add a `schemaVersion` field and a `validateProject(json)` in `openProject` (~1 hour, prevents the next "old project file crashes" bug).
4. Add a single `vitest` config and write tests for `app/utils/audio.ts` and the pure helpers in `useCartHotkeys` (~2 hours, establishes the testing pattern).
5. Fix the `Map<string, any>` duplication in `useProject` (~5 min).
6. Debounce `saveProject` (~10 min).

## Bigger projects (sequenced)

1. **Replace polling-based decisions with Howler events** in `useAudioEngine.ts`. Keep the 100 ms polling only for `currentTime` updates feeding the UI. This is where almost every audio bug originates.
2. **Split `useAudioEngine.ts`** along lines like `useCuePlayback`, `useDucking`, `useGroupPlayback`, `useMasterMeter`. Each one is testable in isolation.
3. **Schema + migrations for project files.** Pair with versioning of the `.liveplay` format.
4. **Tighten the IPC contract.** Either zod-validate every IPC payload or generate the types from a single source.

## Recommended starting point

**Quick win #1** (deduplicate Howl creation): mostly mechanical, removes a recurring source of bugs, and produces the seam needed to start replacing polling with events (bigger project #1).
