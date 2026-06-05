## ADDED Requirements

### Requirement: Project files carry a schema version number

Every `.liveplay` project file SHALL contain a top-level `schemaVersion` integer field. Files without this field SHALL be treated as version `0`.

New projects SHALL be created with `schemaVersion` set to the application's current schema version.

#### Scenario: New project has current schema version
- **WHEN** a new project is created
- **THEN** the saved JSON SHALL contain `"schemaVersion": <CURRENT_SCHEMA_VERSION>`

#### Scenario: Legacy file without schemaVersion
- **GIVEN** a `.liveplay` file without a `schemaVersion` field
- **WHEN** the file is opened
- **THEN** the loader SHALL treat it as version `0`

### Requirement: Migrations run in order on load

When a project is opened with `schemaVersion` less than the current version, the loader SHALL run each migration function in sequence from the file's version up to the current version. After migration, the project's `schemaVersion` SHALL be set to the current version.

Migrations SHALL be idempotent — running them on an already-migrated file SHALL produce no changes.

#### Scenario: Version 0 file is migrated to version 1
- **GIVEN** a `.liveplay` file with no `schemaVersion` (version 0)
- **WHEN** the file is opened
- **THEN** migration 0→1 SHALL run, adding default values for missing fields
- **AND** `schemaVersion` SHALL be set to `1`

#### Scenario: Current-version file skips migration
- **GIVEN** a `.liveplay` file with `schemaVersion` equal to the current version
- **WHEN** the file is opened
- **THEN** no migrations SHALL run

#### Scenario: Multiple version gaps are migrated sequentially
- **GIVEN** a `.liveplay` file with `schemaVersion: 0` and the current version is `3`
- **WHEN** the file is opened
- **THEN** migrations 0→1, 1→2, and 2→3 SHALL run in that order

### Requirement: Load-time validation rejects malformed files

Before running migrations, the loader SHALL validate that the parsed JSON contains at minimum the fields `name` (string) and `items` (array). If validation fails, the loader SHALL throw a descriptive error and NOT proceed with loading.

#### Scenario: File missing required field
- **GIVEN** a `.liveplay` file whose JSON has no `items` field
- **WHEN** the file is opened
- **THEN** the loader SHALL return an error indicating the missing field
- **AND** SHALL NOT set `currentProject`

#### Scenario: File with corrupt JSON
- **GIVEN** a `.liveplay` file containing invalid JSON
- **WHEN** the file is opened
- **THEN** the loader SHALL return an error
- **AND** SHALL NOT crash the application

### Requirement: Migration 0→1 consolidates existing field defaults

Migration 0→1 SHALL add default values for all fields that were previously handled by the ad-hoc `migrateProject()`:
- `cartOnlyItems: []` if missing
- `cartSlotKeys` with default bindings if missing
- Per audio item: `fadeOutDuration: 1.0`, `duckFadeIn: 0.25`, `duckFadeOut: 1.0`, `crossFade: 0`, `playFade: 0`, `stopFade: 0` if missing

#### Scenario: Legacy file gets all defaults
- **GIVEN** a version 0 file with audio items missing `fadeOutDuration` and `crossFade`
- **WHEN** migration 0→1 runs
- **THEN** those items SHALL have `fadeOutDuration: 1.0` and `crossFade: 0`
- **AND** all other missing optional fields SHALL receive their defaults
