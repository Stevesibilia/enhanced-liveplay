## ADDED Requirements

### Requirement: Adopted C++ Backend Architecture

The application backend SHALL be the upstream C++20 audio engine (`server/`) using miniaudio, Crow, TagLib, and nlohmann-json. The Electron+Nuxt client (`client/`) SHALL act as a remote control only and SHALL NOT run a renderer-side audio engine.

#### Scenario: Client has no renderer audio engine

- **WHEN** the client plays a cue
- **THEN** playback SHALL be performed by the C++ server, not by a renderer audio library

#### Scenario: Backend identity

- **WHEN** the integration branch is established
- **THEN** the tree SHALL contain `server/` (C++ engine) and `client/` (remote control)

### Requirement: Integration Base Is Upstream

Work SHALL proceed on branch `feat/replatform-server` based on `upstream/main`. The fork's pre-replatform `app/` + `electron/` tree SHALL NOT be merged into the new tree.

#### Scenario: Branch created from upstream

- **WHEN** the integration branch is created
- **THEN** its base SHALL be `upstream/main` and it SHALL include upstream's `client/` and `server/`

### Requirement: Buildable Server Toolchain

The server SHALL build from source with CMake 3.21+, vcpkg (manifest mode, `VCPKG_ROOT` set), Ninja, and a C++20 toolchain via the CMake `default` preset.

#### Scenario: Local server build succeeds

- **WHEN** a developer runs `cmake --preset default` then `cmake --build --preset default` in `server/`
- **THEN** the server binary SHALL build successfully on the dev platform

### Requirement: Client-Server Communication Contract

The client SHALL communicate with the server via REST at `http://<host>:4480`, WebSocket at `ws://<host>:4480/ws` (~60 Hz meters + transport/routing), and UDP `:4481` for LAN discovery.

#### Scenario: Health endpoint reachable

- **WHEN** the server is running and the client requests `GET /api/health`
- **THEN** the request SHALL succeed

#### Scenario: Meter stream active

- **WHEN** a cue is playing
- **THEN** the client SHALL receive meter updates over the WebSocket `/ws` channel

### Requirement: Bundled Local-Server Topology

The desktop app SHALL bundle and spawn a local server per host via `client/electron/main.js` and surface its running/stopped state to the user.

#### Scenario: Local server spawned on launch

- **WHEN** the desktop app launches
- **THEN** it SHALL start a local server and display its running state

### Requirement: Foundation Acceptance Criteria

The phase SHALL be considered complete only when, on the dev platform, the server builds, the client connects to its local server, `GET /api/health` succeeds, and a sample project plays a cue with live meters.

#### Scenario: End-to-end smoke test

- **WHEN** a developer opens a sample project and plays a cue
- **THEN** audio SHALL play and meters SHALL update live
