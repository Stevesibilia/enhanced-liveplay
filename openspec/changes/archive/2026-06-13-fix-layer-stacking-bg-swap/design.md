## Context

The composition workspace (`app/components/LiveDisplayPanel.vue`) renders each layer as an absolutely-positioned `.layer` div with an inline `:style="{ zIndex: layer.zIndex }"`, iterating `sortedLayers` (ascending z). The data model in `app/composables/useVisualDisplay.ts` is correct: `bringToFront`/`sendToBack`/`setBackground` mutate `zIndex` properly, and `getPublishedState` sorts ascending before pushing to the player. The player (`electron/player.html`) honors `zIndex` and is unaffected.

Two defects live entirely in the editing surface:

1. `.layer.selected { z-index: 9999 !important }` overrides the inline z-index, so the selected layer always paints on top. The action bar only exists for the selected layer, so Front/Back act on the one layer immune to visual reordering, and Background snaps full-screen but stays on top.
2. `setBackground(id, true)` clears the prior background's `isBackground` flag but leaves it published and full-screen at its old (low) z. The new background gets `minZ − 1` (lower), so the leftover covers it.

## Goals / Non-Goals

**Goals:**
- Front/Back reflect true stacking in the workspace immediately, even while a layer stays selected.
- A background layer renders behind others in the workspace, matching the player.
- Replacing the active background leaves exactly one live full-screen backdrop, with the new one visible.

**Non-Goals:**
- No change to player rendering, IPC, or persisted schema.
- No A/B backdrop set or crossfade-on-swap (explicitly deferred; "replace backdrop" only).
- No change to publish/link/fade pipelines.

## Decisions

**Decision: Decouple selection visuals from stacking — drop the z-index boost.**
Remove `z-index: 9999 !important` from `.layer.selected`. Selection is already conveyed by `outline` + offset, and `outline` paints without needing a higher stacking context. The selected layer renders at its real `zIndex`.
- *Why over alternatives:* A modest non-`!important` bump would still break the Background case (background wants the lowest z) and would still misorder Front/Back. Moving handles to a separate overlay layer is more code than warranted; the outline alone is sufficient affordance. Risk that a neighbor with higher z overlaps the thin outline edge is cosmetic and acceptable.

**Decision: Remember the pre-background box; restore it on retire/un-mark.**
`setBackground(true)` overwrites x/y/w/h with full-screen and never recorded the original box, so a retired (or un-marked) background stayed full-screen — blanketing the canvas and hiding the new backdrop behind it (a draft at 0.6 opacity still covers). Fix: capture the box into a workspace-only `prevBox` field on `DisplayLayer` when a layer becomes background, and restore it (clearing `prevBox`) whenever the role is cleared. Retiring the previous background additionally sets `published: false`.
- *Why:* Without box restore, "unpublish only" still leaves a full-screen leftover that covers the new bg in the workspace. Restoring the box shrinks the retired layer back to where it was, so the new full-screen backdrop is visible and the old image is a normal draft. Also fixes the latent "un-mark leaves full-screen" quirk. `prevBox` is workspace-only and never enters `PublishedLayer`/`getPublishedState`, so no player or schema impact.
- *Why over alternatives:* Removing the old bg outright loses the image; leaving it published reproduces the original bug; leaving it full-screen-but-unpublished reproduces this one.

**Decision: Make the 16:9 canvas its own stacking context (`isolation: isolate`).**
The canvas (`.canvas` in the workspace, `#canvas` in the player) has `background:#000` but was not a stacking context, so a child with negative z-index painted *behind* the canvas's own black fill and disappeared. The first background sat at z `0` (visible); replacing it pushed the new background to z `−1` (`minZ − 1`), which vanished — the screen went black. Repeated Send-to-Back hit the same trap. Adding `isolation: isolate` makes the canvas paint its black fill first and then its negative-z children above it, so negative z works in both surfaces.
- *Why over alternatives:* Removing the canvas black fill would also work but loses the explicit base black. Clamping z to non-negative GM-side would mean rewriting the whole z strategy and Send-to-Back; `isolation` is one line per surface and honors the existing data model.

## Risks / Trade-offs

- [Outgoing background left as a full-screen draft box may confuse the GM] → It reverts to a normal movable/resizable draft (dashed border, off-player); the GM can resize or remove it like any layer. Acceptable and recoverable.
- [Removing the z-index boost lets a higher-z neighbor clip a selected layer's outline edge] → Cosmetic only; the dashed/solid border + handles still identify the selection. No functional impact.
