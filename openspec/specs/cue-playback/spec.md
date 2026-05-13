## ADDED Requirements

### Requirement: Cue lifecycle is tracked in a single source of truth

The audio engine SHALL maintain a single `activeCues` map keyed by item UUID. An entry MUST exist for the entire duration that a cue is audible, from `playCue` (or `startCrossfadeTrack`) until terminal cleanup. No code outside the engine SHALL mutate this map.

#### Scenario: Playing a cue creates exactly one active entry
- **WHEN** `playCue(item)` is invoked for an item not currently active
- **THEN** `activeCues` contains exactly one entry keyed by `item.uuid`
- **AND** the entry's `howl` field references the Howl instance created for the cue
- **AND** the entry remains present until terminal cleanup fires

#### Scenario: Replaying an already-active cue is rejected
- **WHEN** `playCue(item)` is invoked for an item whose UUID is already in `activeCues`
- **THEN** the engine SHALL log a warning and return `false`
- **AND** no second Howl SHALL be created

### Requirement: End detection fires within 10 ms of the trim boundary

When a non-looping cue reaches its sprite boundary (`outPoint`, or file end if no `outPoint`), the engine SHALL fire terminal cleanup within 10 ms of the actual audio end as reported by Howler. Detection MUST NOT rely on a polling tick.

#### Scenario: Cue ends at outPoint
- **GIVEN** a cue with `inPoint = 1.0`, `outPoint = 5.0`, and `endBehavior.action = 'stop'`
- **WHEN** audio playback reaches the 5.0 s mark
- **THEN** within 10 ms the engine SHALL remove the cue from `activeCues`
- **AND** call `restoreDuckedVolumes` for the cue
- **AND** fire `handleEndBehavior` for the cue
- **AND** propagate group-end if the cue is the last item in a group's playback chain

#### Scenario: Cue ends at file end when no outPoint set
- **GIVEN** a cue with no `outPoint` set and `endBehavior.action = 'stop'`
- **WHEN** audio playback reaches the end of the underlying file
- **THEN** within 10 ms the engine SHALL fire terminal cleanup as above

#### Scenario: Looping cue does not fire terminal cleanup at boundary
- **GIVEN** a cue with `endBehavior.action = 'loop'`
- **WHEN** audio playback reaches the sprite boundary
- **THEN** the engine SHALL NOT remove the cue from `activeCues`
- **AND** Howler SHALL restart the cue at `inPoint`

### Requirement: Crossfade triggers at a scheduled time, not via polling

When a cue has `crossFade > 0` and is not a cart item, the engine SHALL schedule the crossfade trigger at cue start (after `howl.duration()` is known) for the time `trimmedDuration - crossFade`. At that time the engine SHALL fade the current cue to 0 over `crossFade` seconds and start the resolved next item via `startCrossfadeTrack`. The trigger MUST fire within 10 ms of its scheduled time.

#### Scenario: Crossfade fires within 10 ms of scheduled point
- **GIVEN** a cue with `trimmedDuration = 10 s` and `crossFade = 2 s`
- **WHEN** the cue starts playing
- **THEN** the engine SHALL schedule the crossfade trigger for the 8.0 s mark
- **AND** the trigger SHALL fire within 10 ms of audio time 8.0 s
- **AND** at that moment the engine SHALL fade the current cue's volume to 0 over 2 s
- **AND** invoke `startCrossfadeTrack(nextItem, 2)` where `nextItem` is resolved per `endBehavior`

#### Scenario: Crossfade fires only once per cue
- **WHEN** the scheduled crossfade trigger has fired for a cue
- **THEN** the same trigger SHALL NOT fire again for that cue instance
- **AND** the engine SHALL NOT also fire a stop-fade on the same cue

#### Scenario: Cart items do not crossfade
- **GIVEN** a cue whose `item.index[0] === -1` (cart item)
- **WHEN** the cue starts
- **THEN** no crossfade trigger SHALL be scheduled

### Requirement: Stop-fade triggers at a scheduled time, not via polling

When a non-cart cue has `stopFade > 0` and `crossFade` does not also apply, the engine SHALL schedule a stop-fade trigger at cue start for the time `trimmedDuration - stopFade`. At that time the engine SHALL fade the cue's volume to 0 over `stopFade` seconds. The trigger MUST fire within 10 ms of its scheduled time.

#### Scenario: Stop-fade fires when no crossfade applies
- **GIVEN** a non-cart cue with `trimmedDuration = 10 s`, `stopFade = 1 s`, and `crossFade = 0`
- **WHEN** the cue starts
- **THEN** the engine SHALL schedule the stop-fade for the 9.0 s mark
- **AND** the trigger SHALL fire within 10 ms of audio time 9.0 s
- **AND** fade the cue's volume to 0 over 1 s

#### Scenario: Crossfade takes priority over stop-fade
- **GIVEN** a cue with both `crossFade = 2 s` and `stopFade = 1 s`
- **WHEN** the cue starts
- **THEN** only the crossfade trigger SHALL be scheduled
- **AND** no stop-fade trigger SHALL fire for this cue

### Requirement: Scheduled triggers survive pause and resume without drift

When a cue is paused, any pending scheduled triggers (crossfade, stop-fade, scheduled end if used) SHALL be cancelled. When the cue resumes, the engine SHALL re-schedule each trigger such that it fires at the originally intended audio-time position. Cumulative drift across N pause/resume cycles SHALL be less than 10 ms.

#### Scenario: Crossfade fires at original audio position after pause
- **GIVEN** a cue with `trimmedDuration = 10 s` and `crossFade = 2 s` (trigger at audio-time 8.0 s)
- **WHEN** the cue is paused at audio-time 5.0 s
- **AND** resumed 30 s of wall-clock later
- **THEN** the crossfade trigger SHALL fire when the cue reaches audio-time 8.0 s
- **AND** SHALL NOT have fired during the pause

### Requirement: Scheduled triggers are recomputed on seek

When a `seekCue(uuid, time)` operation moves the playhead, the engine SHALL recompute and reschedule all pending triggers for that cue based on the new playhead position. Raw writes to `howl.seek(value)` outside the engine helper SHALL NOT occur.

#### Scenario: Seeking past the crossfade point cancels the crossfade trigger
- **GIVEN** a cue with crossfade scheduled at audio-time 8.0 s, currently playing at 3.0 s
- **WHEN** `seekCue(uuid, 9.0)` is called
- **THEN** the previously scheduled trigger SHALL be cancelled
- **AND** since 9.0 s > 8.0 s, no new crossfade trigger SHALL be scheduled
- **AND** the cue SHALL proceed to terminal cleanup at 10.0 s

#### Scenario: Seeking backwards re-arms the crossfade trigger
- **GIVEN** a cue with crossfade scheduled at audio-time 8.0 s, currently playing at 9.0 s (trigger already fired or in flight)
- **WHEN** `seekCue(uuid, 3.0)` is called
- **THEN** the engine SHALL reset the cue's crossfade-triggered state
- **AND** schedule a new crossfade trigger for the 8.0 s mark

### Requirement: Scheduled triggers are recomputed on item mutation

When `item.crossFade`, `item.stopFade`, `item.outPoint`, or `item.inPoint` changes for a currently-active cue, the engine SHALL reschedule the affected triggers. Reschedules MAY be debounced at up to 100 ms.

#### Scenario: Changing crossFade duration reschedules the trigger
- **GIVEN** a cue with `trimmedDuration = 10 s` and `crossFade = 1 s` (trigger at 9.0 s), currently at 5.0 s
- **WHEN** `item.crossFade` is updated to 3 s
- **THEN** the engine SHALL cancel the previous trigger
- **AND** schedule a new trigger for audio-time 7.0 s

#### Scenario: Clearing crossFade cancels the trigger
- **GIVEN** a cue with a scheduled crossfade trigger
- **WHEN** `item.crossFade` is updated to 0
- **THEN** the engine SHALL cancel the trigger
- **AND** SHALL NOT fire the trigger

### Requirement: External stop cancels in-flight scheduled triggers

When `stopCue(uuid)` is invoked, the engine SHALL cancel any pending crossfade-trigger and stop-fade-trigger timeouts associated with that cue. A cue stopped externally SHALL NOT spawn its `endBehavior` next-item via a stale crossfade trigger.

#### Scenario: Stopping before crossfade does not spawn next track
- **GIVEN** a cue with crossfade scheduled at audio-time 8.0 s, currently playing at 5.0 s
- **WHEN** `stopCue(uuid)` is called
- **THEN** the scheduled crossfade trigger SHALL be cancelled
- **AND** `startCrossfadeTrack` SHALL NOT be invoked for that cue's chain
- **AND** the cue SHALL be removed from `activeCues` after its fade-out completes

### Requirement: The progress interval drives UI only

The engine MAY run a periodic interval (≈100 ms) for the sole purpose of UI updates: `cue.currentTime`, group accumulated time, and audio-level meters. This interval SHALL NOT invoke `howl.stop()`, mutate `activeCues` membership, fire `handleEndBehavior`, dispatch crossfade triggers, or dispatch stop-fade triggers.

#### Scenario: Disabling the UI interval does not affect transitions
- **GIVEN** a cue is actively playing with crossfade and stop-fade configured
- **WHEN** the UI progress interval is hypothetically stopped (test condition)
- **THEN** all transitions (end, crossfade, stop-fade, loop) SHALL still fire correctly
- **AND** only UI fields (`cue.currentTime`, group accumulated time, levels) SHALL stop updating

### Requirement: Terminal cleanup is centralised

Cue terminal cleanup — clearing the progress interval, clearing any pending scheduled-trigger timeouts, removing the entry from `activeCues`, restoring ducked volumes, propagating group-end if applicable, and firing `handleEndBehavior` — SHALL be performed by a single private routine. No other code path SHALL implement cleanup independently.

#### Scenario: Cleanup is idempotent
- **WHEN** terminal cleanup is invoked twice for the same cue (e.g., scheduled trigger races `onend`)
- **THEN** the second invocation SHALL be a no-op
- **AND** `handleEndBehavior` SHALL fire exactly once
