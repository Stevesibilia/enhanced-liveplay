## Purpose

The player window is a separate Electron window that renders the live visual output, managed independently of the main control window.
## Requirements
### Requirement: Player window lifecycle
The system SHALL allow opening and closing a player window from the main window. The player window SHALL be a frameless BrowserWindow with a black background. Only one player window SHALL exist at a time.

#### Scenario: Opening player window
- **WHEN** the user triggers "Open Player Window" from the main window
- **THEN** a frameless BrowserWindow SHALL be created showing a black screen

#### Scenario: Opening when already open
- **WHEN** the user triggers "Open Player Window" while it is already open
- **THEN** the existing player window SHALL be focused (no duplicate created)

#### Scenario: Closing player window
- **WHEN** the user triggers "Close Player Window" or the window is closed
- **THEN** the player window SHALL be destroyed and display state reset to black

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

### Requirement: Image rendering
Images SHALL be displayed within their layer's bounding box on the fixed 16:9 content area, scaled to fit without cropping or distortion (object-fit: contain behavior). Because layer boxes are auto-fitted to image aspect ratio against a constant-aspect canvas, a correctly fitted layer SHALL show no black bands inside its box; the contain behavior remains as a safety net for any box whose aspect ratio differs from its image.

#### Scenario: Fitted layer shows no bands
- **GIVEN** a layer whose box has been auto-fitted to its image's aspect ratio
- **WHEN** it is rendered in the player content area
- **THEN** the image SHALL fill its box with no internal black bands

#### Scenario: Mismatched box still contains image
- **GIVEN** a layer whose box aspect ratio differs from its image
- **WHEN** it is rendered
- **THEN** the image SHALL be scaled to fit within the box without cropping or distortion (black bands where the box exceeds the image)

### Requirement: PDF page rendering
PDFs SHALL be rendered one page at a time using pdf.js. The rendered page SHALL be scaled to fit the window (same contain behavior as images) on a black background.

#### Scenario: Displaying PDF page 3
- **WHEN** a display state with type 'pdf', a valid mediaPath, and pdfPage 3 is received
- **THEN** page 3 of the PDF SHALL be rendered to fill the player window

#### Scenario: Invalid page number
- **WHEN** pdfPage exceeds the PDF's page count
- **THEN** the last page of the PDF SHALL be displayed

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

### Requirement: Fullscreen support
The player window SHALL support toggling fullscreen mode via keyboard shortcut (F11) or programmatic control from the main window.

#### Scenario: Toggle fullscreen
- **WHEN** F11 is pressed in the player window
- **THEN** the window SHALL toggle between fullscreen and windowed mode

### Requirement: Player window auto-closes on visuals disable
When the active project's `visualDisplayEnabled` transitions from `true` to `false`, any open player window SHALL be closed immediately. Any in-flight display state (fades, timed reveals) SHALL be cancelled by the close.

#### Scenario: Player window closes on disable
- **GIVEN** the player window is open and showing content
- **WHEN** the user disables `visualDisplayEnabled`
- **THEN** the player window SHALL be closed
- **AND** any in-flight visual transitions SHALL be cancelled

#### Scenario: No player window open during disable
- **GIVEN** the player window is not open
- **WHEN** the user disables `visualDisplayEnabled`
- **THEN** the disable SHALL succeed with no error

### Requirement: Player window menu item disabled while visuals disabled
The "Open/Close Player Window" menu item (and its `CmdOrCtrl+P` accelerator) SHALL be disabled (greyed out, non-actionable) while the active project's `visualDisplayEnabled` is `false`. The accelerator press SHALL have no effect.

#### Scenario: Menu item greyed while disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user opens the View menu
- **THEN** the "Open/Close Player Window" item SHALL appear disabled

#### Scenario: Accelerator no-op while disabled
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user presses `CmdOrCtrl+P`
- **THEN** no player window SHALL open
- **AND** no error or notification SHALL appear

#### Scenario: Menu item re-enabled on flag-on
- **GIVEN** the active project has `visualDisplayEnabled: false`
- **WHEN** the user re-enables `visualDisplayEnabled`
- **THEN** the "Open/Close Player Window" item SHALL become enabled
- **AND** `CmdOrCtrl+P` SHALL again open the player window

### Requirement: Fixed 16:9 player content area
The player window SHALL render layers onto a fixed 16:9 content area centered within the window, with a black letterbox filling any remaining space. Layer `x/y/width/height` percentages SHALL be interpreted relative to this content area, identical to the composition canvas, giving exact position and aspect-ratio parity between the workspace and the player output.

#### Scenario: Layout parity between workspace and player
- **GIVEN** a published composition laid out in the 16:9 composition canvas
- **WHEN** it is rendered in the player window
- **THEN** each layer SHALL appear at the same relative position and size as in the composition canvas

#### Scenario: Non-16:9 player window letterboxes content
- **GIVEN** the player window is sized or fullscreened to an aspect ratio other than 16:9
- **THEN** the content area SHALL remain 16:9, centered, with black bars filling the remainder
- **AND** layer positions SHALL stay consistent with the composition canvas

#### Scenario: 16:9 player window fills exactly
- **GIVEN** the player window is exactly 16:9
- **THEN** the content area SHALL fill the window with no visible letterbox bars

