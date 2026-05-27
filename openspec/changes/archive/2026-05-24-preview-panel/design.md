## Context

The preview panel is the bridge between the media library (selection) and the player window (display). It must be always visible regardless of which tab is active (Audio or Media) so the GM always knows what players see. The `useVisualDisplay` composable (from media-library-panel change) holds the state; this component consumes it.

## Goals / Non-Goals

**Goals:**
- Always-visible panel showing staged and live states
- Staged area: shows selected media item at larger preview size
- Live area: small thumbnail showing what's currently on player window
- Push button: sends staged → live (and to player window)
- Black button: sets live to black (and sends to player window)
- PDF page navigation (prev/next) when staged content is a PDF

**Non-Goals:**
- Media browsing/import (media-library-panel)
- Player window management (player-window change)
- Transitions or effects between pushes (future)

## Decisions

**1. Fixed right-side panel, always visible**

Preview panel occupies the right side of the main window, visible in both Audio and Media tabs. Similar to how PropertiesPanel works now but for visual display state.

**2. Two sections: Staged (large) + Live (small)**

Staged gets ~70% of panel height — it's where GM focuses. Live indicator is smaller (thumbnail + label), always showing what's currently displayed. After pushing, both show the same thing until GM selects something new.

**3. Push updates both live state and player window**

Push button: `stagedItem → liveItem` + `pushToPlayer(displayState)`. Single action, atomic. If player window isn't open, push still updates liveItem (player window will show it when opened).

**4. PDF navigation in staged area only**

Page nav controls (prev/next/page indicator) appear when staged content is a PDF. Changing page updates the staged pdfPage. Push sends the current page to player.

## Risks / Trade-offs

- **Panel takes horizontal space** → Resizable panel width (reuse useResizablePanel composable that already exists)
- **Live thumbnail may be too small to see detail** → Accept; it's a status indicator, not a preview. GM can always look at player monitor.
