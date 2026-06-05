## Why

During live shows (TTRPG, theatre), users need the app visible alongside GM notes, PDF readers, or scripts. The current full UI is too large to share screen real estate. A compact floating strip with only playback controls would let users keep the app always-on-top without sacrificing workspace.

## What Changes

- Add a "Minimal Mode" toggle that reshapes the single window into a compact always-on-top strip
- New `MinimalWorkspace.vue` component showing: active cues (pause/stop), compact cart grid (hotkey label + marquee name), horizontal master volume, expand button
- New IPC handlers for window resize + `alwaysOnTop` toggle
- Menu item (View → Minimal Mode) + keyboard shortcut (Ctrl+M) + expand button to restore
- Window bounds saved before entering minimal mode, restored on exit

## Capabilities

### New Capabilities
- `minimal-mode`: Window mode toggle, compact UI layout, always-on-top behaviour

### Modified Capabilities
_(none — full mode is untouched)_

## Impact

- New component: `app/components/MinimalWorkspace.vue`
- Modified: `app/app.vue` or `MainWorkspace.vue` (conditional rendering based on mode)
- Modified: `electron/main.js` (new IPC handlers for resize/alwaysOnTop)
- Modified: `app/types/global.d.ts` (new IPC method types)
- New menu item in application menu
- Closes #33
