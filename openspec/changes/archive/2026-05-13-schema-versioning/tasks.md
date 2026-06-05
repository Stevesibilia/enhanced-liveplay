## 1. Create migration infrastructure (D2, D5)

- [x] 1.1 Create `app/utils/migrations.ts` with the `CURRENT_SCHEMA_VERSION` constant (initially `1`) and the `migrations` array type `Array<(project: any) => void>`.
- [x] 1.2 Add a `runMigrations(project: any): void` function that reads `project.schemaVersion` (defaulting to `0`), runs each migration from that version to `CURRENT_SCHEMA_VERSION` in order, and sets `project.schemaVersion = CURRENT_SCHEMA_VERSION`.
- [x] 1.3 Add a `validateProjectStructure(json: any): void` function that throws a descriptive error if `name` (string) or `items` (array) are missing from the parsed JSON.

## 2. Write migration 0→1 (D3)

- [x] 2.1 In `app/utils/migrations.ts`, add `migrateV0ToV1(project: any)` containing the logic currently in `useProject.ts:migrateProject()`: add `cartOnlyItems`, `cartSlotKeys`, and per-item defaults (`fadeOutDuration`, `duckFadeIn`, `duckFadeOut`, `crossFade`, `playFade`, `stopFade`).
- [x] 2.2 Register `migrateV0ToV1` as index 0 in the `migrations` array.

## 3. Update Project interface and creation (D1)

- [x] 3.1 Add `schemaVersion: number` to the `Project` interface in `app/types/project.ts`.
- [x] 3.2 In `useProject.ts:createNewProject`, set `schemaVersion: CURRENT_SCHEMA_VERSION` on the new project object (import from `migrations.ts`).

## 4. Wire into openProject (D2, D4)

- [x] 4.1 In `useProject.ts:openProject`, after `JSON.parse`, call `validateProjectStructure(json)` and handle the thrown error by returning `false` and logging the error.
- [x] 4.2 Replace the `migrateProject(project)` call with `runMigrations(project)`.
- [x] 4.3 Delete the old `migrateProject` function and its per-item helper from `useProject.ts`.

## 5. Tests

- [x] 5.1 Add `tests/migrations.test.ts` with tests for: version 0 file gets migrated to 1 with all defaults; current-version file skips migration; missing `name` throws validation error; missing `items` throws validation error.
- [x] 5.2 Add a test for idempotence: running migrations twice on the same object produces no changes.

## 6. Verification

- [x] 6.1 Confirm typecheck passes.
- [x] 6.2 Confirm all vitest tests pass.
- [x] 6.3 Manual test: open a legacy project file (no `schemaVersion`), confirm it loads and `schemaVersion: 1` appears in the saved JSON.
