## Why

The audio engine drives all playback transitions — end detection, crossfade triggering, stop-fade triggering, loop boundary, group progression — from a 100 ms `setInterval` that polls `howl.seek()`. Howler exposes proper signals (`onend`, `onplay`, `onstop`) for the same events, but they are only partially wired. Polling-based decisions are the root cause of the loop-boundary, loop-toggle, and audio-thread-vs-JS-thread races fixed in PR #17, and they leave residual timing slop of up to one polling tick (~100 ms) at every transition. Now that `setupCueForPlayback` (PR #19, commit `f5388bf`) consolidates Howl creation into a single path, the seam exists to migrate decisions to events without re-introducing the duplicate-bug class.

## What Changes

- Move end detection off the progress interval onto Howler's `onend` event. The interval no longer calls `howl.stop()` or deletes `activeCues` entries.
- Replace polling-driven crossfade triggering with scheduled timeouts computed at load time (`howl.duration()` − `crossFade`), refreshed if `inPoint`/`outPoint`/`crossFade` change while a cue is active.
- Replace polling-driven stop-fade triggering with the same scheduled-timeout pattern.
- Keep the 100 ms `setInterval` solely for UI: `cue.currentTime`, group accumulated time, audio levels. The interval no longer mutates engine state or triggers transitions.
- Tighten the timing guarantee at trim boundaries: trigger events fire within ~10 ms of their scheduled point rather than up to ~100 ms late.
- **BREAKING (internal contract only)**: `ActiveCueState.progressInterval` semantics change from "drives everything" to "drives UI only." Anything subscribing to the interval for decision-making must subscribe to engine events instead. No public API change.

## Capabilities

### New Capabilities
- `cue-playback`: Lifecycle and timing semantics of an active audio cue — start, end detection, loop, crossfade trigger, stop-fade trigger, ducking interactions, and group progression. Codifies the observable behavior the engine must guarantee regardless of implementation strategy (polling vs. events).

### Modified Capabilities
<!-- None. Existing specs (cart-hotkeys, drag-drop-interop, electron-42-compat, ffmpeg-setup, midi-mapping) do not cover playback semantics. -->

## Impact

- **Code**: `app/composables/useAudioEngine.ts` — primarily `setupCueForPlayback` (:226), `playCue` (:423), `startCrossfadeTrack` (:719), and the `onend` handler. Cleanup paths in `stopCue` and group-end logic need to be reviewed to ensure no double-fire when `onend` and a scheduled timeout race.
- **APIs**: No public-facing changes. `useAudioEngine` returns the same surface.
- **Dependencies**: None added. Uses existing Howler events.
- **Risk**: Edge cases around `html5: true` Howler behavior — `onend` semantics differ subtly from Web Audio mode, and pause/seek/loop-toggle interactions need verification. The pain-points doc (#2) calls this out specifically.
- **Test surfacing**: This change creates the natural seam for the testing work flagged as pain-point #7. Pure functions (boundary-time calculation, timeout scheduling) become testable in isolation.
