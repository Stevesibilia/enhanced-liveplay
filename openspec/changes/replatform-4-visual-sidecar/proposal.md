## Why

The visual display subsystem (v1.5.0) is this fork's flagship differentiator, but the upstream maintainer may never adopt it. Currently its data lives inside the `.liveplay` document (`visualMedia[]`, `visualFolders`, `visualDisplayEnabled`, per-item `linkDelay`) and is persisted via the renderer's `saveProject()`. Under the client-server architecture the **server owns the project document** and exposes only typed write endpoints — so the fork's visual write path disappears and there is no clean way to write arbitrary fields back.

To avoid hitting a wall on upstream's decisions, the visual subsystem is re-architected as a **self-contained, client-side sidecar plugin** that depends on nothing from the C++ engine and requires zero server fork.

## What Changes

- Move all visual state out of `.liveplay` into a **sidecar file** `<projectFolder>/visuals.json`, owned/read/written by the client via Electron fs.
- Package the feature as a drop-in module `client/app/modules/visual/` (remove ⇒ base app unaffected).
- Drive the second display window (`electron/player.html`) from server WS transport events + the sidecar's audio↔visual link map (keyed by audio item `uuid`).
- Provide a one-time migration: read legacy visual fields from `GET /api/project`, write `visuals.json`, stop persisting visual data into the project document.

## Capabilities

### New Capabilities

- `visual-sidecar`: client-side sidecar storage + module architecture for the visual display subsystem, fully decoupled from the server and project document.

### Modified Capabilities

_(supersedes the fork's pre-replatform visual specs: `layer-display`, `visual-media-model`, `visual-audio-linking`, `player-window`)_

## Impact

- New file at runtime: `<projectFolder>/visuals.json` (travels with the project folder).
- New module: `client/app/modules/visual/` (components + composables).
- No server changes; tracks upstream server verbatim.
- Legacy `.liveplay` files with embedded visual fields auto-migrate on first open.
- Depends on: `replatform-1-foundation`. Independent of other port phases.
