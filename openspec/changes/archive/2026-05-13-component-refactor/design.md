## Context

`app.vue` is the root SFC; it currently owns theme management, color picker UI, IPC listener registration (menu events, update events, import/export progress, file association handling), drag-and-drop setup, and locale direction. `MainWorkspace.vue` owns resize/snap logic, export progress, API trigger/stop listeners, and a keyboard shortcut. Both files are manageable in line count but violate single-responsibility, making it hard to reason about IPC lifecycle or add features without touching unrelated code.

## Goals / Non-Goals

**Goals:**
- Each composable/component owns exactly one concern
- IPC listener setup and teardown is co-located and testable in isolation
- No `as any` casts remain after refactor
- Zero behaviour change — purely structural

**Non-Goals:**
- Rewriting template/styles (only moving `<script>` logic)
- Adding new features or changing UX
- Refactoring deeper components (PlaylistView, CartPlayer, etc.)

## Decisions

1. **Extract composables, not components** — most logic is imperative (IPC listeners, resize handlers). Composables are the idiomatic Vue 3 pattern and avoid prop-drilling.

2. **One composable per concern:**
   | Composable | Responsibility |
   |---|---|
   | `useMenuListeners` | Register all `onMenu*` IPC handlers; owns theme toggle, accent color picker visibility, language, about modal, import |
   | `useImportExport` | Progress modal state + import/export/lpa flow |
   | `useUpdateChecker` | `onUpdateAvailable` / `onManualUpdateAvailable`; owns `updateInfo` + `showUpdateModal` |
   | `useResizablePanel` | Resize handle logic, snap zones, cart width/closed/fullscreen state |

3. **AccentColorPicker stays inline** — it's only 20 lines of template; extracting to a component adds a file with no testability gain. Keep it in `app.vue` template but have `useMenuListeners` own the `showColorPicker` ref.

4. **Remove `as any` in MainWorkspace:174** — replace with proper type from `useAudioEngine` return type.

## Risks / Trade-offs

- [Regression risk from moving IPC listeners] → Mitigate with manual smoke test (menu items still work) and existing vitest suite
- [Composable ordering matters for Nuxt auto-imports] → All composables will be in `app/composables/` which Nuxt auto-imports; no ordering issue since they're called inside `onMounted` or top-level `<script setup>`
