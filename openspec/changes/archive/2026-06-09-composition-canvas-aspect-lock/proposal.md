## Why

Two reported defects share one root cause:

- **#2 — "box larger than image."** A layer's green/red bounding box in the composition workspace sometimes ends up larger than the image it contains, leaving two black bands (because `.layer-content` uses `object-fit: contain`).
- **#5 — layout parity.** Image position and aspect ratio in the player window don't match what the GM laid out in the composition workspace.

Both come from the coordinate model. A layer stores `width%` and `height%` **independently**, each relative to its container. The rendered box's pixel aspect ratio is therefore `(width% · W) / (height% · H)`, where `W`/`H` are the container's pixel dimensions. The composition workspace (`flex: 1` with `margin: 8px`) and the player window (currently 1280×720) have **different aspect ratios**, and the workspace's aspect ratio **changes whenever the window or panel split is resized**.

The existing auto-fit (`onImageLoad` in `LiveDisplayPanel.vue`) computes `height%` so the box matches the image aspect ratio — but only for the workspace size that existed at image-load time, and it runs **once** per layer (guarded by `autoFitted`). Any later resize, or viewing the same `width%`/`height%` in the differently-shaped player window, breaks the match → black bands (#2) and position/aspect drift (#5).

## What Changes

- Introduce a **fixed 16:9 composition canvas**: inside the `LiveDisplayPanel` workspace, render a 16:9 sub-element (letterboxed within the available panel space, black bars on the sides or top/bottom as needed). All layers are positioned and sized **relative to this canvas**, not the raw panel.
- The player window output is the **same fixed 16:9 aspect ratio**, so a layer's `x/y/width/height` percentages map to identical relative positions and sizes in both the workspace canvas and the player window. This is exact parity (#5).
- Because the canvas aspect ratio is now constant (16:9) and matches the player, **auto-fit is computed against the fixed canvas aspect ratio** rather than the live panel size, and it stays correct across window/panel resizes. With box aspect ratio matching image aspect ratio on a stable canvas, the `object-fit: contain` letterboxing inside the box disappears (#2).
- The player window SHALL enforce a 16:9 content area (letterbox the window contents to 16:9 if the window itself isn't 16:9), so resizing or fullscreening the player never distorts the layout relative to the workspace.

Fixed 16:9 is chosen because it matches the overwhelming majority of monitors and projectors; a configurable aspect ratio is explicitly out of scope for this change.

## Capabilities

### Modified Capabilities
- `layer-display`: The composition workspace SHALL present a fixed 16:9 canvas; layer coordinates SHALL be relative to that canvas; auto-fit SHALL be computed against the fixed canvas aspect ratio and SHALL remain correct across resizes.
- `player-window`: Player output SHALL render onto a fixed 16:9 content area that matches the composition canvas, giving exact position/aspect parity between workspace and player.

## Impact

- **Renderer**: `app/components/LiveDisplayPanel.vue` — wrap the layer area in a 16:9 canvas element (CSS `aspect-ratio: 16 / 9`, centered/letterboxed in the panel); measure layer drag/resize/drop against the canvas rect, not the panel rect; rework `onImageLoad` auto-fit to use the fixed 16:9 aspect ratio and re-fit on canvas resize (e.g. `ResizeObserver`) instead of the one-shot `autoFitted` guard.
- **Player**: `electron/player.html` — constrain `#display` to a 16:9 content area centered in the window with black letterbox bars; layer positioning percentages apply to that content area.
- **Types**: `app/types/ipc.ts` — no shape change required (`x/y/width/height` semantics are preserved); add doc comments clarifying that percentages are relative to the fixed 16:9 canvas.
- **Specs**: `layer-display` (workspace canvas + auto-fit), `player-window` (16:9 content area + parity).
- **Risk:** existing projects' layer coordinates were authored against a variable-aspect workspace. After the change they render against a fixed 16:9 canvas, so positions may shift slightly for projects laid out at a non-16:9 panel size. Acceptable — the new behavior is the correct, stable one; document in verification.
