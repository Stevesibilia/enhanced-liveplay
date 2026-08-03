## ADDED Requirements

### Requirement: Viewer page served over HTTP
The system SHALL serve a browser-renderable viewer page from the API server at a stable path (`/player`) that renders the current `displayState` identically to the local player window.

#### Scenario: Remote browser loads the viewer
- **WHEN** a browser on the LAN requests `GET /player` from the API server
- **THEN** the server responds with an HTML page that renders visual layers using the same layer, geometry, z-order, and fade logic as the local player window

#### Scenario: Viewer renders current state on load
- **WHEN** the viewer page finishes loading and a `displayState` is already buffered
- **THEN** the page renders that buffered state without waiting for the next update

### Requirement: Media streamed over HTTP
The system SHALL stream local media files to remote clients over HTTP so images referenced in `displayState` are viewable in a browser that cannot resolve the `local-media://` protocol.

#### Scenario: Image layer resolves in a remote browser
- **WHEN** the viewer page renders an image layer whose `mediaPath` is an absolute local path
- **THEN** the image element requests the media over HTTP from the API server and displays the file contents

#### Scenario: Path outside the project media directory is refused
- **WHEN** a media request resolves to a path outside the current project's media directory
- **THEN** the server refuses the request and does not stream the file

#### Scenario: Missing media file
- **WHEN** a media request targets a path that does not exist
- **THEN** the server responds with a not-found status and the viewer renders no image for that layer

### Requirement: Live display-state push to remote viewers
The system SHALL push every `displayState` update to all connected remote viewers over a live one-way channel so the remote screen reflects operator changes without manual refresh.

#### Scenario: Operator triggers a visual
- **WHEN** the operator changes the visual output and `displayState` is updated
- **THEN** every connected remote viewer receives the new `displayState` and re-renders to match the local player window

#### Scenario: Viewer connects mid-session
- **WHEN** a remote viewer opens its live channel while a `displayState` is already active
- **THEN** the server sends the buffered `lastDisplayState` to that viewer immediately

#### Scenario: Viewer reconnects after a drop
- **WHEN** a remote viewer's live channel drops and the browser reconnects
- **THEN** the server sends the current buffered `displayState` so the viewer restores the correct visual

### Requirement: Remote viewer serving is operator-toggled
The system SHALL gate the remote viewer routes (`/player`, `/media`, `/events`) behind an operator toggle that is off by default, so remote file streaming is opt-in. This toggle SHALL be surfaced together with the existing local player-window toggle as unified viewer-output controls.

#### Scenario: Remote viewing disabled by default
- **WHEN** the application starts and the operator has not enabled remote viewing
- **THEN** requests to `/player`, `/media`, and `/events` are refused and no media is streamed

#### Scenario: Operator enables remote viewing
- **WHEN** the operator turns on the remote viewer toggle
- **THEN** the remote routes respond and the viewer URL becomes reachable

#### Scenario: Operator disables remote viewing mid-session
- **WHEN** the operator turns off the remote viewer toggle while a viewer is connected
- **THEN** the server stops serving the remote routes and open live channels are closed

#### Scenario: Local and remote toggles surfaced together
- **WHEN** the operator opens the viewer-output controls
- **THEN** both the local player-window toggle and the remote viewer toggle are presented in one place

### Requirement: Viewer URL surfaced to the operator as text and QR
The system SHALL present the operator with the reachable viewer URL — including the LAN address and the actual bound port of the API server — as both selectable text and a scannable QR code, shown while remote viewing is enabled.

#### Scenario: Operator reads the viewer URL
- **WHEN** remote viewing is enabled and the API server is running
- **THEN** the operator UI displays a viewer URL of the form `http://<lan-ip>:<port>/player` as selectable text and as a QR code encoding that URL

#### Scenario: Server started on a fallback port
- **WHEN** the API server binds a fallback port because its default port was in use
- **THEN** both the displayed text URL and the QR code reflect the fallback port, not the default

### Requirement: Local player window unaffected
The system SHALL keep the local Electron player window's IPC-based rendering path and the `displayState` schema unchanged; the remote viewer is an additional parallel delivery path.

#### Scenario: Local window still renders via IPC
- **WHEN** the operator opens the local player window
- **THEN** it receives `displayState` over IPC and renders as before, independent of whether any remote viewer is connected
