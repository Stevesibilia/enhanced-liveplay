## Context

Currently the only CI is `build-release.yml` which triggers on version bumps to `dev`. It runs `npm run build` + `electron-builder` but never runs tests or typecheck. The test suite (vitest, 28 tests) and typecheck (`nuxi typecheck`) only run manually.

## Goals / Non-Goals

**Goals:**
- Every PR gets automatic feedback on type safety, test results, and build viability
- Expand test coverage for pure utility functions and hotkey logic
- Coverage report visible in PR (informational)
- Fast feedback: target < 3 minutes total CI time

**Non-Goals:**
- E2E / Playwright tests (audio playback can't be verified programmatically in CI)
- Component tests (high setup cost, low value for Electron app)
- Coverage gating (don't fail CI on coverage percentage)
- Linting (no linter configured yet — separate effort)
- Branch protection rules (step 2, separate from this change)

## Decisions

1. **Separate workflow file** — `ci.yml` triggers on PRs and pushes to `dev`. Doesn't touch `build-release.yml` which serves a different purpose (packaging).

2. **Three parallel jobs** — typecheck, test, and build run concurrently on `ubuntu-latest`. Parallel gives faster feedback; all three are independent.

3. **Coverage via `@vitest/coverage-v8`** — Uses V8's built-in coverage (no Istanbul instrumentation overhead). Outputs a summary to the GitHub Actions step output. Not used as a gate.

4. **Node 24 + npm cache** — Match the version used in `build-release.yml` for consistency.

5. **Test expansion targets** — `audio.ts` (pure math, 5 exported functions, easy edge cases) and `useCartHotkeys.ts` (binding match, conflict detection). These are the highest-value untested modules that don't require mocking Electron/DOM.

## Risks / Trade-offs

- [CI adds ~2 min to every PR] → Acceptable for the safety it provides
- [Tests don't cover Electron-specific behaviour] → Acknowledged; the pure logic layer is where most regressions occur anyway
- [`useCartHotkeys` needs partial extraction to be testable] → May need to extract pure matching logic into a utility function
