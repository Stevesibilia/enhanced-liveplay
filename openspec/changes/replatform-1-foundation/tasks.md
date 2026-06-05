# Tasks — replatform-1-foundation

## Group 1: Branch & Tree

- [x] 1.1 Ensure `upstream` remote points to `github.com/tdoukinitsas/liveplay`; fetch tags
- [x] 1.2 Create branch `feat/replatform-server` from `upstream/main`
- [x] 1.3 Confirm tree has `client/` + `server/` + `scripts/` (upstream monorepo shape)

## Group 2: Build Toolchain (via Docker)

- [x] 2.1 Ensure Docker is installed on the dev host (`docker --version`)
- [x] 2.2 Build server binary: `just build-server` (builds `server/Dockerfile.build` image, outputs to `server/dist/liveplay-server`)
- [x] 2.3 Confirm binary runs: `./server/dist/liveplay-server --help` or equivalent smoke
- [x] 2.4 Record any Docker/build fixes needed in design.md

## Group 3: Client ↔ Server Runtime

- [x] 3.1 `npm install` in `client/`; binary at `server/build/liveplay-server`
- [ ] 3.2 Confirm client spawns local server (`LocalServerStatus` shows running)
- [x] 3.3 Confirm REST reachable: `GET http://localhost:4480/api/health` → `{"name":"liveplay-server","ok":true}`
- [ ] 3.4 Confirm WebSocket `/ws` meters stream (StereoMeter updates)
- [ ] 3.5 Confirm UDP `:4481` discovery beacon (optional on single host)

## Group 4: Verification

- [ ] 4.1 Open a sample project; play a cue; confirm audio + meters
- [ ] 4.2 Document toolchain prerequisites in `guides/DEVELOP.md` (or new section)
- [ ] 4.3 Sign off: server builds + client connects on the dev platform
