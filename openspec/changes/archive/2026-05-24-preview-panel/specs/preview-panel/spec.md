## ADDED Requirements

### Requirement: Preview panel always visible
The preview panel SHALL be visible in the main window regardless of which tab (Audio or Media) is active. It SHALL occupy the right side of the workspace.

#### Scenario: Switch tabs with preview visible
- **WHEN** the user switches between Audio and Media tabs
- **THEN** the preview panel SHALL remain visible and unchanged

### Requirement: Staged content display
The preview panel SHALL display the currently staged visual media item. When an item is selected from the media library, it SHALL appear in the staged area as a preview (image rendered, PDF showing current page).

#### Scenario: Image selected and staged
- **WHEN** the user selects an image from the media library
- **THEN** the staged area SHALL display that image scaled to fit

#### Scenario: PDF selected and staged
- **WHEN** the user selects a PDF from the media library
- **THEN** the staged area SHALL display the first page of the PDF

#### Scenario: Nothing staged
- **WHEN** no item has been selected
- **THEN** the staged area SHALL show a placeholder indicating no content is staged

### Requirement: Live content indicator
The preview panel SHALL display a small thumbnail showing what is currently live on the player window. This indicates the player-visible state.

#### Scenario: Content is live
- **WHEN** content has been pushed to the player window
- **THEN** the live indicator SHALL show a thumbnail of that content

#### Scenario: Player is black
- **WHEN** the player window is showing black
- **THEN** the live indicator SHALL show a black thumbnail with a "No Display" label

### Requirement: Push to live
A "Push" button SHALL send the currently staged content to the player window. This SHALL update the live state and send the display command via IPC.

#### Scenario: Push staged image
- **WHEN** the user clicks Push with an image staged
- **THEN** the live indicator SHALL update to show that image and the player window SHALL display it

#### Scenario: Push with no content staged
- **WHEN** the user clicks Push with nothing staged
- **THEN** nothing SHALL happen (button disabled or no-op)

#### Scenario: Push when player window not open
- **WHEN** the user clicks Push but player window is not open
- **THEN** the live state SHALL still update (player window will show it when opened)

### Requirement: Black button
A "Black" button SHALL set the player window to black screen and update the live indicator to show the black state.

#### Scenario: Click black
- **WHEN** the user clicks the Black button
- **THEN** the player window SHALL show black and the live indicator SHALL show "No Display"

### Requirement: PDF page navigation
When a PDF is staged, the preview panel SHALL show page navigation controls (previous page, next page, current page indicator). Changing pages SHALL update the staged view.

#### Scenario: Navigate to next page
- **WHEN** a PDF is staged and the user clicks next page
- **THEN** the staged view SHALL display the next page

#### Scenario: Navigate past last page
- **WHEN** the user is on the last page and clicks next
- **THEN** the page SHALL not change (button disabled or no-op)

### Requirement: Resizable panel width
The preview panel SHALL be resizable horizontally using a drag handle, consistent with existing resizable panels in the application.

#### Scenario: Resize preview panel
- **WHEN** the user drags the panel resize handle
- **THEN** the panel width SHALL adjust and content SHALL reflow accordingly
