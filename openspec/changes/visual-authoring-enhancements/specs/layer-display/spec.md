## ADDED Requirements

### Requirement: Background layer role
The system SHALL allow a layer to be marked as a background. A background layer SHALL be forced to full-screen (`x=0, y=0, width=100, height=100`) and SHALL be ordered behind all non-background layers. While a layer is a background it SHALL NOT be movable or resizable. At most one background layer SHALL be active at a time; marking a layer as background SHALL clear the background role of any previously-marked layer. Un-marking a background layer SHALL return it to a normal movable and resizable layer.

#### Scenario: Mark layer as background
- **WHEN** the GM marks a layer as background
- **THEN** the layer SHALL snap to full-screen and be ordered behind all other layers
- **AND** its move and resize affordances SHALL be disabled

#### Scenario: Single background invariant
- **GIVEN** a layer is already marked as background
- **WHEN** the GM marks a different layer as background
- **THEN** the first layer SHALL revert to a normal layer
- **AND** only the newly-marked layer SHALL be the background

#### Scenario: Unmark background
- **GIVEN** a layer is a background
- **WHEN** the GM unmarks it
- **THEN** it SHALL become a normal layer that can be moved and resized

### Requirement: Group add on drop
Dropping a multi-item selection from the media library onto the composition SHALL add every dragged image as a new layer, offset so the layers do not perfectly overlap. Non-image items in the dropped selection SHALL be skipped.

#### Scenario: Drop multiple images
- **WHEN** the GM drops a selection of several image items onto the composition
- **THEN** a new layer SHALL be created for each image, cascaded so they do not exactly overlap

#### Scenario: PDFs in dropped selection are skipped
- **GIVEN** a dropped selection containing both images and PDFs
- **WHEN** it is dropped onto the composition
- **THEN** layers SHALL be created only for the image items

## MODIFIED Requirements

### Requirement: Black all
The system SHALL provide a "Black" button that unpublishes all non-background layers and shows only the background (if any) on the player. Background layers SHALL remain published when the Black button is pressed.

#### Scenario: Black button with no background
- **GIVEN** no layer is marked as background
- **WHEN** the GM clicks the Black button
- **THEN** all layers SHALL become unpublished and the player window SHALL display black

#### Scenario: Black button preserves background
- **GIVEN** a layer is marked as background and published
- **WHEN** the GM clicks the Black button
- **THEN** all non-background layers SHALL become unpublished
- **AND** the background layer SHALL remain published and visible on the player
