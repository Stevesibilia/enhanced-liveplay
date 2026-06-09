# visual-audio-linking Specification

## Purpose
TBD - created by archiving change visual-audio-linking. Update Purpose after archive.
## Requirements
### Requirement: Visual Properties pane
The media tab SHALL provide a Visual Properties pane, opened from the cog button on each media library item. The pane SHALL allow editing the visual's display name, linked audio cue, link delay, and fade-in / fade-out durations.

#### Scenario: Open properties pane
- **WHEN** the user clicks the cog button on a visual media item
- **THEN** the Visual Properties pane SHALL display, populated with that item's current values

#### Scenario: Rename a visual
- **WHEN** the user edits the `displayName` field and commits the change
- **THEN** the visual item's `displayName` SHALL be persisted and reflected in the grid

#### Scenario: Edit delay and fades
- **WHEN** the user changes `linkDelay`, `fadeIn`, or `fadeOut` in the pane
- **THEN** the new values SHALL be persisted on the visual media item

### Requirement: Link assignment
The Visual Properties pane SHALL allow the user to assign, change, or clear the linked audio cue on a visual item.

#### Scenario: Link a cue
- **WHEN** the user opens the cue picker from the properties pane and selects a cue
- **THEN** the visual item's `linkedCueUuid` SHALL be set to that cue's UUID and the cue's display name SHALL appear in the pane

#### Scenario: Clear linked cue
- **WHEN** the user clicks Clear in the linked-audio field
- **THEN** the visual item's `linkedCueUuid` SHALL be set to null/undefined

#### Scenario: Linked cue was deleted
- **WHEN** the linked audio cue no longer exists in the project
- **THEN** the properties pane SHALL indicate the cue is missing and offer a Clear action

### Requirement: Cue picker component
A cue picker modal SHALL allow the user to browse and select from all available audio cues in the project. The picker SHALL support search/filter by name.

#### Scenario: Open cue picker
- **WHEN** the user clicks Link or Change on the linked-audio field
- **THEN** a modal SHALL open listing all audio items with a search field

#### Scenario: Search and select cue
- **WHEN** the user types a search term and clicks an audio item
- **THEN** the selected cue's UUID SHALL be assigned as the visual item's `linkedCueUuid` and the modal SHALL close

### Requirement: Link delay (signed offset, push-only)
A visual SHALL support a signed `linkDelay` in seconds controlling the relative timing of its audio trigger and visual reveal on push. `linkDelay` SHALL apply ONLY on push; triggering the linked cue stand-alone from the audio tab and unpublishing the visual SHALL ignore it.

#### Scenario: Zero delay
- **WHEN** a visual with `linkedCueUuid` and `linkDelay = 0` is pushed
- **THEN** the audio cue SHALL be triggered and the visual SHALL be revealed simultaneously

#### Scenario: Positive delay (audio first)
- **WHEN** a visual with `linkDelay > 0` is pushed
- **THEN** the audio cue SHALL be triggered immediately and the visual SHALL be revealed after `linkDelay` seconds

#### Scenario: Negative delay (visual first)
- **WHEN** a visual with `linkDelay < 0` is pushed
- **THEN** the visual SHALL be revealed immediately and the audio cue SHALL be triggered after `|linkDelay|` seconds

#### Scenario: Stand-alone cue playback ignores delay
- **WHEN** the linked audio cue is triggered directly from the audio tab (not via a visual push)
- **THEN** `linkDelay` SHALL NOT apply and the cue SHALL play immediately per its own behavior

#### Scenario: Pending action cancelled on re-push or unpublish
- **WHEN** a delayed audio trigger or visual reveal is pending
- **AND** a new push or unpublish occurs
- **THEN** the pending action SHALL be cancelled before the new action is applied

### Requirement: Visual fade-in / fade-out
A visual SHALL support `fadeIn` and `fadeOut` durations in seconds. The player SHALL apply an opacity transition of that duration when the visual is revealed or unpublished.

#### Scenario: Fade-in on push
- **WHEN** a visual with `fadeIn > 0` is pushed live
- **THEN** the player SHALL transition the visual's opacity from 0 to 1 over `fadeIn` seconds

#### Scenario: Fade-out on unpublish
- **WHEN** a live visual with `fadeOut > 0` is unpublished
- **THEN** the player SHALL transition the visual's opacity from 1 to 0 over `fadeOut` seconds before removal

#### Scenario: Zero duration is instant
- **WHEN** `fadeIn` or `fadeOut` is `0` (or unset)
- **THEN** the corresponding transition SHALL be instantaneous (matching current behavior)

### Requirement: Auto-trigger on push
When a visual item with a `linkedCueUuid` is pushed live, the system SHALL trigger the linked audio cue via the existing `playCue` mechanism, honoring `linkDelay`.

#### Scenario: Push with linked cue
- **WHEN** a visual item with a valid `linkedCueUuid` is pushed
- **THEN** the referenced audio cue SHALL be triggered (with start/ducking behavior applied) per the configured delay

#### Scenario: Push without linked cue
- **WHEN** a visual item without `linkedCueUuid` is pushed
- **THEN** no audio action SHALL occur

#### Scenario: Push with stale linked cue
- **WHEN** a visual item's `linkedCueUuid` references a non-existent audio item
- **THEN** the visual SHALL still be displayed but no audio SHALL be triggered

### Requirement: Visual indicator on linked items
Visual media items in the media library grid that have a linked audio cue SHALL display a music-note badge icon on their thumbnail.

#### Scenario: Item with linked cue in grid
- **WHEN** a visual media item has a non-null `linkedCueUuid`
- **THEN** its thumbnail in the media library grid SHALL show a music-note badge

#### Scenario: Item without linked cue in grid
- **WHEN** a visual media item has no `linkedCueUuid`
- **THEN** its thumbnail SHALL not show a music-note badge

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

