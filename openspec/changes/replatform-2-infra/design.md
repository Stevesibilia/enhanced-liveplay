## Context

The fork carries substantial tooling absent upstream: OpenSpec (`openspec/`), agent instructions (`AGENTS.md`, `.claude/`), a vitest suite (`tests/`, `vitest.config.ts`), a `justfile`, and CI (`ci.yml` from the `ci-testing` change). Upstream provides `build-server.yml` + `build-release.yml` but no PR-time typecheck/test gate. The new tree is a monorepo (`client/` + `server/`), so test/build paths shift under `client/`.

## Goals / Non-Goals

**Goals:**

- Spec-driven workflow + agent rules active on the new branch.
- PR gating: typecheck + unit tests run on every PR.
- CI builds the C++ server (catch toolchain breakage early).
- Markdown auto-format recipe available.

**Non-Goals:**

- Writing new feature tests (each port phase owns its own tests).
- Changing upstream's release/packaging pipeline beyond what integration needs.

## Decisions

1. **Root-level OpenSpec/agent rules** — keep `openspec/` and `AGENTS.md` at the monorepo root; client-specific notes can live in `client/`.
2. **Adapt, don't rewrite, the test suite** — repoint existing tests to `client/app/**`; keep vitest.
3. **Layer CI** — reuse upstream's server build workflow; add a lightweight `ci.yml` (typecheck + vitest) scoped to `client/`. Use GHA vcpkg cache for server build speed.
4. **Carry forward the `ci-testing` change** — fold its intent into the new CI rather than re-deriving.

## Risks / Trade-offs

- [Path drift after move to `client/`] → fix imports/config once; covered by typecheck job.
- [Server build in PR CI is slow] → cache vcpkg; optionally gate server build to `server/**` path changes.
- [Two CI lineages (upstream + fork)] → consolidate to avoid duplicate runs.
