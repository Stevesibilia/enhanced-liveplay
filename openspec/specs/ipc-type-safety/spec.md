## ADDED Requirements

### Requirement: All IPC listener callbacks use typed event parameter

Every `on*` callback in the `electronAPI` interface SHALL type the event parameter as `IpcEvent` (a minimal type alias) instead of `any`.

### Requirement: TriggerItem and StopItem payloads are typed

The `onTriggerItem` callback data SHALL be typed as `TriggerItemPayload`:
```ts
type TriggerItemPayload = { type: 'uuid'; value: string } | { type: 'index'; value: number[] };
```

The `onStopItem` callback data SHALL be typed as `StopItemPayload`:
```ts
type StopItemPayload = { type: 'uuid'; value: string };
```

### Requirement: MidiConfig uses a shared typed interface

`readMidiConfig` SHALL return `Promise<MidiConfig>` and `writeMidiConfig` SHALL accept `MidiConfig`. The `MidiConfig` and `MidiBinding` interfaces SHALL be defined in `app/types/ipc.ts` and imported by both `global.d.ts` and consumer code.

### Requirement: Locale data return is typed

`getLocaleData` SHALL return `Promise<Record<string, string>>` instead of `Promise<any>`.

### Requirement: Update info is typed

`checkForUpdates` SHALL return a typed `updateInfo` field using an `UpdateInfo` interface with at minimum `version: string`, `releaseNotes?: string`, `releaseDate?: string`.

### Requirement: No `any` in global.d.ts

After this change, `app/types/global.d.ts` SHALL contain zero occurrences of the `any` type.
