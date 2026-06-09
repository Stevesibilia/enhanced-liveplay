# Tasks — ci-testing

## Group 1: CI Workflow

- [ ] 1.1 Create `.github/workflows/ci.yml` with three parallel jobs: typecheck, test, build
- [ ] 1.2 Typecheck job: checkout → setup node 24 with npm cache → npm install → `npx nuxi typecheck`
- [ ] 1.3 Test job: checkout → setup node 24 → npm install → `npx vitest run --coverage`
- [ ] 1.4 Build job: checkout → setup node 24 → npm install → `npm run build`

## Group 2: Test Infrastructure

- [ ] 2.1 Install `@vitest/coverage-v8` as dev dependency
- [ ] 2.2 Update `vitest.config.ts` to configure coverage provider (`v8`) and reporter (`text-summary`)

## Group 3: Expand Test Suite — audio.ts

- [ ] 3.1 Create `tests/audio.test.ts` with tests for `dbToLinear`: 0 dB → 1.0, -60 dB → 0, -20 dB → 0.1, +6 dB → ~2.0, boundary at -60
- [ ] 3.2 Tests for `linearToDb`: 1.0 → 0 dB, 0 → -60, 0.1 → -20, negative input → -60
- [ ] 3.3 Tests for `calculateRMS`: empty array → 0, single value, known array, zero-length range
- [ ] 3.4 Tests for `estimateCurrentLevel`: zero volume → -60, zero waveform → -60, both 1.0 → 0 dB, clamping at +10
- [ ] 3.5 Tests for `calculateNormalizationGain`: silence → 1, normalization math, same level → gain 1

## Group 4: Expand Test Suite — useCartHotkeys

- [ ] 4.1 Create `tests/cart-hotkeys.test.ts` with tests for `bindingsMatch`: exact match, case-insensitive key, modifier mismatch
- [ ] 4.2 Tests for `isReservedCombo`: Ctrl+S reserved, Ctrl+1 not reserved, Space reserved, F1 reserved
- [ ] 4.3 Tests for `formatKeyLabel`: plain key → "Q", ctrl combo → "Ctrl+S", space → "Space", ShiftRight → "Right Shift", multi-modifier
- [ ] 4.4 Tests for `eventToBinding`: maps key/modifiers correctly, metaKey maps to ctrlKey
- [ ] 4.5 Tests for `globalEventToBinding`: right shift → ShiftRight binding, normal key passthrough

## Group 5: Verification

- [ ] 5.1 Run `npx vitest run --coverage` locally — all tests pass, coverage report prints
- [ ] 5.2 Verify CI workflow YAML is valid (act or manual review of syntax)
- [ ] 5.3 Confirm no existing tests broken
