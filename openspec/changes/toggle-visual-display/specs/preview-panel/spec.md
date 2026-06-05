## ADDED Requirements

### Requirement: Composition workspace hidden when visuals disabled
The composition workspace (right-side preview / live display panel) SHALL only be rendered when the active project's `visualDisplayEnabled` is `true`. When `false`, the workspace SHALL be unmounted and the surrounding layout SHALL reflow to use the freed space.

#### Scenario: Workspace hidden while visuals disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the main window renders
- **THEN** the composition workspace SHALL NOT be mounted
- **AND** the remaining panels SHALL expand to fill the available space

#### Scenario: Workspace reappears on re-enable
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user re-enables `visualDisplayEnabled`
- **THEN** the composition workspace SHALL be mounted with its prior layers intact
