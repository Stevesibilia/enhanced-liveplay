## Context

Four independent fixes from the pain-points audit. They touch different subsystems (state management, persistence, IPC security, type definitions) but are small enough to land in one change. Each fix is self-contained; no ordering dependency between them.

## Goals / Non-Goals

**Goals:**
- Eliminate the `Map<string, any>` type hole on `activeCues`.
- Reduce disk I/O during rapid UI edits (slider drags, bulk operations) via debounced saves.
- Close the renderer-escape attack surface on the three filesystem IPC handlers.
- Reduce duplication between `DEFAULT_AUDIO_ITEM` and `DEFAULT_CART_AUDIO_ITEM`.

**Non-Goals:**
- Full IPC contract typing (pain-point #6 — separate, larger effort).
- `webSecurity: true` enforcement (requires broader CORS/CSP work).
- Schema versioning for project files (pain-point #9 — separate change).

## Decisions

### D1: Delete the duplicate `activeCues` declaration in `useProject`

`useProject.ts:17` declares `useState<Map<string, any>>('activeCues', …)` and only uses it for `.clear()` (line 331) and re-export (line 465). Replace it: import `activeCues` from `useAudioEngine()` where needed, or call `useAudioEngine().activeCues` directly at the two usage sites.

**Why**: Single owner, single type. The `any` typing means callers through `useProject` lose all type checking on cue state.

**Alternative considered**: Re-type the `useProject` declaration as `Map<string, ActiveCueState>`. Rejected — two declarations with the same key is confusing regardless of type; one owner is cleaner.

### D2: Debounce `saveProject()` at 500 ms inside the composable

Add a module-scoped debounce wrapper around the actual `saveProject` implementation in `useProject.ts`. All 18 call sites continue calling `saveProject()` — no caller changes needed. The wrapper coalesces rapid calls into a single disk write after 500 ms of inactivity.

**Why**: Slider drags and bulk operations can trigger 10+ saves per second. Each save does `JSON.stringify` of the full project + `writeFileSync`, which blocks the main thread.

**Edge case — app exit**: Register a `beforeunload` handler (or Electron `before-quit`) that flushes any pending debounced save synchronously. Without this, the last edit before closing could be lost.

**Alternative considered**: `requestIdleCallback`-based batching. Rejected — too complex for the gain; simple debounce covers the 80% case.

### D3: Add `pathIsInProjectFolder()` guard to filesystem IPC handlers

In `electron/main.js`, add a validation function that:
1. Resolves the requested path to an absolute path (`path.resolve`).
2. Checks that it starts with the active project's folder path.
3. Rejects with an error if the check fails.

Apply this guard to `read-file`, `write-file`, and `copy-file` handlers. Also convert from `readFileSync`/`writeFileSync` to `fs.promises.readFile`/`writeFile` to stop blocking the main process event loop.

**Why**: Currently any renderer-injected JS can read/write arbitrary files on disk. The guard scopes access to the project folder only.

**Edge case — no active project**: If no project is loaded, reject all filesystem IPC calls. The handlers should only work in the context of an open project.

**Edge case — symlinks**: Use `path.resolve` (not `fs.realpathSync`) so symlinked project folders work. The check is "does the resolved path start with the project folder prefix" — symlink targets outside the folder would correctly be rejected.

**Alternative considered**: Per-file allowlist. Rejected — too rigid; the project folder boundary is the right granularity.

### D4: Compose default items from a shared base

Extract the 13 shared fields into a `BASE_AUDIO_DEFAULTS` constant. Define `DEFAULT_AUDIO_ITEM` and `DEFAULT_CART_AUDIO_ITEM` as spread compositions:

```ts
const BASE_AUDIO_DEFAULTS = { color, inPoint, volume, startBehavior, customActions, fadeOutDuration, playFade, stopFade, crossFade };
export const DEFAULT_AUDIO_ITEM = { ...BASE_AUDIO_DEFAULTS, endBehavior: { action: 'next' }, duckingBehavior: { mode: 'stop-all', ... } };
export const DEFAULT_CART_AUDIO_ITEM = { ...BASE_AUDIO_DEFAULTS, endBehavior: { action: 'nothing' }, duckingBehavior: { mode: 'duck-others', duckLevel: 0.2, ... } };
```

**Why**: When a new field is added (like `crossFade: 0` was recently), it only needs to be added once.

## Risks / Trade-offs

- **[Risk] Debounce loses the last save on crash.** If the app crashes (not clean exit) during the debounce window, the last edit is lost. → Mitigation: 500 ms window is short; data loss is at most one edit. The `beforeunload` flush covers clean exits.
- **[Risk] IPC path guard rejects legitimate cross-folder access.** Some workflows may reference media files outside the project folder. → Mitigation: the `media/` subfolder is inside the project folder by convention. If users symlink media from elsewhere, the symlink itself is inside the folder — `path.resolve` won't follow it.
- **[Trade-off] Debounce adds 500 ms latency to disk persistence.** Acceptable — users don't observe when the file is written, only that it's written before they close the app.

## Migration Plan

No migration needed. All changes are backwards-compatible:
1. Land all four fixes in one commit/PR.
2. No project file format changes.
3. No public API changes.
4. Rollback: revert the commit.

## Open Questions

- Should the IPC guard also cover other handlers like `delete-file` or `rename-file` if they exist? (Check during implementation.)
- Should `saveProject` debounce be configurable or is 500 ms universally fine? (Start with hardcoded 500 ms.)
