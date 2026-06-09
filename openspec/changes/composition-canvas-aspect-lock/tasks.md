## 1. Workspace 16:9 canvas (LiveDisplayPanel.vue)

- [ ] 1.1 Add a `.canvas` element inside `.workspace` wrapping the layer `v-for` and the empty placeholder; style `aspect-ratio: 16 / 9; max-width: 100%; max-height: 100%; margin: auto; position: relative; background: #000;`.
- [ ] 1.2 Make `.workspace` a flex centerer (`display:flex; align-items:center; justify-content:center;`) with black background so the letterbox bars show.
- [ ] 1.3 Add a `canvasRef` and point all coordinate math at it instead of `workspaceRef`: `onDrop`, `beginDrag` (rect capture), and the drag/resize percentage conversions.

## 2. Resolution-independent auto-fit

- [ ] 2.1 Define `CANVAS_AR = 16 / 9` and rework `onImageLoad`: `heightPct = widthPct * (CANVAS_AR / imageAspect)`; clamp/recenter as today but against the canvas.
- [ ] 2.2 Remove dependence on live pixel dimensions for the fit (no `rect.width / rect.height` in the AR calc); the fit is now correct at all canvas sizes.
- [ ] 2.3 Keep a per-layer "natural AR applied" flag so fit runs once per image; confirm it no longer needs re-running on resize (percentages are resolution-independent against a constant-AR canvas).
- [ ] 2.4 Confirm drag-resize aspect preservation (`computeResize`) still behaves correctly relative to the canvas.

## 3. Player 16:9 content area (player.html)

- [ ] 3.1 Wrap layer mounting in a `.canvas` element inside `#display`: `aspect-ratio: 16/9; max-width:100%; max-height:100%; margin:auto; position:relative;`; make `#display` a flex centerer with black background.
- [ ] 3.2 Mount/position layers inside `.canvas` (percentages relative to it); keep `object-fit: contain` on `.layer img` as a no-op safety net.
- [ ] 3.3 Verify fullscreen / non-16:9 window keeps the content area letterboxed at 16:9.

## 4. Types / docs

- [ ] 4.1 In `app/types/ipc.ts`, update doc comments on `DisplayLayer` / `PublishedLayer` `x/y/width/height` to state percentages are relative to the fixed 16:9 canvas. No shape change.

## 5. Verification (manual — Electron)

- [ ] 5.1 Push an image → bounding box hugs the image, no black bands inside the box.
- [ ] 5.2 Resize the main window and drag the panel split to several sizes → box stays tight to image (no bands appear).
- [ ] 5.3 Push images of varied aspect ratios (portrait, square, ultrawide) → each box hugs its image.
- [ ] 5.4 Publish to player → image position and aspect ratio match the composition workspace exactly.
- [ ] 5.5 Resize / fullscreen the player window on a non-16:9 display → content stays 16:9 letterboxed and matches the workspace layout.
- [ ] 5.6 Open a pre-existing project authored before this change → confirm layout is sane; note any expected one-time positional shift.
