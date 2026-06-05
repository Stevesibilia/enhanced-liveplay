## ADDED Requirements

### Requirement: Cue Picker On New Client

The cue picker SHALL be available on the new client and source its cue list from `useLiveplayServer` (REST cue catalogue / WS updates), not from a renderer audio engine.

#### Scenario: Cue list from server

- **WHEN** the cue picker opens
- **THEN** it SHALL display cues sourced from the server catalogue

### Requirement: Minimal Mode Window

A compact, always-on-top performance window SHALL be available, with transport controls that issue server commands and a window lifecycle integrated with the client's Electron-main window management.

#### Scenario: Always-on-top compact window

- **WHEN** the user enables minimal mode
- **THEN** a compact window SHALL appear and stay above other windows

#### Scenario: Transport from minimal mode

- **WHEN** the user triggers a transport action in minimal mode
- **THEN** the action SHALL be sent to the server as a REST/WS command

### Requirement: Listener Composables Function

`useMenuListeners` and `useWorkspaceListeners` SHALL function on the new client, with former Howler/global references replaced by server-derived state or surviving IPC events.

#### Scenario: Menu events handled

- **WHEN** a menu/IPC event fires
- **THEN** the corresponding listener SHALL handle it without referencing the removed engine

### Requirement: Resizable Panel Preserved

`useResizablePanel` SHALL preserve its behavior (pure UI), adapted only for new component locations.

#### Scenario: Panel resizes

- **WHEN** the user drags a panel divider
- **THEN** the panel SHALL resize as before

### Requirement: Import/Export Against Server

Project/media import-export SHALL operate against the server-owned project document and use server file endpoints or IPC for disk access, round-tripping known fields without loss.

#### Scenario: Export then import round-trip

- **WHEN** a project is exported and re-imported
- **THEN** all known fields SHALL be preserved

### Requirement: Update Checker Target

`useUpdateChecker` SHALL target the correct release repository and SHALL NOT regress auto-update behavior.

#### Scenario: Update check hits correct repo

- **WHEN** the app checks for updates
- **THEN** it SHALL query the configured fork release repository

### Requirement: No Engine Coupling

None of these features SHALL depend on the removed Howler engine; all dynamic data SHALL come from the server or surviving IPC.

#### Scenario: No Howler references

- **WHEN** the ported features are typechecked
- **THEN** there SHALL be no references to the removed audio engine
