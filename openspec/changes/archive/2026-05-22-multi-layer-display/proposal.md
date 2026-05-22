## Why

The GM needs to display multiple visual items simultaneously on the player window — e.g., a battle map with character tokens overlaid, or a background with floating text. Currently the player only shows one item at a time. Multi-layer display with free positioning lets the GM compose scenes visually, previewing the composition before publishing to players.

## What Changes

- Live area becomes a composition workspace: GM drags/pushes items from media library into it
- Items in the composition are **local-only** (not visible to players) until explicitly published
- Each item in the composition can be dragged, resized, and repositioned freely
- "Publish" button sends the entire composition (or individual layers) to the player window
- Published items can be unpublished (removed from player but kept in composition), moved, or resized
- Player window renders all published layers as a positioned stack
- `DisplayState` becomes an array of layer objects (each with position, size, z-index, publish state)
- **BREAKING**: `DisplayState` type changes from single object to array of layers

## Capabilities

### New Capabilities
- `layer-display`: Multi-layer composition workspace with draft/published states, free positioning, sizing, and z-ordering. Drag from library to composition, manipulate locally, then publish to player.

### Modified Capabilities
- `preview-panel`: Live display area becomes the composition workspace where GM stages, arranges, and publishes layers

## Impact

- `app/types/ipc.ts` — `DisplayState` interface redesign (array of positioned layers)
- `electron/player.html` — multi-layer rendering engine (CSS absolute positioning)
- `electron/main.js` — `push-to-player` handler updated for layer sync (full state push of published layers)
- `app/components/LiveDisplayPanel.vue` — becomes composition workspace with drag-to-add, drag-to-move, resize handles, publish/unpublish per layer
- `app/components/MediaLibraryPanel.vue` — drag support + push adds to composition (not directly to player)
- `app/composables/useVisualDisplay.ts` — manage layer stack with draft/published states
