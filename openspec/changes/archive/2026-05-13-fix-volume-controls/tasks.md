## 1. Real-time volume in audio engine

- [x] 1.1 Add `setVolume(uuid: string, volume: number)` function to `useAudioEngine.ts` that calls `howl.volume(applyVolumeOffset(volume))` on the active cue
- [x] 1.2 Update `originalVolume` on the active cue when `setVolume` is called (for correct un-duck behavior)
- [x] 1.3 Export `setVolume` from the composable return object

## 2. Wire properties panel to real-time volume

- [x] 2.1 In `PropertiesPanel.vue`, update the `@update:volume` handler to call `setVolume` when the item is currently playing
- [x] 2.2 Verify volume changes apply immediately during playback without stop/restart

## 3. Master output volume control

- [x] 3.1 Add master output volume slider to `PlaybackControls.vue` with dB display
- [x] 3.2 Wire slider to `setMasterGain` (Howler.volume global control)
- [x] 3.3 Add mute/unmute toggle on volume icon click

## 4. Verification

- [x] 4.1 Build compiles cleanly
- [x] 4.2 Test real-time per-track volume change via properties panel
- [x] 4.3 Test master output volume slider
- [x] 4.4 Test mute/unmute toggle
