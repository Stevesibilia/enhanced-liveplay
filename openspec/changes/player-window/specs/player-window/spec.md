## ADDED Requirements

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
The main renderer SHALL send display state updates to the player window via IPC through the main process. The display state SHALL be an object with type ('black', 'image', or 'pdf'), optional mediaPath, and optional pdfPage.

#### Scenario: Pushing an image to player
- **WHEN** main renderer sends a display state with type 'image' and a mediaPath
- **THEN** the player window SHALL display that image

#### Scenario: Pushing black screen
- **WHEN** main renderer sends a display state with type 'black'
- **THEN** the player window SHALL show a solid black screen

#### Scenario: Pushing a PDF page
- **WHEN** main renderer sends a display state with type 'pdf', mediaPath, and pdfPage
- **THEN** the player window SHALL render that specific page of the PDF

### Requirement: Image rendering
Images SHALL be displayed centered on a black background, scaled to fit within the window without cropping or distortion (object-fit: contain behavior).

#### Scenario: Landscape image in landscape window
- **WHEN** a landscape image is pushed to a landscape-oriented player window
- **THEN** the image SHALL fill the width with black bars top/bottom if aspect ratios differ

#### Scenario: Portrait image in landscape window
- **WHEN** a portrait image is pushed to a landscape-oriented player window
- **THEN** the image SHALL fill the height with black bars on the sides

### Requirement: PDF page rendering
PDFs SHALL be rendered one page at a time using pdf.js. The rendered page SHALL be scaled to fit the window (same contain behavior as images) on a black background.

#### Scenario: Displaying PDF page 3
- **WHEN** a display state with type 'pdf', a valid mediaPath, and pdfPage 3 is received
- **THEN** page 3 of the PDF SHALL be rendered to fill the player window

#### Scenario: Invalid page number
- **WHEN** pdfPage exceeds the PDF's page count
- **THEN** the last page of the PDF SHALL be displayed

### Requirement: Window position memory
The player window SHALL remember its position and size within the application session. When closed and reopened, it SHALL restore to its last position.

#### Scenario: Reopen after close
- **WHEN** the player window is closed and then reopened in the same app session
- **THEN** it SHALL appear at the same position and size as when it was closed

#### Scenario: First open in session
- **WHEN** the player window is opened for the first time in a session
- **THEN** it SHALL open with default size (1920x1080) on the primary display

### Requirement: Fullscreen support
The player window SHALL support toggling fullscreen mode via keyboard shortcut (F11) or programmatic control from the main window.

#### Scenario: Toggle fullscreen
- **WHEN** F11 is pressed in the player window
- **THEN** the window SHALL toggle between fullscreen and windowed mode
