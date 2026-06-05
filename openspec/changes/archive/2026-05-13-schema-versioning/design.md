## Context

`.liveplay` project files are free-form JSON matching the `Project` TS interface. The `version: string` field exists but is never read. When new fields are added (e.g., `cartSlotKeys`, `duckFadeIn`), `migrateProject()` in `useProject.ts` patches them using "if undefined, set default" checks — unordered, no way to know which migrations ran, and fragile as the field list grows.

## Goals / Non-Goals

**Goals:**
- Add a numeric `schemaVersion` to every project file
- Run migrations in order, exactly once, keyed by version number
- Consolidate existing heuristic patches into migration 0→1
- Validate top-level structure on load (fail fast instead of silent `undefined`)
- Save the bumped version back to disk so migrations don't re-run

**Non-Goals:**
- Full zod validation of every nested field (future IPC contract work)
- Supporting downgrade / rollback of schema versions
- Changing the `.liveplay` file extension or format (still JSON)

## Design Decisions

### D1: `schemaVersion` as a top-level integer field

Add `schemaVersion: number` to the `Project` interface. Legacy files without the field are treated as version `0`. New projects start at the current version (initially `1`).

The existing `version: string` field is left untouched — it's user-facing app version metadata, not a schema marker.

### D2: Ordered migration runner

A `migrations` array maps each version transition to a function:

```ts
const migrations: Array<(project: any) => void> = [
  migrateV0ToV1,  // index 0: runs when schemaVersion < 1
];
const CURRENT_SCHEMA_VERSION = migrations.length; // 1
```

On load:
1. Read `schemaVersion` (default `0` if missing)
2. For each migration from `schemaVersion` to `CURRENT_SCHEMA_VERSION`, run it in order
3. Set `project.schemaVersion = CURRENT_SCHEMA_VERSION`

Migrations receive `any`-typed project JSON — they must not assume fields exist.

### D3: Migration 0→1 consolidates existing heuristics

`migrateV0ToV1` contains exactly what `migrateProject()` does today:
- Add `cartOnlyItems: []` if missing
- Add `cartSlotKeys` with defaults if missing
- Walk items: add `fadeOutDuration`, `duckFadeIn`, `duckFadeOut` if missing
- Add `crossFade: 0`, `playFade: 0`, `stopFade: 0` if missing

No behavioral change — just repackaged under a version number.

### D4: Basic load-time validation

Before migration, check the parsed JSON has required top-level fields (`name`, `items`, `version`). If missing, throw a descriptive error caught by `openProject` and surfaced to the user, instead of proceeding with a broken object.

This is a lightweight guard, not a full schema validator.

### D5: File location

Migrations live in a new file `app/utils/migrations.ts` — pure functions, easily testable. `useProject.ts` imports and calls the runner.

## Risks

- **Old app opens new file**: An older app version without schema versioning would ignore `schemaVersion` and try to load the file. Since migration 0→1 only adds defaults for missing fields (which the old app also does via `migrateProject`), this is safe. Future migrations that change field semantics would need the user to update the app.
- **Corrupt JSON**: The validation in D4 catches missing required fields but not corrupt values. Acceptable for now — full validation is a separate effort (#6 IPC contract).
