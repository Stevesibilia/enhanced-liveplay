## ADDED Requirements

### Requirement: Single MIDI Implementation

After reconciliation there SHALL be exactly one MIDI implementation on the client, issuing transport actions as server REST/WS commands, with the chosen implementation's rationale documented.

#### Scenario: One MIDI path

- **WHEN** the client is built
- **THEN** only one MIDI controller implementation SHALL exist and it SHALL drive the server

### Requirement: Single Cart-Hotkeys Implementation

There SHALL be exactly one cart-hotkeys implementation, with hotkey logic covered by tests, operating against server transport.

#### Scenario: One hotkeys path

- **WHEN** a cart hotkey is pressed
- **THEN** a single implementation SHALL handle it and issue a server command

### Requirement: Migration Ownership

`.liveplay` schema migration SHALL be owned by the server's load-time migration where it already covers a case; fork JS cases the server handles SHALL be removed; remaining audio-schema gaps SHALL be filled server-side or via an explicit pre-load client check. Visual-field migration SHALL remain owned by the visual sidecar and SHALL NOT be duplicated here.

#### Scenario: Redundant JS migration removed

- **WHEN** a fork migration case is already handled by the C++ loader
- **THEN** the JS migration for that case SHALL be removed

#### Scenario: Gap filled

- **WHEN** a fork migration case is NOT handled by the server
- **THEN** it SHALL be implemented server-side or as a pre-load client check

### Requirement: Single Runtime Version

The client SHALL run on one decided runtime version (Nuxt 3 baseline or re-applied Nuxt 4 / Electron 42), applied consistently across the whole client.

#### Scenario: No mixed runtime

- **WHEN** the client is typechecked and built
- **THEN** it SHALL use a single consistent runtime version

### Requirement: No Capability Regression

Reconciliation SHALL NOT lose capability present in either source implementation; behavioral differences SHALL be resolved deliberately and covered by tests before deleting either side.

#### Scenario: Parity verified before deletion

- **WHEN** one of two duplicate implementations is removed
- **THEN** tests SHALL confirm the retained one covers the removed one's behavior
