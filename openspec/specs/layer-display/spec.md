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
The system SHALL allow the GM to add an image media library item to the composition workspace as a new layer. Items can be added by clicking the push button on the item or by dragging it into the workspace.

#### Scenario: Push button adds layer
- **WHEN** the GM clicks the push button on an image media library item
- **THEN** a new layer SHALL appear in the composition workspace with that item, positioned at center, at a default size (50% width, then auto-fitted to the image's natural aspect ratio once loaded)

#### Scenario: Drag item into workspace
- **WHEN** the GM drags an image media library item into the composition workspace
- **THEN** a new layer SHALL appear at the drop position with a default size

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
The system SHALL provide a "Black" button that unpublishes all layers and shows a black screen on the player.

#### Scenario: Black button
- **WHEN** the GM clicks the Black button
- **THEN** all layers SHALL become unpublished and the player window SHALL display black
