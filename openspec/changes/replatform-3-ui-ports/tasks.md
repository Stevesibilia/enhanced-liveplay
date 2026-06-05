# Tasks — replatform-3-ui-ports

## Group 1: Cue Picker

- [ ] 1.1 Copy `CuePicker.vue` into `client/app/components/`
- [ ] 1.2 Repoint its cue source to `useLiveplayServer` cue catalogue
- [ ] 1.3 Wire into the workspace; typecheck + smoke test

## Group 2: Listener & Panel Composables

- [ ] 2.1 Port `useMenuListeners` (menu IPC events present in new client)
- [ ] 2.2 Port `useWorkspaceListeners` (repoint any engine refs to server state)
- [ ] 2.3 Port `useResizablePanel` (pure UI; minimal changes)

## Group 3: Minimal Mode

- [ ] 3.1 Copy `MinimalWorkspace.vue` into `client/app/components/`
- [ ] 3.2 Add always-on-top compact window in `client/electron/main.js` (reuse upstream window mgmt)
- [ ] 3.3 Repoint transport controls to server REST/WS commands
- [ ] 3.4 Verify always-on-top + compact layout + live transport

## Group 4: Import/Export & Update Checker

- [ ] 4.1 Port `useImportExport`; route disk access via `/api/fs/*` or IPC
- [ ] 4.2 Port `useUpdateChecker` (electron-updater path; confirm repo target)
- [ ] 4.3 Confirm export round-trips against the server-owned project document

## Group 5: Verification

- [ ] 5.1 `nuxi typecheck` + `vitest run` green
- [ ] 5.2 Manual: cue picker, minimal mode, import/export all functional against the server
