## ADDED Requirements

### Requirement: Player window auto-closes on visuals disable
When the active project's `visualDisplayEnabled` transitions from `true` to `false`, any open player window SHALL be closed immediately. Any in-flight display state (fades, timed reveals) SHALL be cancelled by the close.

#### Scenario: Player window closes on disable
- **GIVEN** the player window is open and showing content
- **WHEN** the user disables `visualDisplayEnabled`
- **THEN** the player window SHALL be closed
- **AND** any in-flight visual transitions SHALL be cancelled

#### Scenario: No player window open during disable
- **GIVEN** the player window is not open
- **WHEN** the user disables `visualDisplayEnabled`
- **THEN** the disable SHALL succeed with no error

### Requirement: Player window menu item disabled while visuals disabled
The "Open/Close Player Window" menu item (and its `CmdOrCtrl+P` accelerator) SHALL be disabled (greyed out, non-actionable) while the active project's `visualDisplayEnabled` is `false`. The accelerator press SHALL have no effect.

#### Scenario: Menu item greyed while disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user opens the View menu
- **THEN** the "Open/Close Player Window" item SHALL appear disabled

#### Scenario: Accelerator no-op while disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user presses `CmdOrCtrl+P`
- **THEN** no player window SHALL open
- **AND** no error or notification SHALL appear

#### Scenario: Menu item re-enabled on flag-on
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user re-enables `visualDisplayEnabled`
- **THEN** the "Open/Close Player Window" item SHALL become enabled
- **AND** `CmdOrCtrl+P` SHALL again open the player window
