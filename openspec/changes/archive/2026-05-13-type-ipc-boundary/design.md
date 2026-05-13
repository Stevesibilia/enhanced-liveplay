## Context

`app/types/global.d.ts` declares the `window.electronAPI` interface with 16 uses of `any`. Most method signatures are already typed — the gaps are event parameters, a few untyped data payloads, and loose return types. The `MidiConfig` interface already exists in `useMidiController.ts` but isn't used in the type declaration.

## Goals / Non-Goals

**Goals:**
- Eliminate all `any` from `global.d.ts`
- Create a dedicated `app/types/ipc.ts` for IPC-specific payload types
- Update consumer sites to remove explicit `: any` annotations
- Zero runtime behavior change

**Non-Goals:**
- Runtime validation (zod) of IPC payloads — that's a separate effort
- Typing the main process side (`electron/main.js` is plain JS)
- Typing `electron/preload.js`

## Design Decisions

### D1: Use a thin `IpcEvent` type instead of importing Electron types

The renderer shouldn't depend on the `electron` package for types. Define:
```ts
type IpcEvent = { sender: unknown; ports: unknown[] };
```
This is enough for the signature without pulling in Electron's type dependency. Consumers already ignore the event parameter (`_event`).

### D2: Create `app/types/ipc.ts` for payload interfaces

Group all IPC-specific types in one file:
- `TriggerItemPayload = { type: 'uuid'; value: string } | { type: 'index'; value: number[] }`
- `StopItemPayload = { type: 'uuid'; value: string }`
- Re-export `MidiConfig` and `MidiBinding` from `useMidiController.ts` (or move them here)
- `LocaleData` interface for `getLocaleData` return
- `UpdateInfo` interface for `checkForUpdates`

### D3: Move `MidiConfig`/`MidiBinding` interfaces to `app/types/ipc.ts`

Currently defined in `useMidiController.ts`. Moving to a shared types file lets `global.d.ts` reference them without circular imports and makes them available to other consumers.

### D4: Type `getLocaleData` return as `Record<string, string>`

Locale data is a flat key-value map of translation strings. A `Record<string, string>` is accurate and better than `any`.

### D5: Type `checkForUpdates` `updateInfo` with an `UpdateInfo` interface

Based on `electron-updater`'s shape: `{ version: string; releaseNotes?: string; releaseDate?: string }`.

## Risks

- None significant. This is a purely additive type change. If any consumer was relying on `any` to pass incorrect data, the compiler will catch it — which is the point.
