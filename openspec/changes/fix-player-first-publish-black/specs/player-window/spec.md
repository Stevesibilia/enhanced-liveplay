## MODIFIED Requirements

### Requirement: Display state communication
The main renderer SHALL send display state updates to the player window via IPC through the main process. The main process SHALL cache the most recently pushed display state and SHALL guarantee delivery to the player renderer once that renderer is ready, buffering any state pushed before the renderer has attached its display-state listener.

The player renderer SHALL signal readiness to the main process after it has loaded and registered its display-state listener. On receiving that readiness signal, the main process SHALL flush the cached display state to the player window. As a fallback, the main process SHALL also flush the cached state when the player window's web contents finish loading.

#### Scenario: First push after auto-opening the window
- **GIVEN** the player window is not open
- **WHEN** the main renderer pushes a display state (auto-opening the window)
- **THEN** the state SHALL be cached by the main process
- **AND** the player window SHALL render that state once its renderer signals readiness
- **AND** the state SHALL NOT be dropped even if the renderer was not yet loaded when the push occurred

#### Scenario: Push while renderer not yet ready
- **GIVEN** the player window has been created but its renderer has not yet signalled readiness
- **WHEN** the main renderer pushes a display state
- **THEN** the main process SHALL store the state and defer sending
- **AND** SHALL send it as soon as the renderer signals readiness

#### Scenario: Multiple pushes before ready collapse to latest
- **GIVEN** the player window is loading
- **WHEN** several display states are pushed in quick succession before the renderer is ready
- **THEN** only the most recently pushed state SHALL be rendered when the renderer becomes ready

#### Scenario: Push when renderer already ready
- **WHEN** the main renderer pushes a display state and the player renderer has already signalled readiness
- **THEN** the player window SHALL render that state immediately

### Requirement: Window position memory
The player window SHALL remember its position and size within the application session, and SHALL restore the current display state when reopened. When closed and reopened, it SHALL restore to its last position and re-render the last pushed composition rather than showing black.

#### Scenario: Reopen after close restores position and content
- **GIVEN** the player window was showing a published composition
- **WHEN** the player window is closed and then reopened in the same app session
- **THEN** it SHALL appear at the same position and size as when it was closed
- **AND** it SHALL re-render the last pushed display state once its renderer signals readiness

#### Scenario: First open in session
- **WHEN** the player window is opened for the first time in a session
- **THEN** it SHALL open with default size on the primary display
