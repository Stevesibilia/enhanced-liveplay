## Context

Upstream `server/` uses CMake + vcpkg manifest mode (`vcpkg.json`: nlohmann-json, crow, taglib, miniaudio, miniz) with `CMakePresets.json` (default Ninja preset, vs2022 preset). CI (`build-release.yml`) builds Windows x64, macOS Intel x64, macOS arm64, Linux. The desktop client (`client/electron/main.js`) spawns the server binary locally and manages it via `LocalServerStatus` / `ServerSettingsModal`.

## Goals / Non-Goals

**Goals:**

- A reproducible local build of the C++ server on the dev machine.
- Client connects to its bundled local server and shows running state.
- Captured, written prerequisites + any patches needed to build.

**Non-Goals:**

- Porting any fork feature (Phases 3–7).
- Re-landing fork repo tooling (Phase 2).
- Cross-platform CI for the server (folded into Phase 2 infra).

## Decisions

1. **Reverse the base** — branch from `upstream/main`, not merge upstream into this tree. Keeps upstream's tested server intact; fork features become a patch set.
2. **Build via Docker container** (`server/Dockerfile.build`) — mirrors upstream CI Linux environment exactly (ubuntu 24.04, ninja, pkg-config, libasound2-dev, libpulse-dev, libjack-jackd2-dev, libx11-dev, vcpkg). Avoids host pollution; only Docker required on the dev machine. Binary extracted to `server/dist/liveplay-server` via volume mount. `just build-server` is the single command. CMake preset `default` (Ninja + vcpkg) is used inside the container.
3. **Validate the bundled-local-server topology first** — it is the fork's real deployment (each host runs client + local server, shared project folder). Remote-only topology is out of scope.
4. **Treat toolchain as the gating risk** — if a platform won't build, record the fix here before declaring the phase done.

## Build Notes

- **2026-06-05, Linux x86-64**: clean first build, no patches needed. Binary: 6.1 MB ELF64 dynamically linked. `--help` confirmed working.

## Risks / Trade-offs

- [vcpkg dependency build is slow/fragile in CI] → addressed with GHA vcpkg cache in Phase 2; locally a one-time cost.
- [macOS/Linux C++ build breakage] → upstream already shipped fixes (see their commit log); cherry-pick if a regression appears.
- [AGPL-3.0 server distribution] → keeps source obligations; no license change.
