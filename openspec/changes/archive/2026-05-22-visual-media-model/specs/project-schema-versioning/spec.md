## ADDED Requirements

### Requirement: Migration adds visual media fields
When migrating to the visual-media-model schema version, the migration SHALL add `visualMedia: []` and `visualFolders: []` to any project that lacks these fields.

#### Scenario: Existing project migrated to new schema version
- **WHEN** a project without `visualMedia` or `visualFolders` fields is opened
- **THEN** the migration SHALL add `visualMedia` as an empty array and `visualFolders` as an empty array
- **AND** schemaVersion SHALL be incremented to the new current version

#### Scenario: Project already has visual media fields
- **WHEN** a project that already contains `visualMedia` and `visualFolders` is opened
- **THEN** the migration SHALL not modify those fields (idempotent)
