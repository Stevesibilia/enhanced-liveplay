## ADDED Requirements

### Requirement: Fixed 16:9 player content area
The player window SHALL render layers onto a fixed 16:9 content area centered within the window, with a black letterbox filling any remaining space. Layer `x/y/width/height` percentages SHALL be interpreted relative to this content area, identical to the composition canvas, giving exact position and aspect-ratio parity between the workspace and the player output.

#### Scenario: Layout parity between workspace and player
- **GIVEN** a published composition laid out in the 16:9 composition canvas
- **WHEN** it is rendered in the player window
- **THEN** each layer SHALL appear at the same relative position and size as in the composition canvas

#### Scenario: Non-16:9 player window letterboxes content
- **GIVEN** the player window is sized or fullscreened to an aspect ratio other than 16:9
- **THEN** the content area SHALL remain 16:9, centered, with black bars filling the remainder
- **AND** layer positions SHALL stay consistent with the composition canvas

#### Scenario: 16:9 player window fills exactly
- **GIVEN** the player window is exactly 16:9
- **THEN** the content area SHALL fill the window with no visible letterbox bars

## MODIFIED Requirements

### Requirement: Image rendering
Images SHALL be displayed within their layer's bounding box on the fixed 16:9 content area, scaled to fit without cropping or distortion (object-fit: contain behavior). Because layer boxes are auto-fitted to image aspect ratio against a constant-aspect canvas, a correctly fitted layer SHALL show no black bands inside its box; the contain behavior remains as a safety net for any box whose aspect ratio differs from its image.

#### Scenario: Fitted layer shows no bands
- **GIVEN** a layer whose box has been auto-fitted to its image's aspect ratio
- **WHEN** it is rendered in the player content area
- **THEN** the image SHALL fill its box with no internal black bands

#### Scenario: Mismatched box still contains image
- **GIVEN** a layer whose box aspect ratio differs from its image
- **WHEN** it is rendered
- **THEN** the image SHALL be scaled to fit within the box without cropping or distortion (black bands where the box exceeds the image)
