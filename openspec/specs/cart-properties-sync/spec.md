# cart-properties-sync Specification

## Purpose
TBD - created by archiving change sync-properties-pane-with-cart-click. Update Purpose after archive.
## Requirements
### Requirement: Cart click syncs properties pane when pane is open

When the properties pane is open (i.e. `selectedItem` is non-null), a bare click on a populated cart slot SHALL update `selectedItem` to that cart's audio item in addition to triggering playback. When the properties pane is closed, the click SHALL trigger playback only and SHALL NOT mutate selection state.

#### Scenario: Properties pane is open, user clicks a populated cart slot
- **WHEN** `selectedItem` is non-null and the user clicks the body of a populated cart slot
- **THEN** the cart's audio item is played (existing behavior preserved)
- **AND** `selectedItem` is set to that cart's audio item
- **AND** the properties pane re-renders to display the cart item's properties

#### Scenario: Properties pane is closed, user clicks a populated cart slot
- **WHEN** `selectedItem` is null and the user clicks the body of a populated cart slot
- **THEN** the cart's audio item is played
- **AND** `selectedItem` remains null
- **AND** the properties pane does not open

#### Scenario: User clicks an empty cart slot
- **WHEN** the user clicks an empty cart slot
- **THEN** the import dialog is opened (existing behavior preserved)
- **AND** `selectedItem` is not mutated by this click

### Requirement: Cart click selection clears prior multi-selection

When a cart click syncs the properties pane, the selection update SHALL mirror the existing gear-button (`handleEdit`) behavior: the `selectedItems` Set MUST be cleared and the cart item's uuid MUST be the sole entry. This prevents stale playlist multi-selection from coexisting with a cart shown in the pane.

#### Scenario: User has multi-selected playlist items, then clicks a cart with pane open
- **WHEN** `selectedItems` contains multiple playlist uuids and the properties pane is open
- **AND** the user clicks a populated cart slot
- **THEN** `selectedItems` is cleared and contains only the cart item's uuid
- **AND** `selectedItem` is the cart's audio item

### Requirement: MIDI and keyboard cart triggers sync the pane when open

Cart triggers fired by MIDI input or keyboard hotkeys SHALL update `selectedItem` to the triggered cart's audio item when the properties pane is already open, mirroring the click-sync behavior. When the pane is closed, MIDI and keyboard triggers SHALL NOT mutate selection. Toggle-off (stop) actions on an already-playing cart SHALL NOT sync the pane — only the play branch syncs.

#### Scenario: User triggers a cart via MIDI while pane is open
- **WHEN** the properties pane is open
- **AND** the user fires a cart slot via a MIDI `trigger-slot-*` action that starts playback
- **THEN** the cart's audio item is played
- **AND** `selectedItem` is set to that cart's audio item
- **AND** `selectedItems` is cleared and contains only that cart's uuid

#### Scenario: User triggers a cart via keyboard hotkey while pane is open
- **WHEN** the properties pane is open
- **AND** the user presses a keyboard hotkey mapped to a cart slot that starts playback
- **THEN** the cart's audio item is played
- **AND** `selectedItem` is set to that cart's audio item

#### Scenario: User triggers a cart via MIDI or keyboard while pane is closed
- **WHEN** `selectedItem` is null and the user fires a cart via MIDI or keyboard
- **THEN** the cart's audio item is played
- **AND** `selectedItem` remains null

#### Scenario: User toggles off an active cart via MIDI or keyboard
- **WHEN** a cart is already playing and the user fires the same MIDI or keyboard trigger
- **THEN** the cart is stopped (existing toggle behavior preserved)
- **AND** `selectedItem` is unchanged (no sync on the stop branch)

