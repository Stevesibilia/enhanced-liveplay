## Why

Volume control is partially broken: the track detail panel slider changes the stored volume value but doesn't apply it to the currently-playing Howl instance in real time — requiring stop/restart. Additionally, the main playlist/cart interface lacks any volume indicator or quick-adjust control, forcing users to open the properties panel just to see or tweak levels during a live show.

## What Changes

- Add real-time volume application when the volume slider is adjusted on a playing track (apply `howl.volume()` immediately on value change)
- Add a compact volume indicator/slider to playlist items and cart slots in the main interface for at-a-glance level monitoring and quick adjustment

## Capabilities

### New Capabilities

- `main-volume-control`: Inline volume slider/indicator on playlist items and cart slots in the main interface

### Modified Capabilities

- `drag-drop-interop`: No changes needed (unrelated)

## Impact

- `app/composables/useAudioEngine.ts` — needs a method or watcher to apply volume changes to active Howl instances in real time
- `app/components/PropertiesPanel.vue` / `WaveformTrimmer.vue` — the `@update:volume` handler must trigger real-time volume on the active cue
- `app/components/PlaylistItem.vue` — add inline volume control
- `app/components/CartSlot.vue` — add inline volume control
