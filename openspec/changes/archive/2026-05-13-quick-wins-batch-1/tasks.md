## 1. Fix duplicate `activeCues` state (D1)

- [x] 1.1 In `useProject.ts`, remove the `useState<Map<string, any>>('activeCues', …)` declaration at line 17.
- [x] 1.2 At the two usage sites in `useProject.ts` (`.clear()` at line 331 and re-export at line 465), import `activeCues` from `useAudioEngine()` instead.
- [x] 1.3 Verify no other files import `activeCues` from `useProject` — update any that do to use `useAudioEngine`.
- [x] 1.4 Confirm build passes with no type errors.

## 2. Debounce `saveProject()` (D2)

- [x] 2.1 In `useProject.ts`, rename the current `saveProject` implementation to `saveProjectImmediate` (private).
- [x] 2.2 Create a debounced wrapper `saveProject` using a 500 ms `setTimeout` pattern. The wrapper should clear any pending timeout on each call and schedule a new one.
- [x] 2.3 Add a `flushPendingSave()` function that executes any pending debounced save immediately and clears the timeout.
- [x] 2.4 Register a `beforeunload` event listener (or Electron `before-quit` via IPC) that calls `flushPendingSave()` to prevent data loss on app close.
- [x] 2.5 Verify that all 18 existing call sites continue to work without changes — the debounce is transparent.
- [x] 2.6 Manual test: rapidly drag a volume slider, confirm only one save occurs after stopping.

## 3. Guard Electron IPC filesystem handlers (D3)

- [x] 3.1 In `electron/main.js`, add a `pathIsInProjectFolder(requestedPath)` function that resolves the path and checks it starts with the active project folder path.
- [x] 3.2 Determine how the main process tracks the current project folder path. If not currently tracked, add IPC to communicate it from the renderer when a project is opened/closed.
- [x] 3.3 Apply `pathIsInProjectFolder` guard to the `read-file` handler. Return `{ success: false, error: 'Path outside project folder' }` on rejection.
- [x] 3.4 Apply `pathIsInProjectFolder` guard to the `write-file` handler.
- [x] 3.5 Apply `pathIsInProjectFolder` guard to the `copy-file` handler (both source and destination).
- [x] 3.6 Convert `read-file` from `fs.readFileSync` to `fs.promises.readFile`.
- [x] 3.7 Convert `write-file` from `fs.writeFileSync` to `fs.promises.writeFile`.
- [x] 3.8 Convert `copy-file` from `fs.copyFileSync` to `fs.promises.copyFile` and `fs.mkdirSync` to `fs.promises.mkdir`.
- [x] 3.9 Check if other filesystem IPC handlers exist (e.g., `delete-file`, `rename-file`) and apply the same guard if found.
- [x] 3.10 Manual test: open a project, confirm media loading and project saving still work.

## 4. Compose default audio items from shared base (D4)

- [x] 4.1 In `app/types/project.ts`, extract a `BASE_AUDIO_DEFAULTS` constant containing the 13 shared fields.
- [x] 4.2 Redefine `DEFAULT_AUDIO_ITEM` as `{ ...BASE_AUDIO_DEFAULTS, endBehavior: { action: 'next' }, duckingBehavior: { mode: 'stop-all', duckFadeIn: 0.25, duckFadeOut: 1.0 } }`.
- [x] 4.3 Redefine `DEFAULT_CART_AUDIO_ITEM` as `{ ...BASE_AUDIO_DEFAULTS, endBehavior: { action: 'nothing' }, duckingBehavior: { mode: 'duck-others', duckLevel: 0.2, duckFadeIn: 0.25, duckFadeOut: 1.0 } }`.
- [x] 4.4 Confirm build passes and existing tests pass.

## 5. Documentation

- [x] 5.1 Update `pain_points.md` to mark items #4, #5, #8, and #11 as addressed, with a brief note on what was done for each.
