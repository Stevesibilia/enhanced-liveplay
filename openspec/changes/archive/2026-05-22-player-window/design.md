## Context

Electron supports multiple BrowserWindows. The app already creates a state viewer window in dev mode, so the pattern exists. The player window needs to be simple — receive a command ("show this image" or "show this PDF page" or "go black") and render it. All logic lives in the main window; player window is a dumb display.

## Goals / Non-Goals

**Goals:**
- Create/destroy player window on demand from main window
- Position on any available display (user drags it)
- IPC protocol: main process relays display commands from main renderer to player renderer
- Render images (fit to window, centered, black background)
- Render PDFs (single page, fit to window)
- "Black" state — solid black screen (default on open)
- Remember last display/position between open/close cycles within a session

**Non-Goals:**
- Preview panel UI (separate change)
- Media library browsing (separate change)
- Transitions/animations between visuals (future)
- Multiple player windows (future)

## Decisions

**1. Frameless window with black background**

Player window is frameless (`frame: false`) with black background. Players see only content, no chrome. Can be made fullscreen via menu or keyboard shortcut. Closeable only from main window controls or Alt+F4.

**2. IPC flow: renderer → main → player**

Main renderer calls `window.electronAPI.pushToPlayer(displayState)`. Main process receives via ipcMain and forwards to player window's webContents via `playerWindow.webContents.send()`. Player renderer listens and updates display.

```
Main Renderer  ──ipc──▶  Main Process  ──send──▶  Player Renderer
                         (relay)
```

**3. Display state object**

```typescript
interface DisplayState {
  type: 'black' | 'image' | 'pdf';
  mediaPath?: string;     // absolute path for player to load
  pdfPage?: number;       // 1-indexed page number
}
```

Simple, serializable, stateless on the player side.

**4. Image rendering: object-fit contain**

Images rendered with `object-fit: contain` on a black background. No cropping, no stretching — full image always visible.

**5. PDF rendering via pdf.js**

Use mozilla's pdf.js (pdfjs-dist) to render a single page to canvas. Lightweight, no external dependencies, works in renderer process.

**6. Window position persistence (session-only)**

Store last bounds (`x, y, width, height`) in main process memory. On reopen within same app session, restore position. Not persisted to disk — user may change monitor setup between sessions.

## Risks / Trade-offs

- **Large images may be slow to render** → Accept for now; could add loading indicator later
- **pdf.js adds ~2MB to bundle** → Acceptable for the functionality gained
- **No transitions** → Abrupt switch is fine for MVP; can add fade later
