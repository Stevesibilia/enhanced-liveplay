## Why

Not every project needs visual output — a band rehearsing in a club doesn't need the composition workspace, media library, or visual-audio linking taking up screen real estate or firing visuals on cue playback. A per-project toggle lets the GM declare "this project is audio-only" once, simplifying the UI and disabling visual side effects without destroying any data.

## What Changes

- Add a per-project `visualDisplayEnabled` boolean to project schema (default `true`, persists in `.lpa`).
- Add a "View → Enable Visual Display" checkbox menu item that flips the flag on the active project.
- When disabled:
  - Media tab is hidden in the main window.
  - Composition workspace (`LiveDisplayPanel`) is hidden; layout reflows.
  - Visual Properties pane is hidden on cart slots.
  - Audio cues do NOT fire their `linkedCueUuid` visuals.
  - Player window auto-closes (and "Open Player Window" / `Cmd+P` is disabled in the menu).
- When re-enabled, all hidden UI returns; visual media data and composition layers are preserved untouched.
- Minimal Mode remains orthogonal — it respects the flag rather than forcing it.

## Capabilities

### New Capabilities
- `visual-display-toggle`: Per-project flag controlling whether the visual subsystem (media library, composition workspace, visual properties, audio→visual firing, player window access) is active.

### Modified Capabilities
- `project-schema-versioning`: New optional field `visualDisplayEnabled: boolean` added to the project schema; requires a migration to default existing projects to `true`.
- `media-library-panel`: Panel/tab hidden when the project flag is off.
- `preview-panel`: Composition workspace hidden when the flag is off; layout reflows.
- `visual-audio-linking`: Linked visuals do not fire during cue playback when the flag is off.
- `player-window`: Auto-close on flag-off; opening (menu/Cmd+P) disabled while flag is off.

## Impact

- **Schema**: `app/types/project.ts` — add `visualDisplayEnabled` field; `app/utils/migrations.ts` — default existing projects to `true`.
- **Menu**: `electron/main.js` View submenu — add checkbox item; disable "Open/Close Player Window" item when flag is off; IPC channel for menu→renderer.
- **Renderer**: `MainWorkspace.vue`, `MediaLibraryPanel.vue`, `LiveDisplayPanel.vue`, `VisualPropertiesPane.vue`, `useVisualDisplay.ts`, `useVisualMedia.ts` — gate UI rendering and cue-firing on the flag.
- **Player window**: auto-close hook tied to flag transition.
- **No data destruction**: visual media, `linkedCueUuid` references, and layer state are preserved across toggles.
