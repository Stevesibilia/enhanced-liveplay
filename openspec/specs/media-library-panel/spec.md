## Purpose

The media library panel provides a tabbed Media view alongside the existing Audio view, letting users browse, import, organize, and select visual media items for use in compositions.
## Requirements
### Requirement: Tab navigation between Audio and Media
The main workspace SHALL provide tab-based navigation between an Audio view (existing) and a Media Library view. Switching tabs SHALL NOT interrupt audio playback.

#### Scenario: Switch to Media tab
- **WHEN** the user clicks the Media tab
- **THEN** the media library panel SHALL be displayed and audio playlist hidden
- **AND** any currently playing audio SHALL continue uninterrupted

#### Scenario: Switch back to Audio tab
- **WHEN** the user clicks the Audio tab from Media view
- **THEN** the audio playlist SHALL be displayed and media library hidden

### Requirement: Folder navigation
The media library SHALL display a folder list showing all user-created folders plus an "Unfiled" section. Selecting a folder SHALL filter the grid to show only items in that folder. Selecting "All" SHALL show all items.

#### Scenario: Select a folder
- **WHEN** the user clicks folder "Maps"
- **THEN** only visual media items with folder "Maps" SHALL be displayed in the grid

#### Scenario: View unfiled items
- **WHEN** the user clicks "Unfiled"
- **THEN** only items with no folder assignment SHALL be displayed

### Requirement: Thumbnail grid display
Visual media items SHALL be displayed as a grid of fixed-size thumbnail cells. Images SHALL show a scaled preview. PDFs SHALL show a generic PDF icon with the filename below.

#### Scenario: Image item in grid
- **WHEN** an image media item exists
- **THEN** it SHALL be displayed as a thumbnail preview with its displayName below

#### Scenario: PDF item in grid
- **WHEN** a PDF media item exists
- **THEN** it SHALL be displayed with a PDF icon and its displayName below

### Requirement: Import via drag-and-drop
Users SHALL be able to import visual media by dragging files from the OS file manager onto the media library panel. Only supported file types SHALL be accepted. Multiple files SHALL be importable in one operation.

#### Scenario: Drag valid image files onto panel
- **WHEN** the user drops .jpg and .png files onto the media library panel
- **THEN** each file SHALL be imported into the project and appear in the grid

#### Scenario: Drag unsupported file type
- **WHEN** the user drops a .docx file onto the media library panel
- **THEN** the file SHALL be rejected and an error message displayed

### Requirement: Import via file picker
Users SHALL be able to import visual media via a file picker dialog that supports multi-select. The dialog SHALL filter to show only supported file types.

#### Scenario: Import via file picker
- **WHEN** the user clicks the import button and selects files in the dialog
- **THEN** selected files SHALL be imported into the project and appear in the grid

### Requirement: Folder management
Users SHALL be able to create new folders, rename existing folders, and delete folders. Deleting a folder SHALL move its items to unfiled (not delete them).

#### Scenario: Create folder
- **WHEN** the user creates a folder named "Battle Maps"
- **THEN** "Battle Maps" SHALL appear in the folder list

#### Scenario: Delete folder with items
- **WHEN** the user deletes a folder containing items
- **THEN** the folder SHALL be removed and its items SHALL become unfiled

### Requirement: Item operations
Users SHALL be able to rename items, move items to a different folder, and delete items (with confirmation). Deleting an item SHALL remove it from the project and optionally from disk.

#### Scenario: Rename item
- **WHEN** the user renames a media item to "Cave Entrance"
- **THEN** the item's displayName SHALL be updated to "Cave Entrance"

#### Scenario: Delete item with confirmation
- **WHEN** the user deletes a media item and confirms the dialog
- **THEN** the item SHALL be removed from project.visualMedia and its file deleted from disk

### Requirement: Item selection emits event
Clicking a media item in the grid SHALL emit a selection event that other components (preview panel) can consume. The selected item SHALL be visually highlighted.

#### Scenario: Click item to select
- **WHEN** the user clicks a media item in the grid
- **THEN** that item SHALL be visually highlighted and a selection event emitted with the item's data

### Requirement: Media tab hidden when visuals disabled
The Media tab in the main workspace SHALL only be visible when the active project's `visualDisplayEnabled` is `true`. When `false`, the Media tab SHALL be hidden and the Audio view SHALL remain active.

#### Scenario: Media tab hidden while visuals disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the main workspace renders
- **THEN** the Media tab SHALL NOT be visible

#### Scenario: Switching back to Audio when visuals disabled mid-session
- **GIVEN** the user is currently viewing the Media tab
- **WHEN** the user disables `visualDisplayEnabled`
- **THEN** the workspace SHALL switch to the Audio view
- **AND** the Media tab SHALL be hidden

#### Scenario: Media tab reappears on re-enable
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user re-enables `visualDisplayEnabled`
- **THEN** the Media tab SHALL reappear in its previous position

