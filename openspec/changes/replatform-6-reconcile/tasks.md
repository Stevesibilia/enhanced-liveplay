# Tasks — replatform-6-reconcile

## Group 1: MIDI

- [ ] 1.1 Diff fork `useMidiController` + `MidiConfigModal` vs upstream `useMidiController`
- [ ] 1.2 Choose the superior implementation; document rationale
- [ ] 1.3 Ensure MIDI transport actions issue server REST/WS commands
- [ ] 1.4 Port/keep tests; delete the losing implementation

## Group 2: Cart Hotkeys

- [ ] 2.1 Diff fork `useCartHotkeys` vs upstream
- [ ] 2.2 Consolidate to one implementation; keep hotkey tests
- [ ] 2.3 Verify against server transport

## Group 3: Schema / Migrations

- [ ] 3.1 Enumerate every case in fork `utils/migrations.ts`
- [ ] 3.2 Map each case to the C++ `ProjectState::load` migration + `RepairInfo`
- [ ] 3.3 Drop cases the server already handles
- [ ] 3.4 Fill remaining audio-schema gaps server-side or as a pre-load client check
- [ ] 3.5 Confirm visual-field migration is owned by Phase 4 (no overlap)

## Group 4: Runtime Version

- [ ] 4.1 Assess effort: re-apply Nuxt 4 / Electron 42 vs upstream baseline
- [ ] 4.2 Decide and document the runtime version
- [ ] 4.3 Apply consistently across `client/`; typecheck green

## Group 5: Verification

- [ ] 5.1 Single MIDI + single cart-hotkeys path, both functional
- [ ] 5.2 Load a 1.x project: migration correct, no data loss
- [ ] 5.3 `nuxi typecheck` + `vitest run` green on chosen runtime
