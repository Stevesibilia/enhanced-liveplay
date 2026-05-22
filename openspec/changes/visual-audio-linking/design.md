## Context

The data model already has `linkedCueUuid` on `VisualMediaItem` (from the visual-media-model change). The audio engine exposes `playCue(uuid)`. The media library item already renders a cog button emitting a `properties` event. This change introduces a Visual Properties pane analogous to the audio `PropertiesPanel.vue`, extends the data model with timing/fade fields, and adds the push-time scheduling logic.

## Goals / Non-Goals

**Goals:**
- A Visual Properties pane opened from the cog button on each media-library item
- Editable fields: `displayName`, `linkedCueUuid`, `linkDelay`, `fadeIn`, `fadeOut`
- Cue picker for browsing/selecting an existing audio cue
- Auto-trigger linked cue when visual is pushed, honoring `linkDelay` sign:
  - positive → audio first, visual delayed
  - negative → visual first, audio delayed
- Visual fade-in on push and fade-out on clear (when configured)
- Music-note badge on linked items in the grid
- Respect the linked cue's existing start/ducking behavior (no special handling)

**Non-Goals:**
- Bidirectional linking (audio → visual)
- Multiple linked cues per visual (one-to-one only)
- Creating new audio cues from this UI (pick from existing only)
- Crossfading between two visuals (single-layer fade only for now)
- Per-cue or per-link override of fade durations (fades live on the visual item)

## Decisions

**1. Properties editing lives in a Visual Properties pane, not the preview panel**

The cog button on each `MediaLibraryItem` opens a `VisualPropertiesPane.vue` in the same area the audio `PropertiesPanel` occupies (or a dedicated slot in the media tab). This:
- mirrors the existing audio-tab UX the user is familiar with
- allows editing without staging the item
- keeps the preview panel focused on live/staged state, not authoring

Alternative considered: preview-panel inline section. Rejected — couples editing to staging and clutters the live-control area.

**2. Cue picker as modal with search**

Small modal listing all audio items (flattened across groups). Search/filter by name. Click to select. Shows current selection. Mirrors the existing goto-target picker pattern from the audio side.

**3. Link delay semantics (signed seconds, push-only)**

A single `linkDelay: number` field (default `0`). It applies **only on push** — triggering the linked audio cue stand-alone from the audio tab ignores `linkDelay`. Unpublish does not re-trigger or schedule audio either; it only fades the visual out.

On push:
- `delay === 0` → fire audio and reveal visual simultaneously
- `delay > 0` → call `playCue` immediately, schedule visual reveal at `delay` seconds
- `delay < 0` → reveal visual immediately, schedule `playCue` at `|delay|` seconds

Rationale for signed-single-field over two fields: matches how a GM thinks about the offset ("audio leads by X" vs. "visual leads by X"), and a single slider/input is simpler than two mutually-exclusive ones. Reasonable bounds: ±30s in the UI.

Scheduling uses `setTimeout` keyed by the visual's uuid. If a second push or a clear happens before the timer fires, the pending timer SHALL be cancelled.

**4. Fade-in / fade-out on the visual**

`fadeIn: number` and `fadeOut: number` (default `0`). Applied via CSS opacity transition on the player window's visual layer:
- `fadeIn` runs when the visual is **pushed** (revealed live)
- `fadeOut` runs when the visual is **unpublished** (removed from live)

If a fade is in progress and a new push/unpublish comes in, the new transition replaces it (no queue). `0` means "instant" — current behavior, no regression risk for existing items.

**5. Auto-trigger uses existing `playCue`**

No engine changes. Ducking, start behavior, and any cue-level fades remain governed by the cue itself.

**6. Backwards compatibility**

All new `VisualMediaItem` fields are optional. Missing fields are treated as `0` / undefined and behave identically to today.

**7. Badge indicator on grid items**

Items with `linkedCueUuid` show a small music-note icon overlay on their thumbnail. Subtle but visible. Independent of delay/fade settings.

## Risks / Trade-offs

- **Pending-timer correctness** — pushing a second visual or clearing live while a delayed trigger is queued must cancel the timer; otherwise audio fires for a visual no longer staged. Mitigation: store timer handle keyed by visual uuid in `useVisualDisplay`, clear on every push/clear.
- **Long negative delays feel like a bug** — if delay is large and audio hasn't fired, GM may panic-click. Mitigation: cap UI to a reasonable range (e.g. ±30s) and display a small "waiting…" indicator while a timer is pending.
- **Fade durations stacked with cue fades** — a visual with `fadeIn=2` linked to a cue with its own `playFade` may feel desynchronized. Acceptable: documented as independent; GM tunes them together.
- **Discoverability of properties pane** — the cog button is small. Mitigated by tooltip and by reusing the same visual pattern as the audio tab.
