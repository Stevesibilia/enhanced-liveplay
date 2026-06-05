## Why

Several of this fork's features are UI/UX-only and not coupled to the audio engine, so they port to the upstream client with low risk. Doing the cheap, independent ports first builds momentum and validates the porting pattern (copy file → repoint data source from Howler/IPC to `useLiveplayServer`) before tackling the harder visual and media-library work.

## What Changes

Port these fork-unique pieces into `client/app/`:

- **Cue picker** (`CuePicker.vue`)
- **Minimal mode** (`MinimalWorkspace.vue` + always-on-top window wiring in electron)
- **Listener composables** (`useMenuListeners`, `useWorkspaceListeners`)
- **Resizable panel** (`useResizablePanel`)
- **Import/export** (`useImportExport`)
- **Update checker** (`useUpdateChecker`)

Each is rewired so any data/transport it needs comes from `useLiveplayServer` (REST/WS) or Electron IPC that still exists in the new client, not from the old Howler engine.

## Capabilities

### New Capabilities

- `client-ui-ports`: the engine-independent UI features re-homed on the upstream client.

### Modified Capabilities

_(none directly; these supersede the fork's pre-replatform specs for the same features: `minimal-mode`, `component-composition`)_

## Impact

- New components/composables under `client/app/`.
- Minor `client/electron/main.js` changes (always-on-top window for minimal mode).
- Depends on: `replatform-1-foundation` (and benefits from `replatform-2-infra` CI).
- Independent of: visual (Phase 4) and media library (Phase 5).
