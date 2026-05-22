## Why

GMs often associate a scene's visuals with its soundtrack — showing the battle map should start battle music. Rather than requiring two manual actions (push visual + trigger audio), linking a visual to an audio cue automates this. The link lives on the visual item, making the visual the primary "scene trigger."

## What Changes

- UI in media library or preview panel to assign/unassign a linked audio cue to a visual item
- When a linked visual is pushed live, its linked audio cue auto-triggers
- Cue picker/selector component for choosing which audio cue to link
- Visual indicator on media items that have a linked cue

## Capabilities

### New Capabilities
- `visual-audio-linking`: UI and logic for linking visual media items to audio cues, with auto-trigger on push

### Modified Capabilities

## Impact

- `app/components/MediaLibraryItem.vue` or `PreviewPanel.vue` — link assignment UI
- `app/composables/useVisualDisplay.ts` — push logic extended to trigger linked cue
- `app/composables/useAudioEngine.ts` — consumed (playCue called, no modifications needed)
- New `app/components/CuePicker.vue` — modal/dropdown for selecting audio cues
