## ADDED Requirements

### Requirement: Howler Removal

`useAudioEngine.ts` (Howler) and all Howler imports SHALL be deleted, the `howler` dependency SHALL be removed from `package.json`, and typecheck SHALL pass with zero Howler references.

#### Scenario: No Howler remains

- **WHEN** the codebase is searched and typechecked
- **THEN** there SHALL be no `howler` import or dependency

### Requirement: Meters From Server

Metering SHALL use upstream `StereoMeter` / `LiveMeterBar` fed by the WS meter stream, and the fork's renderer `VUMeter` SHALL be removed.

#### Scenario: Live meters from WS

- **WHEN** a cue plays
- **THEN** meter levels SHALL update from the server WS stream

### Requirement: Volume And Routing From Server

Volume, master, device routing, and loudness SHALL be driven by the server (`VolumeSlider`, routing matrix, `useOutputTarget`), and the fork's renderer volume/master slider SHALL be removed.

#### Scenario: Master volume via server

- **WHEN** the user changes master volume
- **THEN** the change SHALL be applied by the server

### Requirement: Obsolete Fixes Removed

Howler-specific bug-fix code (loop Howl-leak handling, stop-fade skip, −10 dB offset) SHALL be removed as moot under the C++ engine.

#### Scenario: Loop without Howler workaround

- **WHEN** a looping item plays
- **THEN** it SHALL loop correctly with no Howler-specific workaround code present

### Requirement: Behavioral Parity

Play, stop, fade in/out, loop, and go-to-end behaviors SHALL work correctly via the server at parity with the fork's known-good behavior; gaps SHALL be filed as follow-ups.

#### Scenario: Transport parity

- **WHEN** play, stop, fade, loop, and go-to-end are exercised
- **THEN** each SHALL behave correctly via the server

### Requirement: Cross-platform Verification

The full server-driven application SHALL be verified on Windows x64, macOS (x64 + arm64), and Linux before the replatform is declared complete, and the visual sidecar SHALL still trigger from server transport.

#### Scenario: Verified on all platforms

- **WHEN** the app is tested on each target platform
- **THEN** server-driven audio and the visual sidecar SHALL work on each
