## Why

GMs often associate a scene's visuals with its soundtrack — showing the battle map should start battle music. Rather than requiring two manual actions (push visual + trigger audio), linking a visual to an audio cue automates this. The link, plus per-visual playback timing and fade settings, lives on the visual item — making the visual the primary "scene trigger."

## What Changes

- **Media tab cog button** opens a dedicated **Visual Properties pane** (mirroring the audio Properties pane pattern). This replaces the earlier idea of editing the link from the preview panel.
- The Visual Properties pane lets the user:
  - Rename the visual (`displayName`)
  - Assign / change / clear a linked audio cue (`linkedCueUuid`)
  - Set a **link delay** in seconds (signed):
    - `> 0` → audio starts first, then the visual is shown after the delay
    - `< 0` → visual is shown first, then audio is triggered after the delay
    - `0` → simultaneous (current behavior)
  - Set optional **fade-in** and **fade-out** durations for the visual (opacity transition when it enters/leaves live state)
- New `CuePicker.vue` component for browsing/selecting an existing audio cue
- Visual indicator (music-note badge) on media-library grid items that have a linked cue
- Push/clear logic in `useVisualDisplay.ts` honors delay and fade settings

## Capabilities

### New Capabilities
- `visual-audio-linking`: visual properties pane, cue linking, signed link-delay, and visual fade-in/out, with auto-trigger on push

### Modified Capabilities
- `visual-media-model` (data model): add `linkDelay`, `fadeIn`, `fadeOut` fields to `VisualMediaItem`

## Impact

- `app/types/project.ts` — extend `VisualMediaItem` with `linkDelay?: number`, `fadeIn?: number`, `fadeOut?: number`
- `app/components/MediaLibraryItem.vue` — already emits `properties`; add badge overlay when `linkedCueUuid` is set
- `app/components/MediaLibraryPanel.vue` — route cog click to a properties pane state
- New `app/components/VisualPropertiesPane.vue` — the editor (rename, cue link, delay, fades). Pattern mirrors the existing audio `PropertiesPanel.vue`.
- New `app/components/CuePicker.vue` — modal/dropdown listing audio items with search
- `app/composables/useVisualDisplay.ts` — push logic schedules audio trigger / visual reveal with the configured delay; apply fade-in on push, fade-out on clear
- `app/composables/useAudioEngine.ts` — consumed only (`playCue` called); no changes
