## ADDED Requirements

### Requirement: Visual media item data structure
The system SHALL define a `VisualMediaItem` interface with fields: uuid (string), displayName (string), mediaFileName (string), mediaPath (string, relative to project root), mediaType ('image' | 'pdf'), folder (optional string), linkedCueUuid (optional string referencing an AudioItem UUID), and pdfPage (optional number for last-viewed page).

#### Scenario: Creating a visual media item
- **WHEN** a visual media file is imported into the project
- **THEN** a VisualMediaItem is created with a generated UUID, the original filename as displayName, mediaPath set to "media/visuals/<uuid-prefix>_<filename>", and mediaType derived from file extension

### Requirement: Project stores visual media collection
The Project interface SHALL include a `visualMedia` field (array of VisualMediaItem) and a `visualFolders` field (array of strings representing user-created folder names).

#### Scenario: New project has empty visual media
- **WHEN** a new project is created
- **THEN** project.visualMedia SHALL be an empty array and project.visualFolders SHALL be an empty array

#### Scenario: Visual media persists with project
- **WHEN** the project is saved
- **THEN** all VisualMediaItem entries and folder names SHALL be serialized to the project JSON file

### Requirement: Visual media file storage
Visual media files SHALL be stored in the `media/visuals/` subdirectory relative to the project root. Imported files SHALL be copied with a UUID prefix to avoid filename collisions.

#### Scenario: Importing an image file
- **WHEN** a user imports "battle-map.jpg" into the project
- **THEN** the file SHALL be copied to `media/visuals/<uuid>_battle-map.jpg` within the project folder

#### Scenario: Importing a PDF file
- **WHEN** a user imports "handout.pdf" into the project
- **THEN** the file SHALL be copied to `media/visuals/<uuid>_handout.pdf` within the project folder

### Requirement: Supported media types
The system SHALL accept files with extensions: jpg, jpeg, png, gif, webp, svg (as image type) and pdf (as pdf type). Other file types SHALL be rejected with an error.

#### Scenario: Valid image import
- **WHEN** a file with extension .png is imported
- **THEN** it SHALL be accepted and mediaType set to 'image'

#### Scenario: Invalid file type rejected
- **WHEN** a file with extension .docx is imported
- **THEN** the system SHALL reject the import and display an error message

### Requirement: Folder organization
Users SHALL be able to create, rename, and delete folders. Assigning a VisualMediaItem to a folder SHALL set its `folder` field to the folder name. Items with no folder assignment SHALL appear in an "Unfiled" section.

#### Scenario: Creating a folder
- **WHEN** a user creates a folder named "Maps"
- **THEN** "Maps" SHALL be added to project.visualFolders

#### Scenario: Assigning item to folder
- **WHEN** a user assigns a visual media item to folder "Maps"
- **THEN** the item's folder field SHALL be set to "Maps"

#### Scenario: Deleting a folder
- **WHEN** a user deletes folder "Maps"
- **THEN** "Maps" SHALL be removed from project.visualFolders and all items with folder "Maps" SHALL have their folder field cleared

### Requirement: Optional audio cue linking
A VisualMediaItem MAY have a `linkedCueUuid` field referencing an AudioItem's UUID. This link is one-directional (visual → audio). The linked cue SHALL be triggered when the visual is pushed live.

#### Scenario: Visual with linked cue pushed live
- **WHEN** a visual media item with linkedCueUuid set is pushed to the player display
- **THEN** the referenced audio cue SHALL be triggered via the existing playCue mechanism

#### Scenario: Linked cue references deleted audio item
- **WHEN** a project is loaded and a visual's linkedCueUuid references a non-existent audio item
- **THEN** the linkedCueUuid field SHALL be cleared and a warning SHALL be logged

### Requirement: Visual media in project export/import
The .lpa export SHALL include all files in `media/visuals/`. On import, these files SHALL be restored to the same relative path.

#### Scenario: Exporting project with visual media
- **WHEN** a project containing visual media is exported to .lpa
- **THEN** all files in media/visuals/ SHALL be included in the archive

#### Scenario: Importing project with visual media
- **WHEN** a .lpa archive containing media/visuals/ files is imported
- **THEN** those files SHALL be extracted to media/visuals/ in the new project location
