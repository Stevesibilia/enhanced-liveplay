## ADDED Requirements

### Requirement: Calm-by-default emphasis hierarchy

The main workspace SHALL be visually calm at rest: list rows, chrome, and idle controls use normal font weight and neutral colors. Visual emphasis (accent color, heavier weight, indicator bars) SHALL be reserved for live state — the playing row, paused/armed indicators, active meters, and destructive controls.

#### Scenario: Idle playlist does not shout
- **WHEN** no cue is playing
- **THEN** playlist rows render at normal weight and body size with neutral text colors, with no accent-colored elements in the list

#### Scenario: Playing row is the loudest element
- **WHEN** a cue is playing
- **THEN** its row carries the strongest visual emphasis in the list (accent indicator and heavier name weight), and no idle element competes with it

### Requirement: The clock is quiet chrome

The header clock SHALL render as plain text in a secondary text color and regular weight, with tabular numerals, and SHALL NOT use accent color, borders, boxes, or glow effects.

#### Scenario: Clock at a glance
- **WHEN** the main window is shown
- **THEN** the clock is readable but visually quieter than the project title and all live-state indicators

### Requirement: Restyle directions are approved before implementation

Visual redesigns SHALL be proposed as static mockups (HTML plus PNG screenshots, outside the app build) and SHALL NOT be applied to application code until the user records an approved direction.

#### Scenario: Gate blocks implementation
- **WHEN** mockups exist but no direction is recorded as chosen in the change's design document
- **THEN** no application style changes for the restyle are made

#### Scenario: Pick recorded, implementation proceeds
- **WHEN** the user records a chosen direction (or combination)
- **THEN** implementation applies that direction through the token system
