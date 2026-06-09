## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Item selection emits event
Selecting a single item (plain click) SHALL surface that item as the active item for downstream panels (e.g. the properties pane), preserving existing single-selection behavior. Multi-selection (via modifier keys) SHALL drive group drag operations but SHALL NOT change which single item downstream panels treat as active beyond the most recently clicked item.

#### Scenario: Single selection drives properties
- **WHEN** the GM plain-clicks one item
- **THEN** that item SHALL be surfaced as the active item for the properties pane

#### Scenario: Multi-selection does not break single-item consumers
- **GIVEN** multiple items are selected via modifier keys
- **WHEN** a downstream panel reads the active item
- **THEN** it SHALL receive the most recently clicked item, not an error
