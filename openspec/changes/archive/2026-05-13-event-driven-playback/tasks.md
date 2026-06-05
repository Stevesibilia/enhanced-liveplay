## 1. Spike: verify Howler event reliability under `html5: true`

- [x] 1.1 In a scratch branch, load a Howl with a sprite (`inPoint`, `outPoint`) and `html5: true` matching the engine config; log timestamps for `onend`, `onplay`, `onstop`, `onpause`.
- [x] 1.2 Confirm `onend` fires at sprite `outPoint` (not only at underlying file end). If not, capture the actual fire time and decide between (a) scheduled `setTimeout(stop, trimmedDuration*1000)` for end detection, or (b) listening to `HTMLAudioElement.timeupdate` from the underlying media element.
- [x] 1.3 Update `design.md` D1 with the verified result (one paragraph addendum).

## 2. Scheduling infrastructure (additive, behind internal flag)

- [x] 2.1 Extend `ActiveCueState` with `crossFadeTimeout?: ReturnType<typeof setTimeout>`, `stopFadeTimeout?: ReturnType<typeof setTimeout>`, and `crossFadeAtMs?: number` / `stopFadeAtMs?: number` absolute audio-time targets.
- [x] 2.2 Add a private `scheduleCueTriggers(cue, item)` helper invoked from `setupCueForPlayback`'s `onload` handler after `howl.duration()` resolves. Computes absolute trigger times and arms timeouts.
- [x] 2.3 Add a private `cancelCueTriggers(cue)` helper that clears both timeouts and unsets the fields.
- [x] 2.4 Add a private `finalizeCue(item, { fromEnd: boolean })` consolidating: clear progress interval, `cancelCueTriggers`, `activeCues.delete`, `restoreDuckedVolumes`, group-end propagation, `handleEndBehavior`. Make it idempotent (early return if cue already gone).
- [x] 2.5 Add an internal `USE_EVENT_DRIVEN_TRANSITIONS` boolean (module-level const) gating the new path. Off by default for steps 2.x–3.x; flipped on in step 5.

## 3. Wire scheduled triggers in parallel with polling

- [x] 3.1 When the flag is on, `scheduleCueTriggers` arms a crossfade timeout (for non-cart items with `crossFade > 0`) whose callback performs: set `cue.crossFadeTriggered = true`, fade Howl volume to 0 over `crossFade`, resolve next item per `endBehavior`, invoke `startCrossfadeTrack(nextItem, crossFade)`.
- [x] 3.2 When the flag is on, `scheduleCueTriggers` arms a stop-fade timeout (for non-cart items with `stopFade > 0` and no effective crossfade) whose callback fades volume to 0 over `stopFade` and sets `cue.stopFadeTriggered = true`.
- [x] 3.3 When the flag is on, the existing polling-block crossfade/stop-fade checks in the 100 ms interval are skipped. End-detection polling stays for now.
- [x] 3.4 Manual side-by-side check: with flag off, regression-test trimmed-clip playback; with flag on, verify crossfade and stop-fade fire on time. Document method in this checkbox before flipping.

## 4. Pause / resume / seek / mutation handling

- [x] 4.1 Implement `pauseCue(uuid)` to capture remaining ms on each scheduled timeout (`crossFadeAtMs - howl.seek()*1000`), call `cancelCueTriggers`, then pause the Howl.
- [x] 4.2 Implement `resumeCue(uuid)` to re-arm timeouts using the absolute audio-time targets (which are unchanged across pause/resume), then play the Howl.
- [x] 4.3 Implement `seekCue(uuid, time)` that calls `howl.seek(time)` and re-runs `scheduleCueTriggers` for the cue (clearing first). Update existing call sites that wrote `howl.seek(value)` directly to go through this helper.
- [x] 4.4 Add a reactive watcher (or explicit dispatch from `updateItem`) so that mutating `item.crossFade`, `item.stopFade`, `item.outPoint`, or `item.inPoint` on a currently-active cue re-runs `scheduleCueTriggers`. Debounce at 100 ms.

## 5. Flip the flag and remove polling decisions

- [x] 5.1 Set `USE_EVENT_DRIVEN_TRANSITIONS = true` by default; remove the off-branch.
- [x] 5.2 Delete the crossfade-trigger and stop-fade-trigger blocks from the 100 ms interval body. The interval now updates only `cue.currentTime`, `updateAudioLevels()`, and group accumulated time.
- [x] 5.3 Replace the polling end-detection block in the interval with either (a) reliance on `onend` (if spike 1.2 verified), or (b) a scheduled end-timeout armed at the same time as crossfade/stop-fade. Either way, the interval no longer calls `howl.stop()` / `activeCues.delete` / `handleEndBehavior`.
- [x] 5.4 Move the `onend` handler body to call `finalizeCue(item, { fromEnd: true })` only.
- [x] 5.5 Move the existing `stopCue` cleanup to call `cancelCueTriggers` before fade-out, then `finalizeCue` after fade-out completes. Verify external-stop no longer spawns next-track via stale trigger (spec scenario "Stopping before crossfade does not spawn next track").

## 6. Cart-item path

- [x] 6.1 Verify cart items (`item.index[0] === -1`) never get a crossfade or stop-fade trigger scheduled (matching the existing polling-block guard).
- [x] 6.2 Verify cart items still get end detection via the chosen mechanism in 5.3.

## 7. Tests (establishes the testing pattern)

- [x] 7.1 Add `vitest` to `devDependencies` and a minimal `vitest.config.ts` if not present; add `test` script to `package.json`.
- [x] 7.2 Unit-test pure scheduling math: given `trimmedDuration`, `inPoint`, `outPoint`, `crossFade`, `stopFade`, compute correct trigger offsets and which triggers should be armed.
- [x] 7.3 Unit-test `finalizeCue` idempotence using a stub `activeCues` map and stub `handleEndBehavior` — call twice, assert `handleEndBehavior` invoked once.
- [x] 7.4 Integration-style test using a fake Howl (with controllable `duration()`, `seek()`, `volume()`, `fade()`, and event hooks) to verify a full cue lifecycle including pause/resume re-scheduling.

## 8. Documentation and cleanup

- [x] 8.1 Update `pain_points.md` to mark item #2 (audio-thread races) as addressed by this change, with pointer to the merged commit.
- [x] 8.2 Add a short comment block at the top of `setupCueForPlayback` summarising the event-driven lifecycle for future readers.
- [x] 8.3 Remove any now-dead helper code surfaced by step 5 (e.g., the polling-block branches; the `cue.crossFadeTriggered` / `cue.stopFadeTriggered` flags may simplify or change usage).
- [ ] 8.4 Manual smoke test: play a group with crossfaded chain; toggle loop mid-play; pause/resume; seek backward across a crossfade boundary; externally stop ~1 s before crossfade. All match spec scenarios.
