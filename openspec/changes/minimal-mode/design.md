## Context

The app is a single-window Electron + Nuxt application. All playback state lives in renderer-side composables (`useAudioEngine`, `useCartItems`, `useCartHotkeys`). The main process controls window geometry via `BrowserWindow` APIs. Currently no mechanism exists to toggle window mode or persist/restore bounds.

## Goals / Non-Goals

**Goals:**
- Single window reshapes to a compact strip (~400×300px) with `alwaysOnTop: true`
- Active cues visible with per-cue pause/stop controls
- Cart slots rendered as a compact grid with hotkey label + marquee-scrolling name
- Horizontal master volume slider
- Toggle via menu (View → Minimal Mode), Ctrl+M, and an in-UI expand button
- Window bounds saved before entering minimal, restored on exit
- All existing hotkeys still work in minimal mode

**Non-Goals:**
- No second window / multi-window architecture
- No playlist view in minimal mode
- No properties panel / editing capabilities
- No import/export in minimal mode
- No drag-and-drop in minimal mode

## Decisions

1. **Single window reshape** — Avoids state sync complexity of multi-window. Same renderer process, same composables, different component tree.

2. **Conditional rendering at app.vue level** — A reactive `isMinimalMode` ref determines whether `MainWorkspace` or `MinimalWorkspace` renders. Both consume the same composables.

3. **IPC for window control** — Renderer sends `set-minimal-mode` / `restore-full-mode` to main process which handles `setBounds`, `setAlwaysOnTop`, `setMenuBarVisibility`. Main process stores previous bounds in memory (not persisted to disk).

4. **Cart slot marquee via CSS** — `overflow: hidden` + `@keyframes` animation on names that overflow their container. No JS scroll logic needed. Static when name fits.

5. **Compact cart grid** — Fixed-size cells showing `[hotkey]` + name. Grid columns auto-fit based on window width. Clicking a slot triggers the cue (same as full mode click or hotkey).

6. **Menu bar hidden in minimal mode** — Reclaimed vertical space. Ctrl+M still works to toggle back since it's a global shortcut registered in the main process.

## Risks / Trade-offs

- [Window resize feels janky on some OS/WM combos] → Use `setBounds` with `animate: true` on macOS; instant on Linux/Windows
- [Always-on-top may be unexpected to users] → Clear visual indicator (compact UI itself) + easy escape (Ctrl+M or expand button)
- [Cart grid may not fit all slots in narrow width] → Scrollable grid with fixed max-height; most users have 8-16 slots which fit in 2-4 rows
