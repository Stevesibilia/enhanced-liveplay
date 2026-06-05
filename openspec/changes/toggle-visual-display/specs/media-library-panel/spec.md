## ADDED Requirements

### Requirement: Media tab hidden when visuals disabled
The Media tab in the main workspace SHALL only be visible when the active project's `visualDisplayEnabled` is `true`. When `false`, the Media tab SHALL be hidden and the Audio view SHALL remain active.

#### Scenario: Media tab hidden while visuals disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the main workspace renders
- **THEN** the Media tab SHALL NOT be visible

#### Scenario: Switching back to Audio when visuals disabled mid-session
- **GIVEN** the user is currently viewing the Media tab
- **WHEN** the user disables `visualDisplayEnabled`
- **THEN** the workspace SHALL switch to the Audio view
- **AND** the Media tab SHALL be hidden

#### Scenario: Media tab reappears on re-enable
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user re-enables `visualDisplayEnabled`
- **THEN** the Media tab SHALL reappear in its previous position
