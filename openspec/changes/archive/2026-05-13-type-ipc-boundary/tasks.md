## 1. Create IPC types file (D2, D3)

- [x] 1.1 Create `app/types/ipc.ts` with: `IpcEvent` type alias, `TriggerItemPayload`, `StopItemPayload`, `UpdateInfo` interface.
- [x] 1.2 Move `MidiConfig` and `MidiBinding` interfaces from `useMidiController.ts` to `app/types/ipc.ts`, update `useMidiController.ts` to import from there.

## 2. Update global.d.ts (D1, D4, D5)

- [x] 2.1 Import types from `~/types/ipc` at the top of `global.d.ts`.
- [x] 2.2 Replace all `event: any` with `event: IpcEvent` in listener callback signatures.
- [x] 2.3 Replace `data: any` on `onTriggerItem` with `data: TriggerItemPayload`.
- [x] 2.4 Replace `data: any` on `onStopItem` with `data: StopItemPayload`.
- [x] 2.5 Replace `projectData: any` on `onOpenProjectFile` with `projectData: unknown`.
- [x] 2.6 Replace `Record<string, any>` on `readMidiConfig`/`writeMidiConfig` with `MidiConfig`.
- [x] 2.7 Replace `any` return on `getLocaleData` with `Record<string, string>`.
- [x] 2.8 Replace `updateInfo?: any` on `checkForUpdates` with `updateInfo?: UpdateInfo`.
- [x] 2.9 Verify zero `any` remains in `global.d.ts`.

## 3. Update consumer sites

- [x] 3.1 Update `app/app.vue` — remove explicit `: any` on IPC listener callbacks.
- [x] 3.2 Update `app/components/MainWorkspace.vue` — type `data` param on export progress callback.
- [x] 3.3 Update `app/components/UpdateModal.vue` — remove `: any` on update progress/error callbacks.

## 4. Verification

- [x] 4.1 Confirm typecheck passes with zero errors.
- [x] 4.2 Confirm all vitest tests pass.
- [x] 4.3 Verify `rg 'any' app/types/global.d.ts` returns zero matches.
