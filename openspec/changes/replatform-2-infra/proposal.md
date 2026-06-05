## Why

The integration branch is based on upstream, which lacks this fork's development infrastructure: OpenSpec workflow, agent rules, test suite, CI gating, formatter recipes, and the `justfile`. Re-landing this tooling early gives every later port phase a working safety net (tests + typecheck + CI) and the spec-driven workflow the team relies on.

## What Changes

- Re-land repo tooling at the new monorepo root / `client/`: `.claude/`, `AGENTS.md`, `openspec/`, `justfile`, `vitest.config.ts`, `tests/`.
- Adapt the test suite to the new tree (paths now under `client/`).
- Add CI that also builds the C++ server (extend or align with upstream's `build-server.yml` / `build-release.yml`), plus the fork's PR gating (typecheck + tests).
- Reconcile `.gitignore`, `package.json` scripts, and `nuxt.config.ts` for the monorepo layout.

## Capabilities

### New Capabilities

- `repo-tooling`: the fork's development infrastructure (OpenSpec, agent rules, tests, CI gating, formatter, justfile) re-established on the replatformed tree.

### Modified Capabilities

_(none — supersedes pre-replatform tooling rather than amending a current spec)_

## Impact

- New/moved files: `.claude/`, `AGENTS.md`, `openspec/`, `justfile`, `vitest.config.ts`, `tests/**`.
- New/updated CI workflows under `.github/workflows/` (server build + PR gating).
- Depends on: `replatform-1-foundation`.
- Blocks: feature port phases benefit from CI but are not hard-blocked.
