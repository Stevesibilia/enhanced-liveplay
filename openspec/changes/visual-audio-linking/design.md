## Context

The data model already has `linkedCueUuid` on `VisualMediaItem` (from visual-media-model change). The audio engine already exposes a `playCue(uuid)` function. This change is purely about UI for managing the link and the push-time auto-trigger logic.

## Goals / Non-Goals

**Goals:**
- UI to assign/clear linked audio cue on a visual media item
- Cue picker component for browsing/selecting available audio cues
- Auto-trigger linked cue when visual is pushed live
- Visual indicator on items that have a linked cue (icon/badge in grid)
- Respect the linked cue's existing start/ducking behavior (no special handling)

**Non-Goals:**
- Bidirectional linking (audio → visual)
- Multiple linked cues per visual (one-to-one only)
- Creating new audio cues from this UI (pick from existing only)

## Decisions

**1. Link managed from preview panel properties area**

When a visual is staged, the preview panel shows a "Linked Audio" section with the cue name (or "None") and a button to pick/change/clear. This keeps the interaction close to the push action — you see what will happen when you push.

Alternative: Context menu on grid item. Rejected — less discoverable, harder to see the link state.

**2. Cue picker as modal with search**

Small modal listing all audio items (flat, from all groups). Search/filter by name. Click to select. Shows current selection. This is similar to how the existing "goto-item" target pickers work in the cue properties.

**3. Auto-trigger uses existing playCue**

On push: if `liveItem.linkedCueUuid` exists → call `playCue(linkedCueUuid)`. Same code path as manual trigger. Ducking, start behavior, everything applies as normal.

**4. Badge indicator on grid items**

Items with a linked cue show a small music-note icon badge on their thumbnail in the media library grid. Subtle but visible.

## Risks / Trade-offs

- **Linked cue stops other audio (if stop-all ducking)** → Expected and desired. GM chose to link for a reason.
- **Confusing if GM doesn't remember a link exists** → Badge + preview panel display mitigate this
