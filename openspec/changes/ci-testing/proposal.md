## Why

The project has 28 unit tests and a working typecheck, but neither runs in CI. A broken PR can merge to `dev` undetected. Before adding features (e.g., Spotify import), we need a safety net that catches regressions automatically on every PR.

## What Changes

- Add a new GitHub Actions workflow (`ci.yml`) that runs on every PR and push to `dev`
- Three parallel jobs: typecheck, test (with coverage report), build verification
- Expand the unit test suite to cover untested pure functions (`audio.ts` math, `useCartHotkeys` logic)
- Add `@vitest/coverage-v8` for coverage reporting (informational, not gating)

## Capabilities

### New Capabilities
- `ci-pipeline`: GitHub Actions CI workflow configuration, job structure, and test gating rules

### Modified Capabilities
_(none)_

## Impact

- New file: `.github/workflows/ci.yml`
- New dev dependency: `@vitest/coverage-v8`
- New test files: `tests/audio.test.ts`, `tests/cart-hotkeys.test.ts`
- No runtime code changes
- Test count expected to increase from 28 to ~50+
