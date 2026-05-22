## ADDED Requirements

### Requirement: Link assignment UI
The preview panel SHALL display a "Linked Audio" section when a visual item is staged, showing the linked cue name or "None". A button SHALL allow picking, changing, or clearing the linked cue.

#### Scenario: View linked cue in preview
- **WHEN** a visual item with a linked cue is staged
- **THEN** the preview panel SHALL display the linked cue's displayName in the "Linked Audio" section

#### Scenario: View unlinked item
- **WHEN** a visual item without a linked cue is staged
- **THEN** the preview panel SHALL display "None" in the "Linked Audio" section with a "Link" button

#### Scenario: Clear linked cue
- **WHEN** the user clicks "Clear" on the linked audio section
- **THEN** the item's linkedCueUuid SHALL be set to null

### Requirement: Cue picker component
A cue picker modal SHALL allow the user to browse and select from all available audio cues in the project. The picker SHALL support search/filter by name.

#### Scenario: Open cue picker
- **WHEN** the user clicks "Link" or "Change" on the linked audio section
- **THEN** a modal SHALL open listing all audio items with a search field

#### Scenario: Search and select cue
- **WHEN** the user types a search term and clicks an audio item
- **THEN** the selected cue's UUID SHALL be set as the visual item's linkedCueUuid and the modal SHALL close

### Requirement: Auto-trigger on push
When a visual item with a linkedCueUuid is pushed live, the system SHALL automatically trigger the linked audio cue using the existing playCue mechanism.

#### Scenario: Push visual with linked cue
- **WHEN** a visual item with linkedCueUuid is pushed to live
- **THEN** the referenced audio cue SHALL be triggered (play started, ducking/start behavior applied)

#### Scenario: Push visual without linked cue
- **WHEN** a visual item without linkedCueUuid is pushed to live
- **THEN** no audio action SHALL occur

#### Scenario: Push visual with stale linked cue
- **WHEN** a visual item's linkedCueUuid references a non-existent audio item and is pushed
- **THEN** the push SHALL proceed (visual displayed) but no audio SHALL be triggered

### Requirement: Visual indicator on linked items
Visual media items in the media library grid that have a linked audio cue SHALL display a music-note badge icon on their thumbnail.

#### Scenario: Item with linked cue in grid
- **WHEN** a visual media item has a non-null linkedCueUuid
- **THEN** its thumbnail in the media library grid SHALL show a music-note badge

#### Scenario: Item without linked cue in grid
- **WHEN** a visual media item has no linkedCueUuid
- **THEN** its thumbnail SHALL not show a music-note badge
