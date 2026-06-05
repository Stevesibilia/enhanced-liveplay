# Tasks — replatform-4-visual-sidecar

## Group 1: Module Scaffold

- [ ] 1.1 Create `client/app/modules/visual/` with single registration point in the workspace
- [ ] 1.2 Port `LiveDisplayPanel.vue`, `VisualPropertiesPane.vue` into the module
- [ ] 1.3 Port `useVisualDisplay`, `useVisualMedia`, `usePlayerSync` into the module

## Group 2: Sidecar Storage

- [ ] 2.1 Define `visuals.json` schema (schemaVersion, visualDisplayEnabled, visualFolders, visualMedia[], links[])
- [ ] 2.2 Add Electron fs read/write of `<projectFolder>/visuals.json` via preload API
- [ ] 2.3 Rewrite `useVisualMedia` CRUD to read/write the sidecar (remove `saveProject()` coupling)
- [ ] 2.4 Store audio↔visual links as `{ audioItemUuid, visualUuid, linkDelay }[]` keyed by item uuid

## Group 3: Playback Trigger

- [ ] 3.1 Subscribe to `useLiveplayServer.onDocPatch` + transport WS events
- [ ] 3.2 Apply `linkDelay` (signed seconds) to schedule visual show relative to audio
- [ ] 3.3 Drive `electron/player.html` second window (show image/PDF via `file://`)

## Group 4: Migration

- [ ] 4.1 On first project open, detect legacy visual fields via `GET /api/project`
- [ ] 4.2 Write captured fields to `visuals.json`; verify completeness (idempotent)
- [ ] 4.3 Stop persisting visual fields into the project document

## Group 5: Verification

- [ ] 5.1 New project: add visuals, link to cues, confirm second-window playback + delay
- [ ] 5.2 Legacy project: confirm one-time migration, no data loss
- [ ] 5.3 Shared folder: open same project on a second host; sidecar travels + works
- [ ] 5.4 Remove the module folder; confirm base app builds/runs unaffected
- [ ] 5.5 Confirm zero server changes required (vanilla upstream server)
