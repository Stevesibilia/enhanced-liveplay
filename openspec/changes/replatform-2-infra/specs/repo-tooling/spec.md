## ADDED Requirements

### Requirement: OpenSpec Workflow Present

The `openspec/` directory (specs + changes + archive) SHALL be present at the monorepo root and OpenSpec validation SHALL run against it.

#### Scenario: Validate a change

- **WHEN** a developer runs `openspec validate <change-id>`
- **THEN** the tooling SHALL parse the change and report pass/fail

### Requirement: Agent Rules Re-landed

`AGENTS.md` and `.claude/` SHALL be re-landed and updated to reference the new tree (`client/`, `server/`), including branch-naming and release rules.

#### Scenario: Agent rules reference new tree

- **WHEN** an agent reads `AGENTS.md`
- **THEN** the paths and rules SHALL reflect the `client/` + `server/` monorepo

### Requirement: Test Suite Runs On New Tree

The vitest suite SHALL run on the new tree with paths repointed to `client/app/**`, and `npx vitest run` and `nuxi typecheck` SHALL pass.

#### Scenario: Tests pass after move

- **WHEN** a developer runs `npx vitest run`
- **THEN** all tests SHALL pass with no path/import errors

### Requirement: PR Gating CI

A CI workflow SHALL run on every PR targeting the integration branch with at least typecheck and unit-test jobs (Node 24, npm cache).

#### Scenario: PR triggers gating jobs

- **WHEN** a PR is opened against the integration branch
- **THEN** typecheck and test jobs SHALL run and report status

### Requirement: Server Build CI

CI SHALL build the C++ server (reusing/aligning upstream's server build workflow) with a vcpkg cache.

#### Scenario: Server build runs on server changes

- **WHEN** a PR modifies `server/**`
- **THEN** the server build job SHALL run and surface toolchain failures

### Requirement: Markdown Formatting Recipe

The markdown auto-format recipe (`format-md`) SHALL be available via the `justfile` and used for `.md` changes.

#### Scenario: Format a markdown file

- **WHEN** a developer runs the `format-md` recipe on a `.md` file
- **THEN** the file SHALL be formatted with the project's Prettier configuration
