## Context

The fork's audio core (`useAudioEngine.ts`, ~42 KB Howler) and its UI derivatives (`VUMeter`, renderer volume/master slider) are superseded by the server: meters arrive via WS (`StereoMeter` / `LiveMeterBar`), volume/routing via REST (`VolumeSlider`, routing matrix, `useOutputTarget`). Several fork bug fixes (loop Howl-leak, stop-fade skip, −10 dB offset) addressed Howler-specific behavior that no longer exists.

## Goals / Non-Goals

**Goals:**

- Zero Howler code or dependency remaining.
- All audio behavior (play/stop/fade/loop/volume/routing/meters) sourced from the server.
- End-to-end verification on all target platforms.

**Non-Goals:**

- New audio features (engine is upstream's).
- Performance tuning of the C++ engine.

## Decisions

1. **Delete, don't wrap** — remove Howler entirely once features are ported; no compatibility shim.
2. **Server is the single source of truth** for transport, meters, volume, routing.
3. **Retire fork audio specs** — `cue-playback`, `main-volume-control` are superseded; archive accordingly.
4. **Gate the cutover on verification** — only remove Howler after server-driven equivalents are confirmed working.

## Risks / Trade-offs

- [Hidden Howler references in ported features] → grep + typecheck to catch; tests on transport flows.
- [Behavioral parity gaps (e.g., fade curves, loop edges)] → verify against the fork's known-good behavior; file follow-ups if the engine differs.
- [Cross-platform regressions] → run on Windows/macOS/Linux before sign-off.
