## ADDED Requirements

### Requirement: Linked visuals suppressed when visuals disabled
When the active project's `visualDisplayEnabled` is `false`, audio cue playback SHALL NOT cause any linked visual to be displayed, revealed, or pushed to the player window. The audio cue itself SHALL play normally.

#### Scenario: Cue playback skips linked visual when disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **AND** an audio cue has a visual item linked to it via `linkedCueUuid`
- **WHEN** the audio cue is played
- **THEN** the audio SHALL play normally
- **AND** the linked visual SHALL NOT be revealed on the player window

#### Scenario: Visual Properties pane hidden when disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user opens a cart slot's properties
- **THEN** the Visual Properties pane SHALL NOT be shown

#### Scenario: Re-enabling restores linking behavior
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user re-enables `visualDisplayEnabled`
- **AND** subsequently plays an audio cue with a linked visual
- **THEN** the linked visual SHALL fire per its configured delay and fades
