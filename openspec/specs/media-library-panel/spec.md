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
Selecting a single item (plain click) SHALL surface that item as the active item for downstream panels (e.g. the properties pane), preserving existing single-selection behavior. Multi-selection (via modifier keys) SHALL drive group drag operations but SHALL NOT change which single item downstream panels treat as active beyond the most recently clicked item.

#### Scenario: Single selection drives properties
- **WHEN** the GM plain-clicks one item
- **THEN** that item SHALL be surfaced as the active item for the properties pane

#### Scenario: Multi-selection does not break single-item consumers
- **GIVEN** multiple items are selected via modifier keys
- **WHEN** a downstream panel reads the active item
- **THEN** it SHALL receive the most recently clicked item, not an error

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

### Requirement: Multi-selection of media items
The media library SHALL support selecting multiple items. `Ctrl/Cmd+click` SHALL toggle an item's membership in the selection. `Shift+click` SHALL select the contiguous range between the selection anchor and the clicked item over the currently displayed item order. A plain click (no modifier) SHALL select exactly one item.

#### Scenario: Plain click selects one
- **WHEN** the GM clicks an item with no modifier key
- **THEN** only that item SHALL be selected and it SHALL become the selection anchor

#### Scenario: Ctrl/Cmd click toggles
- **GIVEN** one or more items are selected
- **WHEN** the GM `Ctrl/Cmd+click`s an item
- **THEN** that item's selection state SHALL toggle while other selected items remain selected

#### Scenario: Shift click selects a range
- **GIVEN** an item is the selection anchor
- **WHEN** the GM `Shift+click`s another item
- **THEN** all items between the anchor and the clicked item (inclusive, in display order) SHALL be selected

### Requirement: Group drag of selected items
Dragging an item that is part of the current selection SHALL drag the entire selection. Dragging an item that is not selected SHALL select only that item and drag just it. The drag SHALL carry the set of dragged media UUIDs.

#### Scenario: Dragging a selected item drags the group
- **GIVEN** several items are selected
- **WHEN** the GM starts dragging one of the selected items
- **THEN** the drag payload SHALL contain all selected item UUIDs

#### Scenario: Dragging an unselected item drags only it
- **GIVEN** an item that is not part of the current selection
- **WHEN** the GM starts dragging it
- **THEN** that item SHALL become the sole selection and the drag payload SHALL contain only its UUID

### Requirement: Drop selection onto a folder moves items
A folder in the folder sidebar SHALL be a drop target for dragged media items. Dropping a selection onto a folder SHALL move every dragged item into that folder by setting each item's folder. Dropping onto the "Unfiled" target SHALL clear each item's folder.

#### Scenario: Move group into a folder
- **GIVEN** a multi-item selection is being dragged
- **WHEN** it is dropped onto a folder in the sidebar
- **THEN** every dragged item's folder SHALL be set to that folder

#### Scenario: Move group to unfiled
- **WHEN** a dragged selection is dropped onto the "Unfiled" target
- **THEN** every dragged item's folder SHALL be cleared

