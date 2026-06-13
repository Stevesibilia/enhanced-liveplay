## MODIFIED Requirements

### Requirement: Layer z-ordering
The system SHALL render layers in z-index order (higher z-index on top) in both the composition workspace and the player window. The GM SHALL be able to change layer order. Selection styling in the workspace (outline, handles) SHALL NOT alter a layer's effective stacking — a selected layer SHALL render at its own z-index, not forced above other layers.

#### Scenario: New layers on top
- **WHEN** a new layer is added
- **THEN** it SHALL have the highest z-index (appear on top)

#### Scenario: Bring to front
- **WHEN** the GM selects "Bring to Front" on a layer
- **THEN** that layer SHALL move to the highest z-index
- **AND** the workspace SHALL immediately show it above the other layers even while it remains selected

#### Scenario: Send to back
- **WHEN** the GM selects "Send to Back" on a layer
- **THEN** that layer SHALL move to the lowest z-index
- **AND** the workspace SHALL immediately show it below the other layers even while it remains selected

#### Scenario: Selection does not change stacking
- **GIVEN** a layer ordered below one or more other layers
- **WHEN** the GM selects it
- **THEN** it SHALL stay ordered below those layers in the workspace
- **AND** its selection outline and handles SHALL remain visible

#### Scenario: Reorder updates the player
- **GIVEN** a published layer
- **WHEN** the GM uses "Bring to Front" or "Send to Back"
- **THEN** the player window SHALL restack the layer to match its new z-index

### Requirement: Background layer role
The system SHALL allow a layer to be marked as a background. When a layer becomes a background its current bounding box SHALL be remembered, and it SHALL be forced to full-screen (`x=0, y=0, width=100, height=100`) and ordered behind all non-background layers in both the workspace and the player. While a layer is a background it SHALL NOT be movable or resizable. At most one background layer SHALL be active at a time; marking a layer as background SHALL retire the previously-marked background by clearing its background role, restoring its remembered box, unpublishing it, and returning it to a normal movable and resizable layer so it does not cover the new backdrop. Un-marking a background layer SHALL restore its remembered box and return it to a normal movable and resizable layer.

#### Scenario: Mark layer as background
- **WHEN** the GM marks a layer as background
- **THEN** the layer SHALL snap to full-screen and be ordered behind all other layers in the workspace and the player
- **AND** its move and resize affordances SHALL be disabled

#### Scenario: Single background invariant
- **GIVEN** a layer is already marked as background
- **WHEN** the GM marks a different layer as background
- **THEN** the first layer SHALL revert to a normal layer and SHALL be unpublished
- **AND** only the newly-marked layer SHALL be the background
- **AND** the new background SHALL be visible behind the other layers, not covered by the previous background

#### Scenario: Negative z-index layers remain visible
- **GIVEN** a layer with a negative z-index (e.g. a replaced background or a repeatedly sent-to-back layer)
- **WHEN** it is rendered in the composition workspace and the player window
- **THEN** it SHALL be visible above the canvas black fill, not hidden behind it

#### Scenario: Unmark background
- **GIVEN** a layer is a background
- **WHEN** the GM unmarks it
- **THEN** it SHALL become a normal layer that can be moved and resized
- **AND** it SHALL be restored to the bounding box it had before being marked as background (not left full-screen)
