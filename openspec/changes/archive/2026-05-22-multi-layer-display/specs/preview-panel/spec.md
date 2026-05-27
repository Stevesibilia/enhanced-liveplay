## MODIFIED Requirements

### Requirement: Live content display
The live display area SHALL function as a composition workspace. Instead of showing a single live item, it SHALL display all layers (draft and published) and allow the GM to manipulate them.

#### Scenario: Workspace shows all layers
- **WHEN** layers exist in the composition
- **THEN** the workspace SHALL display all layers (drafts with dashed border, published with green border)

#### Scenario: Empty workspace
- **WHEN** no layers exist in the composition
- **THEN** the workspace SHALL show a placeholder indicating items can be dragged or pushed here

### Requirement: Push to live
Pushing an item from the media library SHALL add it as a new draft layer in the composition workspace instead of replacing the live content.

#### Scenario: Push adds draft layer
- **WHEN** the user clicks the push button on a media library item
- **THEN** a new draft layer SHALL appear in the composition workspace (not directly on the player)

### Requirement: Black button
The Black button SHALL unpublish all layers and clear the player window.

#### Scenario: Click black
- **WHEN** the user clicks the Black button
- **THEN** all layers SHALL become unpublished and the player window SHALL show black
