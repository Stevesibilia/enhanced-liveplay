# Minimal Mode

## Purpose
A compact always-on-top window mode for live performance use alongside other applications.

## Requirements

### REQ-1: Mode Toggle
- Menu item: View → Minimal Mode (toggles)
- Keyboard shortcut: Ctrl+M (works in both modes)
- In-UI expand button visible in minimal mode to restore full mode

### REQ-2: Window Behaviour
- On enter: save current window bounds, resize to compact dimensions (~400×300), set `alwaysOnTop: true`, hide menu bar
- On exit: restore saved bounds, set `alwaysOnTop: false`, restore menu bar
- Bounds stored in main process memory (not persisted across app restart)

### REQ-3: Minimal UI Layout
Three stacked sections, top to bottom:
1. **Active cues list** — each cue shows: name, elapsed/total time, pause button, stop button. Scrollable if many cues.
2. **Compact cart grid** — each slot shows hotkey label (always visible, fixed) and cue name (marquee-scrolls via CSS if overflows). Clicking triggers the slot. Grid auto-fits columns to width.
3. **Master volume** — horizontal slider with dB readout + expand button (⛶) to exit minimal mode.

### REQ-4: Marquee Slot Names
- If slot name fits the available width: render static
- If slot name overflows: CSS `@keyframes` horizontal scroll animation
- Hotkey label always visible and never scrolls

### REQ-5: No Editing
Minimal mode does NOT expose: playlist, properties panel, import/export, drag-and-drop, project selection, waveform trimmer, about modal, update modal.

### REQ-6: Hotkey Continuity
All existing keyboard shortcuts (cart hotkeys, global actions like pause-resume, stop-all, volume up/down, toggle-loop) must continue working in minimal mode without modification.

### REQ-7: IPC Contract
New IPC methods:
- `enterMinimalMode()` → main process resizes window, sets always-on-top
- `exitMinimalMode()` → main process restores bounds, removes always-on-top
- Menu item sends `toggle-minimal-mode` event to renderer
