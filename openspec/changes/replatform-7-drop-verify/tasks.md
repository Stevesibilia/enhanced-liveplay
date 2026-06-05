# Tasks — replatform-7-drop-verify

## Group 1: Remove Howler Core

- [ ] 1.1 Delete `useAudioEngine.ts` (Howler) and all imports
- [ ] 1.2 Remove Howler-specific fixes (loop Howl-leak, stop-fade skip, −10 dB offset)
- [ ] 1.3 Remove `howler` from `package.json`; `npm install`

## Group 2: Replace UI Derivatives

- [ ] 2.1 Remove fork `VUMeter`; use upstream `StereoMeter` / `LiveMeterBar`
- [ ] 2.2 Remove renderer volume/master slider; use upstream `VolumeSlider` + routing matrix
- [ ] 2.3 Confirm `useOutputTarget` covers device routing + loudness

## Group 3: Sweep

- [ ] 3.1 Grep for residual `howler` / engine references; remove
- [ ] 3.2 `nuxi typecheck` green with zero Howler references

## Group 4: End-to-End Verification

- [ ] 4.1 Play / stop / fade in/out via server — correct
- [ ] 4.2 Loop + go-to-end behaviors via server — correct
- [ ] 4.3 Volume + master + routing via server — correct
- [ ] 4.4 Meters (StereoMeter) live from WS — correct
- [ ] 4.5 Visual sidecar still triggers from server transport (Phase 4 intact)

## Group 5: Cross-platform Sign-off

- [ ] 5.1 Verify on Windows x64
- [ ] 5.2 Verify on macOS (x64 + arm64)
- [ ] 5.3 Verify on Linux
- [ ] 5.4 Final: zero Howler, full server-driven audio — replatform complete
