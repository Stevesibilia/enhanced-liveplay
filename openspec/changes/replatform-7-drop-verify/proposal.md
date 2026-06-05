## Why

Once features are ported and reconciled, the fork's old Howler-based audio layer and its derivatives are dead weight and a source of confusion/bugs. This final phase removes them and verifies the whole application runs end-to-end on the C++ server: playback, meters, volume, and routing all sourced from the server. This is the cutover that makes the replatform real.

## What Changes

- Remove `useAudioEngine.ts` (Howler) and any remaining Howler imports/dependencies.
- Remove fork `VUMeter` in favor of upstream `StereoMeter` / `LiveMeterBar` (server-fed).
- Remove the fork's renderer volume/master slider in favor of upstream `VolumeSlider` + routing matrix.
- Remove Howler-specific bug-fix code (loop Howl-leak handling, stop-fade skip, −10 dB offset) — moot under the C++ engine.
- Drop the `howler` dependency from `package.json`.
- Full end-to-end verification across platforms.

## Capabilities

### New Capabilities

- `audio-engine-cutover`: completion criteria for removing the Howler layer and verifying server-driven audio.

### Modified Capabilities

_(removes/retires fork specs tied to renderer audio: `cue-playback`, `main-volume-control`)_

## Impact

- Deleted: `useAudioEngine.ts`, fork `VUMeter`, renderer volume slider, Howler fixes.
- Removed dependency: `howler`.
- Smaller, single-source-of-truth audio path (server).
- Depends on: all prior phases (1–6).
