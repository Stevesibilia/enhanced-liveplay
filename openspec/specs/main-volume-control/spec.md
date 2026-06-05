# main-volume-control Specification

## Purpose
TBD - created by archiving change fix-volume-controls. Update Purpose after archive.
## Requirements
### Requirement: Real-time volume application
The system SHALL apply volume changes to the active Howl instance immediately when the user adjusts the volume slider, without requiring stop/restart of playback.

#### Scenario: User adjusts volume while track is playing
- **WHEN** a track is playing AND the user changes the volume slider (in properties panel or inline control)
- **THEN** the audio output level changes immediately to match the new slider value

#### Scenario: User adjusts volume while track is ducked
- **WHEN** a track is playing AND currently ducked AND the user changes the volume
- **THEN** the active cue's `originalVolume` is updated so un-ducking restores the new user-set level

#### Scenario: User adjusts volume during a fade
- **WHEN** a track is playing with an active fade AND the user changes the volume
- **THEN** the fade is cancelled and volume is set to the user-specified value immediately

### Requirement: Inline volume control on playlist items
The system SHALL display a compact horizontal volume slider on each playlist item in the main interface.

#### Scenario: Volume slider displays current level
- **WHEN** a playlist item is visible in the main interface
- **THEN** the inline volume slider reflects the item's current volume value

#### Scenario: User adjusts inline volume slider
- **WHEN** the user drags the inline volume slider on a playlist item
- **THEN** the item's volume is updated AND if the item is currently playing the audio level changes in real time

### Requirement: Inline volume control on cart slots
The system SHALL display a compact horizontal volume slider on each cart slot in the main interface.

#### Scenario: Volume slider displays current level
- **WHEN** a cart slot contains an audio item
- **THEN** the inline volume slider reflects the item's current volume value

#### Scenario: User adjusts inline cart volume slider
- **WHEN** the user drags the inline volume slider on a cart slot
- **THEN** the item's volume is updated AND if the item is currently playing the audio level changes in real time

### Requirement: Bidirectional volume sync
The system SHALL keep the inline volume control and properties panel volume slider synchronized.

#### Scenario: Volume changed in properties panel
- **WHEN** the user changes volume in the properties panel
- **THEN** the inline volume control on the corresponding playlist item or cart slot updates to match

#### Scenario: Volume changed via inline control
- **WHEN** the user changes volume via the inline control
- **THEN** the properties panel volume slider updates to match (if that item is currently selected)

