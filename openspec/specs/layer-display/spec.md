## Purpose

Multi-layer composition workspace: drag or push image items from the media library as layers, free-position and resize them, and publish individual layers (or all of them) to the player window.
## Requirements
### Requirement: Supported layer media
For v1, only image media items SHALL be addable as layers. PDF media items remain in the library and are selectable, but cannot be added as layers (the push button and drag-drop SHALL be no-ops for PDFs).

#### Scenario: PDF push is a no-op
- **WHEN** the GM clicks the push button on a PDF media library item
- **THEN** no layer SHALL be created and the composition workspace SHALL remain unchanged

#### Scenario: PDF drag is a no-op
- **WHEN** the GM drags a PDF media library item into the composition workspace
- **THEN** no layer SHALL be created and the composition workspace SHALL remain unchanged

### Requirement: Add layer to composition
The system SHALL allow the GM to add an image media library item to the composition workspace as a new layer. Items can be added by clicking the push button on the item or by dragging it into the workspace. A newly added layer's bounding box SHALL be auto-fitted to the image's natural aspect ratio against the fixed 16:9 canvas, such that the bounding box hugs the image with no internal black bands, and this fit SHALL remain correct across panel and window resizes.

#### Scenario: Push button adds layer fitted to image
- **WHEN** the GM clicks the push button on an image media library item
- **THEN** a new layer SHALL appear centered on the canvas at a default width
- **AND** its bounding box SHALL be auto-fitted to the image's natural aspect ratio so the box hugs the image

#### Scenario: Drag item into workspace
- **WHEN** the GM drags an image media library item into the composition canvas
- **THEN** a new layer SHALL appear at the drop position, fitted to the image's aspect ratio

#### Scenario: Box stays fitted across resize
- **GIVEN** a layer whose box is fitted to its image
- **WHEN** the main window or the panel split is resized to any size
- **THEN** the bounding box SHALL continue to hug the image with no black bands appearing inside the box

#### Scenario: Add same item multiple times
- **WHEN** the GM pushes the same image media library item again
- **THEN** a new separate layer SHALL be created (not replacing the existing one)

### Requirement: Layer positioning
The system SHALL allow the GM to drag layers freely within the composition workspace to reposition them.

#### Scenario: Drag layer to new position
- **WHEN** the GM clicks and drags a layer within the workspace
- **THEN** the layer SHALL move to the new position and its x/y coordinates SHALL update

#### Scenario: Position persists
- **WHEN** a layer has been positioned
- **THEN** it SHALL remain at that position until explicitly moved again

### Requirement: Layer resizing
The system SHALL allow the GM to resize layers using drag handles on the selected layer.

#### Scenario: Resize via corner handle
- **WHEN** the GM drags a corner handle on a selected layer
- **THEN** the layer SHALL resize proportionally maintaining aspect ratio

#### Scenario: Resize via edge handle
- **WHEN** the GM drags an edge handle on a selected layer
- **THEN** the layer SHALL resize in that dimension only

### Requirement: Layer selection
The system SHALL allow the GM to select a layer by clicking on it. The selected layer SHALL show resize handles and action controls.

#### Scenario: Click to select
- **WHEN** the GM clicks on a layer in the workspace
- **THEN** that layer SHALL become selected and show resize handles

#### Scenario: Click workspace background deselects
- **WHEN** the GM clicks on empty space in the workspace
- **THEN** no layer SHALL be selected

### Requirement: Layer z-ordering
The system SHALL render layers in z-index order (higher z-index on top). The GM SHALL be able to change layer order.

#### Scenario: New layers on top
- **WHEN** a new layer is added
- **THEN** it SHALL have the highest z-index (appear on top)

#### Scenario: Bring to front
- **WHEN** the GM selects "Bring to Front" on a layer
- **THEN** that layer SHALL move to the highest z-index

#### Scenario: Send to back
- **WHEN** the GM selects "Send to Back" on a layer
- **THEN** that layer SHALL move to the lowest z-index

### Requirement: Layer publish/unpublish
Each layer SHALL have a published state. Only published layers are visible to players on the player window. Layers start as drafts (unpublished).

#### Scenario: New layer is draft
- **WHEN** a new layer is added to the composition
- **THEN** it SHALL be in draft (unpublished) state and NOT visible on the player window

#### Scenario: Publish a layer
- **WHEN** the GM publishes a draft layer
- **THEN** the layer SHALL become visible on the player window at its current position and size

#### Scenario: Unpublish a layer
- **WHEN** the GM unpublishes a published layer
- **THEN** the layer SHALL be removed from the player window but remain in the composition workspace

#### Scenario: Publish all
- **WHEN** the GM clicks "Publish All"
- **THEN** all draft layers SHALL become published and visible on the player window

### Requirement: Layer visual distinction
The composition workspace SHALL visually distinguish between draft and published layers.

#### Scenario: Draft layer appearance
- **WHEN** a layer is in draft state
- **THEN** it SHALL display with a dashed border and reduced opacity in the workspace

#### Scenario: Published layer appearance
- **WHEN** a layer is in published state
- **THEN** it SHALL display with a solid green border in the workspace

### Requirement: Remove layer
The system SHALL allow the GM to remove a layer from the composition entirely.

#### Scenario: Remove layer
- **WHEN** the GM removes a layer (delete key or remove button)
- **THEN** the layer SHALL be removed from both the composition workspace and the player window (if published)

### Requirement: Player multi-layer rendering
The player window SHALL render all published layers simultaneously with correct positioning, sizing, and z-ordering.

#### Scenario: Multiple layers displayed
- **WHEN** multiple layers are published
- **THEN** the player window SHALL display all of them at their specified positions and sizes

#### Scenario: Layer removed from player
- **WHEN** a layer is unpublished or removed
- **THEN** the player window SHALL immediately stop displaying that layer

#### Scenario: No published layers
- **WHEN** no layers are published (or all are removed)
- **THEN** the player window SHALL display black

### Requirement: Update published layers
When a published layer's position or size is changed in the composition workspace, the player window SHALL update to reflect the change.

#### Scenario: Move published layer
- **WHEN** the GM moves a published layer in the workspace
- **THEN** the player window SHALL update the layer position

#### Scenario: Resize published layer
- **WHEN** the GM resizes a published layer in the workspace
- **THEN** the player window SHALL update the layer size

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

### Requirement: Fixed 16:9 composition canvas
The composition workspace SHALL present a fixed 16:9 canvas as the coordinate origin for all layers. The canvas SHALL be centered and letterboxed within the available panel space (black bars on the sides or top/bottom as the panel aspect ratio requires). All layer `x`, `y`, `width`, and `height` percentages SHALL be interpreted relative to this 16:9 canvas, not the raw panel.

#### Scenario: Canvas letterboxed in a wide panel
- **GIVEN** the composition panel is wider than 16:9
- **THEN** the 16:9 canvas SHALL be centered horizontally with black bars on the left and right

#### Scenario: Canvas letterboxed in a tall panel
- **GIVEN** the composition panel is taller than 16:9
- **THEN** the 16:9 canvas SHALL be centered vertically with black bars on the top and bottom

#### Scenario: Layer coordinates relative to canvas
- **WHEN** a layer is positioned at given `x/y/width/height` percentages
- **THEN** the layer SHALL occupy that relative rectangle of the 16:9 canvas regardless of the panel's pixel size

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

