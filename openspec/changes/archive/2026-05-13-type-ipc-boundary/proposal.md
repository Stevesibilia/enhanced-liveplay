## Why

The `window.electronAPI` surface is the trust boundary between renderer and main process. While `global.d.ts` already types most method signatures, 16 uses of `any` remain — primarily on IPC event listener callbacks (`event: any`), untyped payloads (`data: any` on `onTriggerItem`, `onStopItem`), and loose return types (`Record<string, any>` for midi config, `any` for locale data and update info). These hide type errors at the boundary where bugs are most dangerous and prevent IDE auto-complete from guiding correct usage.

## What Changes

- Replace all `event: any` in IPC listener callback signatures with `Electron.IpcRendererEvent` (or a minimal substitute type since renderer code shouldn't import Electron directly)
- Type the `onTriggerItem` and `onStopItem` data payloads
- Type `onOpenProjectFile` `projectData` field
- Type `readMidiConfig` / `writeMidiConfig` with a proper `MidiConfig` interface
- Type `getLocaleData` return
- Type `checkForUpdates` `updateInfo` field
- Update consumer sites to match (remove explicit `: any` annotations)

## Capabilities

### New Capabilities
- `ipc-type-safety`: typed interfaces for all IPC payloads crossing the renderer/main boundary

### Modified Capabilities
_(none)_

## Impact

- `app/types/global.d.ts`: replace all `any` with proper types
- `app/types/project.ts` or new `app/types/ipc.ts`: new interfaces for IPC payloads
- Consumer sites in `app.vue`, `CartSlot.vue`, `useAudioEngine.ts`, etc.: remove explicit `: any` casts
- No runtime behavior change — purely compile-time safety
