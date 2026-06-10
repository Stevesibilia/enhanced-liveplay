## 1. PR 1 — Pure functions to electron/lib/ + repo cleanup

- [x] 1.1 Create `electron/lib/version.js` exporting `compareVersions` (moved verbatim from main.js)
- [x] 1.2 Create `electron/lib/mime.js` exporting `getMimeType` (moved verbatim from main.js); check for renderer-side MIME duplication and note findings in PR description if found
- [x] 1.3 Create `electron/lib/path-guard.js` exporting `pathIsInProjectFolder(requestedPath, projectPath)` — parameterized, no global read; call sites in main.js pass `currentProject`
- [x] 1.4 Add `tests/path-guard.test.ts`: inside-folder accept, outside reject, traversal reject, sibling prefix-trick reject (`my-show` vs `my-show-evil`), null project allows, project-folder-itself accept
- [x] 1.5 Add `tests/version.test.ts` (greater/lesser/equal, unequal segment counts like `1.6` vs `1.6.0`) and `tests/mime.test.ts` (known extensions + unknown fallback)
- [x] 1.6 Replace the moved functions in main.js with requires from `electron/lib/`
- [x] 1.7 Delete stale root files `spike-onend.html` and `visual.md`
- [x] 1.8 `npm run test` green; manual smoke: app boots, project opens, read/write/copy file IPC works, update check works

## 2. PR 2 — state.js + windows.js

- [x] 2.1 Create `electron/state.js` owning shared refs (`mainWindow`, `playerWindow`, `stateViewerWindow`, `currentProject`, `playerReady`, `visualDisplayEnabled`, ffmpeg path/availability, yt-dlp path/readiness, `apiServer`, `isDevMode`) with getters/setters
- [x] 2.2 Create `electron/windows.js` with `createWindow`, `createStateViewerWindow`, `createPlayerWindow`, `closePlayerWindow`, and minimal-mode enter/exit logic; window refs stored via state.js
- [x] 2.3 Rewire main.js to use state.js getters/setters everywhere it touched the old globals; verify no state value is captured at require time
- [x] 2.4 Manual smoke: all three windows open/close, player publish handshake works (`player-ready`), minimal mode toggles, second-instance and macOS `open-file` still focus/open correctly

## 3. PR 3 — media/ modules

- [x] 3.1 Create `electron/media/ffmpeg.js` (`checkAndSetupFfmpeg`, path resolution incl. asar-unpacked handling); status recorded via state.js
- [x] 3.2 Create `electron/media/ytdlp.js` (`initializeYtDlp`, 7-day refresh, backup/restore, `search-youtube` + `download-youtube-audio` handler logic)
- [x] 3.3 Create `electron/media/waveform.js` (`generate-waveform` handler logic, ffmpeg invocation)
- [x] 3.4 Move corresponding `ipcMain.handle` registrations with their logic; channel names and payloads unchanged
- [x] 3.5 Manual smoke: waveform generates for new import, YouTube search returns results, download lands mp3 in project, ffmpeg fallback message intact when binary missing

## 4. PR 4 — ipc/ handler modules with register()

- [x] 4.1 Create `electron/ipc/files.js` — fs/dialog handlers (`select-*`, `read-file`, `read-audio-file`, `write-file`, `copy-file`, `ensure-directory`, `open-folder`, `open-external`, `write-clipboard-text`); guard calls pass `state.getCurrentProject()`
- [x] 4.2 Create `electron/ipc/project.js` — `set-current-project`, `export-project`, `import-project`, `import-lpa-file`, `update-app-state`
- [x] 4.3 Create `electron/ipc/player.js` — player window controls, `push-to-player`, `player-ready`, fullscreen toggles, visual media import/read/delete, `set-visual-display-enabled`
- [x] 4.4 Create `electron/ipc/misc.js` — locale handlers, update handlers, `get-app-version`, `is-dev-mode`, `check-ffmpeg`, minimal mode, MIDI config read/write
- [x] 4.5 Each module exports `register()`; requiring without calling registers nothing; main.js calls all `register()` functions in one ordered block
- [x] 4.6 Diff channel inventory before/after (grep `ipcMain.` on old vs new tree) — zero channels lost or renamed
- [x] 4.7 Manual smoke: project open/save/export/import, visual media import + publish, locale switch, MIDI config persists — passed except `.lpa` export, which is a pre-existing bug (identical on published release, not a refactor regression): tracked in issue #57

## 5. PR 5 — Leaf modules + final thin main.js

- [x] 5.1 Create `electron/menu.js` (locale file loading, menu translations, `createMenu`)
- [x] 5.2 Create `electron/api-server.js` (`startAPIServer` with port retry; window access via state.js at request time, null-window safe)
- [x] 5.3 Create `electron/updater.js` (autoUpdater config/feed, `checkForManualUpdate` using `lib/version.js`)
- [x] 5.4 Reduce main.js to bootstrap: requires, protocol registration, single-instance lock, `app` lifecycle handlers, ordered init + `register()` calls (~120 lines); confirm no `ipcMain` or `new BrowserWindow` remain in it
- [x] 5.5 Verify only main.js subscribes to `app` events; no module-scope mutable globals outside state.js
- [x] 5.6 Full manual smoke checklist (design D5/spec): boot, project open, cue plays, player window publishes, YouTube download, .lpa export/import, menu language switch, minimal mode, HTTP API trigger (`curl localhost:8080/api/trigger/uuid/<uuid>`), update check
