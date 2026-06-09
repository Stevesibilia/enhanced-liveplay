## Context

`LiveDisplayPanel.vue` renders layers as absolutely-positioned `%`-based boxes inside `.workspace` (a `flex: 1` element with `margin: 8px`). The player (`player.html`) renders the same layers as `%`-based boxes inside `#display` (100% of a 1280×720 window). A layer carries `x, y, width, height` all as percentages.

The defect math:

```
   box_pixel_AR = (width% · W) / (height% · H)        // W,H = container pixel size

   container         W / H (aspect)         stable?
   ─────────────     ───────────────        ──────────────────────────
   comp .workspace   panel-driven, varies   NO  — changes on resize
   player #display   1280/720 = 16:9        ~   — but ≠ workspace AR

   image displayed with object-fit: contain
   → black bands whenever box_pixel_AR ≠ image_AR
```

Auto-fit (`onImageLoad`) currently solves `box_pixel_AR == image_AR` once, for one workspace size, then locks via the `autoFitted` set. Resize the panel or push to the 16:9 player and the equality breaks.

## Goal

Make the percentage coordinate space identical in both surfaces and **constant under resize**, so:
- `box_pixel_AR` is stable → auto-fit stays valid → no bands (#2).
- workspace canvas and player content area are the same shape → identical layout (#5).

## Decision: a fixed 16:9 canvas in both surfaces

Introduce a dedicated **16:9 canvas** element that is the coordinate origin for all layer percentages, in both the workspace and the player. The canvas is letterboxed (centered, with black bars) inside whatever space the surface has.

```
  ┌─ .workspace (panel, any size) ─────────────┐
  │            black bar                        │
  │   ┌─ .canvas  (aspect-ratio: 16/9) ─────┐   │
  │   │                                      │   │   ← layers positioned
  │   │     layer %s relative to HERE        │   │     relative to .canvas,
  │   │                                      │   │     not .workspace
  │   └──────────────────────────────────────┘   │
  │            black bar                        │
  └─────────────────────────────────────────────┘

  player #display: same idea — a 16:9 content area
  centered in the window, black letterbox around it.
```

Because both canvases are exactly 16:9, a layer at `(x,y,w,h)%` occupies the same relative rectangle in each → exact parity (#5). Within a 16:9 canvas, `W/H` is constant (= 16/9) regardless of pixel size, so `box_pixel_AR = (w%/h%)·(16/9)` is constant under resize. Auto-fit picks `h%` once such that `box_pixel_AR == image_AR`, and it stays valid at every canvas size (#2).

### Workspace canvas (LiveDisplayPanel.vue)

- Add `.canvas` inside `.workspace`: `aspect-ratio: 16 / 9; max-width: 100%; max-height: 100%; margin: auto; position: relative; background: #000;`. `.workspace` becomes a flex centerer (`display:flex; align-items:center; justify-content:center;`).
- All rect math (`onDrop`, `beginDrag`, `onDragMove`, `onImageLoad`) measures against the **canvas** `getBoundingClientRect()`, not `workspaceRef`.
- Auto-fit uses the constant canvas aspect ratio:
  `heightPct = widthPct · (CANVAS_AR / imageAspect)`, where `CANVAS_AR = 16/9`.
- Replace the one-shot `autoFitted` guard with a `ResizeObserver` on the canvas that recomputes nothing for size (percentages are resolution-independent now) — re-fit is only needed if the **image** changes, so keep a per-layer "has natural AR been applied" flag but make the fit math independent of pixel size. (Net: fit once per image is now actually correct forever, because the AR it fits to is constant.)

### Player content area (player.html)

- Wrap layers in a 16:9 content element centered in `#display` with black bars: a `.canvas` with `aspect-ratio: 16/9; max-width:100%; max-height:100%; margin:auto;`. Layers mount inside `.canvas`, percentages relative to it.
- `object-fit: contain` on `.layer img` stays as a safety net but is effectively a no-op once box AR matches image AR.

## Alternatives considered

- **ResizeObserver re-fit on the variable workspace (Option A from exploration).** Fixes #2 only; player still a different aspect → #5 persists. Rejected.
- **Store explicit per-layer aspect ratio + single width% (Option C).** Also works, but changes the data model and the player/workspace contract more invasively. The fixed-canvas approach gets exact parity with no schema change. Deferred unless a configurable output AR is later required.
- **Make the player window itself exactly 16:9 and skip the in-window canvas.** Rejected — the user can resize/fullscreen the player to a non-16:9 monitor; the in-`#display` letterbox guarantees layout integrity regardless of window shape.

## Migration / compatibility

`x/y/width/height` semantics are unchanged (still 0–100 percentages). Projects authored against the old variable-aspect workspace will re-interpret those percentages against the fixed 16:9 canvas; layouts done at a near-16:9 panel size are visually unchanged, others shift to the correct stable position. No data migration; document the one-time visual shift in verification.

## Verification

Manual (Electron): push an image, confirm the box hugs the image with no black bands at multiple window/panel sizes. Resize the main window and the panel split → box stays tight to image. Publish to player → image position and aspect match the workspace exactly. Fullscreen the player on a non-16:9 monitor → content stays 16:9 letterboxed, layout matches workspace.
