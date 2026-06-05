# Tasks — replatform-1-foundation

## Group 1: Branch & Tree

- [x] 1.1 Ensure `upstream` remote points to `github.com/tdoukinitsas/liveplay`; fetch tags
- [x] 1.2 Create branch `feat/replatform-server` from `upstream/main`
- [x] 1.3 Confirm tree has `client/` + `server/` + `scripts/` (upstream monorepo shape)

## Group 2: Build Toolchain

- [ ] 2.1 Install prerequisites: Node 20 LTS, CMake 3.21+, Ninja, C++20 toolchain
- [ ] 2.2 Install vcpkg; export `VCPKG_ROOT`
- [ ] 2.3 Configure server: `cmake --preset default` in `server/`
- [ ] 2.4 Build server: `cmake --build --preset default`
- [ ] 2.5 Record any per-platform fixes needed in design.md

## Group 3: Client ↔ Server Runtime

- [ ] 3.1 `npm install` at root; build/run client (`npm run dev` or generate)
- [ ] 3.2 Confirm client spawns local server (`LocalServerStatus` shows running)
- [ ] 3.3 Confirm REST reachable: `GET http://localhost:4480/api/health`
- [ ] 3.4 Confirm WebSocket `/ws` meters stream (StereoMeter updates)
- [ ] 3.5 Confirm UDP `:4481` discovery beacon (optional on single host)

## Group 4: Verification

- [ ] 4.1 Open a sample project; play a cue; confirm audio + meters
- [ ] 4.2 Document toolchain prerequisites in `guides/DEVELOP.md` (or new section)
- [ ] 4.3 Sign off: server builds + client connects on the dev platform
