## Why

Upstream LivePlay v2.1.1 replaced the monolithic Howler-in-renderer app with a decoupled client-server architecture: a C++20 audio engine (`server/`) plus an Electron+Nuxt remote-control client (`client/`). This fork diverged at merge-base `c8c6b93` (2026-05-10) and cannot cleanly `git merge` the rewrite (files moved `app/`→`client/app/`, audio core swapped). The chosen strategy is **reverse the base**: start from `upstream/main` and re-port this fork's features on top.

Phase 1 establishes that foundation and de-risks the single biggest unknown — building the C++ server toolchain across platforms (upstream CI history shows real macOS/Linux friction). Nothing else proceeds until the server builds and the client connects.

## What Changes

- Create integration branch `feat/replatform-server` from `upstream/main`.
- Build the C++20 server locally (CMake 3.21+, vcpkg, Ninja) on the dev platform.
- Confirm the bundled client launches its local server and connects (REST `:4480`, WS `/ws`, UDP `:4481` discovery).
- Document toolchain prerequisites and any per-platform build fixes discovered.

## Capabilities

### New Capabilities

- `server-backend`: the C++20 audio engine + control server as the adopted backend, its build toolchain, and the client↔server runtime contract.

### Modified Capabilities

_(none — this phase adopts upstream as-is; existing fork specs are superseded in later phases)_

## Impact

- New branch: `feat/replatform-server` (base = `upstream/main`).
- New tree: `server/` (C++), restructured `client/` (was `app/` + `electron/`).
- New build prerequisites: CMake 3.21+, vcpkg (`VCPKG_ROOT`), Ninja, C++20 toolchain.
- No fork feature code yet — pure foundation.
- Blocks: all later replatform phases (2–7).
