# Tasks — minimal-mode

## Group 1: IPC and Main Process

- [ ] 1.1 Add `enterMinimalMode` IPC handler in `electron/main.js`: save current bounds, resize window to compact size, set `alwaysOnTop: true`, hide menu bar
- [ ] 1.2 Add `exitMinimalMode` IPC handler: restore saved bounds, set `alwaysOnTop: false`, restore menu bar
- [ ] 1.3 Add `toggle-minimal-mode` menu item under View menu; sends event to renderer
- [ ] 1.4 Register Ctrl+M as global accelerator for the menu item
- [ ] 1.5 Add type declarations for new IPC methods in `app/types/global.d.ts`

## Group 2: Renderer Mode Toggle

- [ ] 2.1 Add `isMinimalMode` reactive state (composable or useState)
- [ ] 2.2 Wire `onMenuToggleMinimalMode` listener in `useMenuListeners` composable; toggles `isMinimalMode` and calls appropriate IPC
- [ ] 2.3 Update `app.vue` to conditionally render `MinimalWorkspace` vs `MainWorkspace` based on `isMinimalMode`

## Group 3: MinimalWorkspace Component

- [ ] 3.1 Create `app/components/MinimalWorkspace.vue` with three-section layout (active cues, cart grid, master volume)
- [ ] 3.2 Active cues section: list of playing cues with name, time progress, pause/stop buttons; scrollable
- [ ] 3.3 Compact cart grid: auto-fit grid of slots; each slot shows hotkey label + cue name with marquee overflow
- [ ] 3.4 Master volume section: horizontal slider with dB readout + expand button calling `exitMinimalMode`
- [ ] 3.5 CSS marquee animation for overflowing slot names (pure CSS keyframes, no JS)

## Group 4: Verification

- [ ] 4.1 Typecheck passes
- [ ] 4.2 Existing tests pass (28 tests)
- [ ] 4.3 Manual test: toggle minimal mode, verify window resizes and becomes always-on-top
- [ ] 4.4 Manual test: cart hotkeys and global shortcuts work in minimal mode
- [ ] 4.5 Manual test: expand button restores full mode with original window position/size
