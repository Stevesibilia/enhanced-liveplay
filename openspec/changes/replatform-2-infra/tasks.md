# Tasks — replatform-2-infra

## Group 1: OpenSpec & Agent Rules

- [ ] 1.1 Re-land `openspec/` at the monorepo root on the integration branch
- [ ] 1.2 Re-land `AGENTS.md` and `.claude/` (adapt paths for `client/` + `server/`)
- [ ] 1.3 Re-land `justfile` and the markdown auto-format recipe

## Group 2: Test Suite

- [ ] 2.1 Re-land `vitest.config.ts` + `tests/`; repoint paths to `client/app/**`
- [ ] 2.2 Run `npx vitest run` — fix path/import drift until green
- [ ] 2.3 Confirm `nuxi typecheck` passes on `client/`

## Group 3: CI

- [ ] 3.1 Keep upstream `build-server.yml` / `build-release.yml`; verify they run on the branch
- [ ] 3.2 Add `ci.yml`: typecheck + vitest jobs scoped to `client/` (Node 24, npm cache)
- [ ] 3.3 Add/confirm GHA vcpkg cache for the server build job
- [ ] 3.4 Consolidate duplicate workflows; ensure PRs to integration branch are gated

## Group 4: Repo Hygiene

- [ ] 4.1 Reconcile `.gitignore`, `package.json` scripts, `nuxt.config.ts` for monorepo
- [ ] 4.2 Verify `guides/` docs (incl. REPLATFORM-MIGRATION-PLAN.md) carried over

## Group 5: Verification

- [ ] 5.1 Open a PR into the integration branch; confirm typecheck + tests + server build run
- [ ] 5.2 Confirm OpenSpec change validation works (`openspec` tooling)
