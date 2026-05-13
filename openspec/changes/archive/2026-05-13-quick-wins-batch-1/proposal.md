## Why

Four low-effort items from the pain-points audit (v1.4.9) each carry disproportionate risk or friction and share no dependencies between them. Batching them into one change keeps the overhead of branching, reviewing, and merging proportional to the actual code volume (~100 lines changed across the four fixes).

## What Changes

- **Fix duplicate `activeCues` state declaration.** `useProject.ts:17` declares `useState<Map<string, any>>('activeCues', …)`, shadowing the typed declaration in `useAudioEngine.ts:47`. Delete the duplicate; have `useProject` import from `useAudioEngine` or access the shared state through a typed getter.
- **Debounce `saveProject()`.** 18 call sites invoke `saveProject()` synchronously on every mutation. Wrap it in a 500 ms debounce so rapid edits (slider drags, bulk operations) batch into one disk write.
- **Guard Electron IPC filesystem handlers.** `read-file`, `write-file`, and `copy-file` IPC handlers in `electron/main.js` accept arbitrary paths with no validation. Add a `pathIsInProjectFolder()` guard that rejects paths outside the active project directory. Also switch from `readFileSync`/`writeFileSync` to `fs.promises` to avoid blocking the main process.
- **Compose default audio items from a shared base.** `DEFAULT_AUDIO_ITEM` and `DEFAULT_CART_AUDIO_ITEM` in `app/types/project.ts` are 90% identical. Extract a `BASE_AUDIO_DEFAULTS` and compose each variant with its category-specific overrides (`endBehavior`, `duckingBehavior`).

## Capabilities

### New Capabilities
<!-- None — these are internal quality fixes with no new user-facing capabilities. -->

### Modified Capabilities
<!-- No spec-level behavior changes. All fixes are implementation-internal. -->

## Impact

- **Code**: `app/composables/useProject.ts`, `app/composables/useAudioEngine.ts`, `app/types/project.ts`, `electron/main.js`, and every component that calls `saveProject()` (indirect — the debounce is transparent to callers).
- **APIs**: No public-facing changes. `saveProject()` signature unchanged; debounce is internal.
- **Dependencies**: None added.
- **Risk**: The IPC path guard could reject legitimate paths if the guard is too restrictive (e.g., media files stored outside the project folder via symlinks). Needs to handle the `media/` subdirectory and any paths the app already uses.
- **Risk**: The debounce could delay the final save if the app exits immediately after a mutation. Needs a flush-on-exit hook.
