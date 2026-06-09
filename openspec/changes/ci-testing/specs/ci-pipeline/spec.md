# CI Pipeline

## Purpose
Defines the continuous integration workflow that validates every PR before merge.

## Requirements

### REQ-1: Trigger Conditions
The CI workflow must run on:
- Every pull request targeting `dev`
- Every push to `dev`

### REQ-2: Parallel Jobs
Three independent jobs run concurrently:
- **typecheck**: `npx nuxi typecheck`
- **test**: `npx vitest run --coverage`
- **build**: `npm run build` (Nuxt generate, verifies the app compiles)

### REQ-3: Environment
- Runner: `ubuntu-latest`
- Node.js: 24 (matching build-release.yml)
- Dependencies cached via `actions/setup-node` npm cache

### REQ-4: Coverage Reporting
- Coverage output via `@vitest/coverage-v8`
- Summary printed in job output (human-readable)
- Coverage does NOT gate the workflow (informational only)

### REQ-5: Failure Semantics
- Each job is independent — one failing does not cancel the others
- All three must pass for the overall CI check to be green
- PR merge is not blocked by CI (branch protection is a separate step)

### REQ-6: Test Expansion
New test files must cover:
- `app/utils/audio.ts`: all exported functions with edge cases (zero, negative, boundary values)
- `app/composables/useCartHotkeys.ts`: binding match logic, conflict detection, key formatting (may require extracting pure functions)
