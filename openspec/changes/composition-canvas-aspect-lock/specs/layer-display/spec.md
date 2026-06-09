## ADDED Requirements

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

## MODIFIED Requirements

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
