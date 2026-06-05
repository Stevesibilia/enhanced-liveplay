## ADDED Requirements

### Requirement: Sidecar Storage

Visual state SHALL be stored in a sidecar file `<projectFolder>/visuals.json`, NOT in the `.liveplay` project document, and the client SHALL read/write it directly via Electron fs.

#### Scenario: Visual edit persists to sidecar

- **WHEN** the user adds or edits visual media
- **THEN** the change SHALL be written to `visuals.json` and not to the project document

### Requirement: Sidecar Schema

`visuals.json` SHALL contain `schemaVersion`, `visualDisplayEnabled`, `visualFolders[]`, `visualMedia[]` (each with `uuid`, `displayName`, `mediaPath` relative to the project folder, `mediaType` ∈ {image, pdf}, optional `folder`), and `links[]` (each `{ audioItemUuid, visualUuid, linkDelay }`).

#### Scenario: Schema fields present

- **WHEN** `visuals.json` is written
- **THEN** it SHALL include the defined fields with `mediaPath` stored relative to the project folder

### Requirement: No Server Coupling

The feature SHALL require zero changes to the C++ server, SHALL NOT write visual data to audio items, and SHALL NOT rely on any server write endpoint. Reading legacy fields MAY use `GET /api/project`.

#### Scenario: Works on vanilla upstream server

- **WHEN** the client runs against an unmodified upstream server
- **THEN** all visual functionality SHALL work without server changes

### Requirement: Audio-Visual Linking

Links SHALL be keyed by the audio item `uuid` and `linkDelay` SHALL be signed seconds (`>0` audio first, `<0` visual first, `0` simultaneous).

#### Scenario: Delayed visual trigger

- **WHEN** an audio item with a linked visual and `linkDelay` of -2 plays
- **THEN** the visual SHALL appear 2 seconds before the audio starts

### Requirement: Read-only Playback Trigger

The visual second window SHALL be driven read-only by server WS transport events + `onDocPatch`, applying `linkDelay` client-side, and SHALL load media via `file://` from the project folder.

#### Scenario: Visual shows on cue playback

- **WHEN** the server reports a linked cue started
- **THEN** the visual window SHALL display the linked media at the scheduled time

### Requirement: Drop-in Module

All visual code SHALL live under `client/app/modules/visual/` with a single registration point, and removing the module SHALL leave the base app building and running unaffected.

#### Scenario: Module removal is safe

- **WHEN** the `client/app/modules/visual/` folder is removed
- **THEN** the base app SHALL still build and run

### Requirement: Lossless Migration

On first open of a project carrying legacy in-document visual fields, the client SHALL migrate them to `visuals.json` idempotently and losslessly, then stop persisting visual fields into the project document.

#### Scenario: Legacy project migrates once

- **WHEN** a legacy project with embedded visual fields is opened
- **THEN** the visual data SHALL be written to `visuals.json` with no loss and not re-migrated on subsequent opens

### Requirement: Shared-folder Workflow Support

The sidecar SHALL live inside the project folder so it travels with the project for the shared-folder, non-simultaneous, multi-host workflow.

#### Scenario: Open on a second host

- **WHEN** the same project folder is opened on a different host
- **THEN** `visuals.json` SHALL be present and the visual feature SHALL work

### Requirement: Remote Topology Out Of Scope

Remote-client topology (client host ≠ project-folder host) SHALL NOT be supported in this version; `file://` media access is assumed.

#### Scenario: Remote topology not guaranteed

- **WHEN** the client runs on a host without access to the project folder
- **THEN** visual media access is NOT guaranteed and is considered out of scope
