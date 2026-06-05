# Tasks — component-refactor

## Group 1: Extract composables from app.vue

- [ ] 1.1 Create `app/composables/useImportExport.ts` — move `progressModal` ref, import progress listener setup/teardown, `onMenuImportProject` handler, `onOpenLpaFile` handler, `handleProjectSelection`, `handleProjectSelectionCancel`, `availableProjects`, `pendingImportPath`, `showProjectSelection`
- [ ] 1.2 Create `app/composables/useUpdateChecker.ts` — move `updateInfo`, `showUpdateModal`, `onUpdateAvailable`, `onManualUpdateAvailable` listeners
- [ ] 1.3 Create `app/composables/useMenuListeners.ts` — move `onMenuToggleDarkMode`, `onMenuChangeAccentColor` (owns `showColorPicker`), `onMenuChangeLanguage`, `onMenuShowAbout`, `updateMenuLanguage` call; accepts `theme`, `currentProject`, `saveProject`, `setLocale` as params or uses auto-imports
- [ ] 1.4 Refactor `app.vue` `<script setup>` to call the three composables; keep only `changeAccentColor`, theme/locale watchers, drag-and-drop setup

## Group 2: Extract composables from MainWorkspace.vue

- [ ] 2.1 Create `app/composables/useResizablePanel.ts` — move `cartWidth`, `isResizing`, `cartClosed`, `cartFullscreen`, `startResize`
- [ ] 2.2 Move menu IPC listeners (`onMenuSaveProject`, `onMenuExportProject`, `onMenuCloseProject`, `onMenuOpenProjectFolder`) and API trigger/stop listeners into a `useWorkspaceListeners.ts` composable (or inline in MainWorkspace if small enough after resize extraction)
- [ ] 2.3 Remove `as any` cast on line 174; type `selectedItem` properly for `playCue`
- [ ] 2.4 Refactor `MainWorkspace.vue` to call extracted composables

## Group 3: Verification

- [ ] 3.1 Run `npx nuxi typecheck` — zero errors
- [ ] 3.2 Run `npx vitest run` — 28 tests pass
- [ ] 3.3 Manually verify no `as any` remains in refactored files
