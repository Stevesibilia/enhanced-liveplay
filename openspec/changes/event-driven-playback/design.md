## Context

`useAudioEngine.ts` runs every active cue through a 100 ms `setInterval` created inside `setupCueForPlayback`'s `onload` callback (`app/composables/useAudioEngine.ts:254`). That interval is the single decision-maker for:

1. End detection (compare `howl.seek()` against `outPoint` / file duration → `howl.stop()`, delete from `activeCues`, fire `handleEndBehavior`).
2. Crossfade trigger (when `timeRemaining ≤ item.crossFade` → fade current down, start next via `startCrossfadeTrack`).
3. Stop-fade trigger (when `timeRemaining ≤ item.stopFade` → fade current down).
4. UI updates (`cue.currentTime`, group accumulated time, audio levels).
5. Group end propagation (last item in a chain → `stopGroupTracking`).

`onend` exists on the Howl but only handles the "polling missed it" fallback path. The polling slop (up to one tick, ~100 ms) is audible at trim boundaries and is the source of the loop-boundary and loop-toggle races fixed in PR #17. With `html5: true`, Howler's `onend` fires from the `HTMLAudioElement.ended` event on the audio thread, while the polling decisions fire on the JS thread — the two can race even today.

Now that PR #19 consolidated Howl creation into `setupCueForPlayback`, all five concerns above live in one function and one interval. That's the seam we exploit.

## Goals / Non-Goals

**Goals:**
- Engine state transitions (end, crossfade trigger, stop-fade trigger, loop boundary, group end) are driven by events or by timeouts scheduled against `howl.duration()` at load time — not by polling.
- The 100 ms interval survives only as a UI feed: `cue.currentTime`, group accumulated time, level meters. It performs zero engine mutations.
- Transition timing slop drops from ~100 ms (polling tick) to ~10 ms (timer resolution + Howler event dispatch).
- Loop-toggle, pause, seek, and external-stop interactions are handled deterministically without `replace_all`-style fixes in two functions.
- Behavior under `html5: true` is verified, not assumed.

**Non-Goals:**
- Splitting `useAudioEngine.ts` into multiple composables (pain-point #1 follow-up, but separate work).
- Replacing the 100 ms tick with `requestAnimationFrame` for UI smoothness (separate concern, possibly a follow-up).
- Changing the public surface of `useAudioEngine`.
- Web Audio mode (`html5: false`). The app is committed to `html5: true` because it streams from disk via Electron `file://` URLs.
- Sample-accurate transitions. ~10 ms is the target; sub-frame accuracy needs Web Audio scheduling and is out of scope.

## Decisions

### D1: Use `onend` for end detection, not polling

The polling block at `app/composables/useAudioEngine.ts:269-289` (`absoluteTime >= actualFileDuration || absoluteTime >= cue.outPoint`) becomes dead code. End detection collapses into the existing `onend` handler at `:353`.

**Why**: Howler already fires `onend` when the sprite's `outPoint` is reached (sprite math is `[inPoint*1000, (outPoint-inPoint)*1000]`). The polling check is a duplicate detector that races `onend`.

**Alternative considered**: Keep polling as a safety net. Rejected — if `onend` is unreliable on `html5: true` we need to know and fix that, not paper over it. Step 1 of implementation is verifying `onend` fires reliably at sprite end.

### D2: Schedule crossfade and stop-fade as timeouts, not poll-checks

When a cue starts (after `onload` resolves `howl.duration()`), compute:
- `crossFadeAtMs = (trimmedDuration - item.crossFade) * 1000`
- `stopFadeAtMs = (trimmedDuration - item.stopFade) * 1000`

Schedule each as a `setTimeout` stored on `ActiveCueState`. The timeout's callback performs the existing fade + (for crossfade) next-item resolution + `startCrossfadeTrack` call.

**Why**: The trigger time is deterministic once `howl.duration()` is known. Polling for "are we close enough yet" is solving a scheduling problem with a control loop. Timeouts are the right primitive.

**Alternative considered**: Howler's `fade()` `onfade` event chain. Rejected — the trigger needs to fire *before* the fade starts; `onfade` fires *after*. Wrong end of the chain.

**Edge case — pause/resume**: Timeouts don't pause when audio pauses. On pause, capture remaining time on each timeout (`scheduledAt - now`), clear them, and on resume re-schedule with the captured remainder. This mirrors how a sequencer handles this.

**Edge case — seek**: When the user seeks within a cue, scheduled timeouts must be recalculated from the new seek position. Same primitive: clear + recompute + re-schedule.

**Edge case — `crossFade`/`stopFade`/`outPoint` mutation while playing**: Reactive watcher on the active cue's source item; on change, reschedule.

### D3: Keep the 100 ms interval but strip it down to UI only

The interval at `:254` survives, but its body becomes:
```
cue.currentTime = clamp(howl.seek() - inPoint, 0, cue.duration)
updateAudioLevels()
updateGroupProgressForActiveCue(cue)  // accumulated time only
```

No `howl.stop()`, no `activeCues.delete`, no `handleEndBehavior`, no crossfade dispatch, no stop-fade dispatch.

**Why**: UI smoothness still wants a periodic pull of `seek()`. There's no event for "the playhead moved 100 ms" because that's not an event — it's continuous. Polling is correct here.

**Alternative considered**: `requestAnimationFrame`. Defer — would smooth visuals but changes update cadence under tab-hidden conditions, and current 100 ms is fine. Track as follow-up.

### D4: Loop handling stays on Howler

`item.endBehavior.action === 'loop'` already sets `loop: true` on the Howl. Keep that. `onend` short-circuits for looping items (existing behavior at `:355`). No changes.

**Why**: Howler handles the loop boundary on the audio thread, which is more accurate than anything JS can do.

### D5: Single termination path

Today, cue cleanup (`clearInterval`, `activeCues.delete`, `restoreDuckedVolumes`, group-end propagation, `handleEndBehavior`) is duplicated between the polling end-detection block and `onend`. Consolidate into one private `finalizeCue(item)` function called from `onend` only.

**Why**: Eliminates the "fix it in two places" tax for cleanup logic, same way PR #19 eliminated it for setup logic.

### D6: External-stop path (`stopCue`) coordinates with scheduled timeouts

`stopCue` (`:453`) currently clears `cue.progressInterval`. It must also clear `cue.crossFadeTimeout` and `cue.stopFadeTimeout` so an in-flight scheduled trigger doesn't fire after the cue has been externally stopped. The crossfade/stop-fade fade itself is on the Howl and is implicitly cancelled by `howl.stop()`, but the scheduled *trigger* (which spawns the next track) must be explicitly cancelled.

**Why**: Without this, externally stopping a cue ~3 s before its crossfade point would still spawn the next track in the chain.

## Risks / Trade-offs

- **[Risk] `onend` may not fire reliably at the sprite boundary under `html5: true`.** Howler has historically had quirks where `HTMLAudioElement.ended` fires only at the end of the underlying file, not at the sprite end. → Mitigation: implementation step 1 is a behavioral spike — load a sprite, attach `onend`, verify it fires at sprite end across Chrome (Electron) versions. If it doesn't fire reliably, fall back to a scheduled `setTimeout(stop, trimmedDuration*1000)` as the end-detection mechanism (same pattern as crossfade/stop-fade scheduling). Either way, the polling check goes.

- **[Risk] Pause/resume timer drift accumulates.** Capturing `scheduledAt - now` and re-scheduling repeatedly could drift by single-digit ms per pause cycle. → Mitigation: store the *absolute* trigger time when the cue starts (e.g., `performance.now() + crossFadeAtMs`) and on resume re-schedule against that fixed target. Drift becomes zero.

- **[Risk] Seek invalidation is easy to miss.** Any new code path that calls `howl.seek(value)` must also recompute scheduled triggers. → Mitigation: wrap `howl.seek(value)` writes in a `seekCue(uuid, time)` helper that handles rescheduling. No raw `howl.seek(value)` calls outside the engine.

- **[Risk] Reactivity watchers on item fields could fire too often.** A user dragging a `crossFade` slider would reschedule many times. → Mitigation: debounce reschedules (100 ms is fine — same cadence as the UI poll). The user can't hear sub-100ms changes to a not-yet-triggered fade anyway.

- **[Trade-off] More state on `ActiveCueState`.** Adding `crossFadeTimeout`, `stopFadeTimeout`, and absolute trigger timestamps grows the cue record. Worth it — the alternative is recomputing on every tick.

- **[Trade-off] Behavior change at boundaries.** Crossfades and stop-fades will now start ~50-100 ms *earlier* on average (the polling tick is the upper bound of current latency, not the median). This is the user-facing win, but is technically a perceptible behavior change. → Mitigation: call out in proposal/changelog; no migration needed.

## Migration Plan

1. Behavioral spike on `onend` reliability under `html5: true` sprites (D1 risk). Document result in `design.md` as an addendum or update D1.
2. Land scheduling infrastructure (D2) and the `finalizeCue` helper (D5) without removing polling logic — both paths coexist behind an internal feature flag.
3. Verify side-by-side: with the flag off, behavior matches current; with the flag on, transitions fire on schedule. Cover the cases in tasks.md.
4. Flip the flag on by default. Remove the polling decision block and the dead code; reduce the interval to UI-only (D3).
5. Add pause/resume/seek/mutation handling (D2 edge cases) — these don't exist today either, so they're net-new correctness.

Rollback: revert to the polling-only branch. No persisted state or schema changes, so rollback is a code-only revert.

## Open Questions

- Does `onend` fire at sprite end under Electron's bundled Chromium with `html5: true`? (Spike — D1.) If no, the fallback is a scheduled timeout, which works fine.
- Should we expose engine events (`onCueEnd`, `onCrossfadeTriggered`) on the composable so UI components can subscribe instead of polling `activeCues`? Out of scope here, but the seam this change creates would make it trivial. Worth flagging for the engine-split work (pain-point #1 follow-up).
- Is the absolute-time-trigger approach (D2 mitigation for drift) acceptable when the OS sleeps the tab/window? `performance.now()` keeps running but `setTimeout` may be throttled. For a stage app this is unlikely to matter — the window is foregrounded during shows — but worth noting.
