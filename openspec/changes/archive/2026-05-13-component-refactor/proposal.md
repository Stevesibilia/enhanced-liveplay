## Why

`app.vue` (364 lines) and `MainWorkspace.vue` (287 lines) handle too many unrelated concerns — IPC listener registration, modals, theme management, drag-and-drop, resize logic, keyboard shortcuts, import/export progress. This makes them hard to navigate, test, and modify without risk of side-effects. This is pain point #10 and also resolves #12 (reactivity foot-guns that live in these bloated components).

## What Changes

- Extract IPC menu listeners from `app.vue` into a `useMenuListeners` composable
- Extract import/export progress logic into a `useImportExport` composable
- Extract update-available logic into a `useUpdateChecker` composable
- Extract color picker into a standalone `AccentColorPicker.vue` component
- Extract resize/snap logic from `MainWorkspace.vue` into a `useResizablePanel` composable
- Extract API trigger/stop listeners from `MainWorkspace.vue` into the existing workspace or a new composable
- Remove the `as any` cast on line 174 of `MainWorkspace.vue`

## Capabilities

### New Capabilities
- `component-composition`: Rules for component size limits, composable extraction patterns, and single-responsibility enforcement

### Modified Capabilities
_(none — this is a pure refactor with no requirement-level behavior changes)_

## Impact

- `app/app.vue`: script section shrinks significantly; template unchanged except color picker extraction
- `app/components/MainWorkspace.vue`: script section shrinks; template unchanged
- New files: `app/composables/useMenuListeners.ts`, `useImportExport.ts`, `useUpdateChecker.ts`, `useResizablePanel.ts`; `app/components/AccentColorPicker.vue`
- No API or dependency changes; purely internal refactor
- Resolves pain points #10 and #12
