## ADDED Requirements

### Requirement: Per-project visual display flag
Each project SHALL carry an optional `visualDisplayEnabled` boolean field. When absent or `true`, the visual subsystem (media library, composition workspace, visual properties pane, audio→visual firing, player window access) SHALL be active. When `false`, the visual subsystem SHALL be inactive per the gating requirements in this spec.

#### Scenario: New project defaults to enabled
- **WHEN** a new project is created
- **THEN** `visualDisplayEnabled` SHALL be `true`

#### Scenario: Legacy project without field
- **GIVEN** a project file that does not contain `visualDisplayEnabled`
- **WHEN** the project is loaded
- **THEN** the runtime SHALL treat `visualDisplayEnabled` as `true`

#### Scenario: Flag persists with project
- **WHEN** the user toggles `visualDisplayEnabled` and saves the project
- **THEN** the saved `.lpa` file SHALL contain the new value
- **AND** reopening the project SHALL restore that value

### Requirement: Menu item controls the flag
The application menu SHALL provide a "View → Enable Visual Display" checkbox item. The checkbox SHALL reflect the active project's `visualDisplayEnabled` value. Clicking the item SHALL flip the flag on the active project.

#### Scenario: Menu checkbox reflects state
- **WHEN** the active project has `visualDisplayEnabled: true`
- **THEN** the "Enable Visual Display" menu item SHALL appear checked

#### Scenario: Click toggles the flag
- **WHEN** the user clicks the "Enable Visual Display" menu item
- **THEN** the active project's `visualDisplayEnabled` SHALL flip to the opposite value
- **AND** the menu SHALL be rebuilt to reflect the new state

#### Scenario: Switching projects updates the menu
- **WHEN** the user opens a different project with a different `visualDisplayEnabled` value
- **THEN** the menu item's checked state SHALL update to match the newly active project

### Requirement: Disabling preserves visual data
Toggling `visualDisplayEnabled` from `true` to `false` SHALL NOT modify, delete, or reset any visual media items, `linkedCueUuid` references, composition layers, or visual properties (link delay, fades).

#### Scenario: Data intact after disable
- **GIVEN** a project with visual media items, linked cues, and staged composition layers
- **WHEN** the user disables `visualDisplayEnabled`
- **THEN** all visual data SHALL remain unchanged in project state

#### Scenario: Re-enabling restores prior UI
- **GIVEN** a project that previously had staged composition layers and was disabled
- **WHEN** the user re-enables `visualDisplayEnabled`
- **THEN** the composition workspace SHALL render those layers as before
