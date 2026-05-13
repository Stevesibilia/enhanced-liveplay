## Why

Old `.liveplay` project files silently break or load with missing features when new fields are added (e.g., `cartSlotKeys`, `globalKeyBindings`, `fadeOutDuration`, ducking fade times). The existing `migrateProject()` uses "check if field is undefined" heuristics — fragile, unordered, and impossible to reason about which migrations have run. A numeric `schemaVersion` lets migrations run in order, exactly once, and makes it safe to add breaking changes in the future.

## What Changes

- Add a `schemaVersion: number` field to the `Project` interface and set it on all newly created projects
- On load, read `schemaVersion` (defaulting to `0` for legacy files) and run numbered migration functions in sequence up to the current version
- Consolidate the existing `migrateProject()` heuristics into migration `0 → 1`
- Validate the loaded JSON has required top-level fields before attempting migration (early error instead of silent `undefined`)
- Bump `schemaVersion` after migrations and save back to disk so migrations run only once

## Capabilities

### New Capabilities
- `project-schema-versioning`: schema version field, ordered migration runner, and basic load-time validation for `.liveplay` project files

### Modified Capabilities
_(none — no existing specs affected)_

## Impact

- `app/types/project.ts`: add `schemaVersion` to `Project` interface
- `app/composables/useProject.ts`: replace `migrateProject()` with version-keyed migration runner; add basic validation in `openProject`
- All existing `.liveplay` files on disk: treated as version `0`, migrated to version `1` on first open (backward compatible, no data loss)
- `createNewProject`: sets `schemaVersion` to current version on new projects
