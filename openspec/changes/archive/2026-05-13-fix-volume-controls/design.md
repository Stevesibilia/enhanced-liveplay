## Context

The app uses Howler.js for audio playback. Each playing track is stored in `activeCues` (a Map keyed by UUID) containing the `Howl` instance. Volume is set at play time via `howl.volume(applyVolumeOffset(item.volume))` or via fade. When the user adjusts volume in the properties panel, only `audioItem.volume` (the data model) is updated — the running Howl instance is never notified.

The main playlist view (`PlaylistItem.vue`) and cart view (`CartSlot.vue`) show waveform mini-displays but have no volume control — users must open the properties panel to adjust levels.

## Goals / Non-Goals

**Goals:**
- Adjusting volume in the properties panel applies immediately to a playing track
- Playlist items and cart slots have a compact inline volume control for quick adjustment
- Volume changes propagate bidirectionally (inline control ↔ properties panel ↔ playback engine)

**Non-Goals:**
- Master/bus volume control (separate feature)
- VU metering on inline controls (already exists in active cue display)
- Changing the volume offset/calibration logic (`applyVolumeOffset`)

## Decisions

### 1. Real-time volume: expose `setVolume(uuid, volume)` on the audio engine

**Choice**: Add a `setVolume(uuid: string, volume: number)` function to `useAudioEngine` that looks up the active cue and calls `howl.volume(applyVolumeOffset(volume))`.

**Rationale**: Simple, direct, no watchers or reactive overhead. The PropertiesPanel and inline controls call this explicitly when volume changes. Avoids watching every audio item's volume property reactively (which would fire on project load, normalization, etc.).

**Alternative considered**: Watch `audioItem.volume` reactively — rejected because it would trigger on bulk operations (loudness normalization) and has no way to distinguish user-initiated changes from programmatic ones.

### 2. Inline volume control: horizontal mini-slider on each item

**Choice**: Add a small horizontal range input (50-60px wide) to `PlaylistItem.vue` and `CartSlot.vue`, showing current dB value on hover/focus. Clicking the existing volume icon toggles mute or reveals the slider.

**Rationale**: Horizontal slider fits the row layout without adding vertical height. Keeps the UI compact for live use.

**Alternative considered**: Vertical popup slider on icon click — more complex UI, slower interaction during live shows.

### 3. Single source of truth: `audioItem.volume` remains canonical

**Choice**: All volume controls (inline and properties panel) read/write `audioItem.volume`. The `setVolume` call to the engine is a side-effect triggered alongside the data update.

**Rationale**: Keeps state management simple. No duplicated volume state between UI and engine.

## Risks / Trade-offs

- **Rapid slider movement** → many `howl.volume()` calls. Howler handles this fine (it's just setting a Web Audio GainNode value). No throttling needed.
- **Ducking interaction** → if a track is currently ducked, a manual volume change should update `originalVolume` on the active cue so un-ducking restores the new level, not the old one. Must handle this in `setVolume`.
- **Fade interaction** → if a fade is in progress and user adjusts volume, the fade target changes. Use `howl.volume()` which cancels any active fade — acceptable UX since user is explicitly overriding.
