## Why

The GM needs to stage visuals before showing them to players, and always see what's currently live. The preview panel provides the "staged" and "live" views with push/black controls — the command center for visual display management.

## What Changes

- New preview panel component visible alongside both Audio and Media tabs
- Shows "staged" content (what GM is preparing to show)
- Shows "live" indicator (thumbnail of what players currently see)
- "Push" button sends staged content to player window
- "Black" button blanks the player window
- PDF page navigation when a PDF is staged

## Capabilities

### New Capabilities
- `preview-panel`: GM-facing panel showing staged and live visual states with push/black controls

### Modified Capabilities

## Impact

- New `app/components/PreviewPanel.vue` component
- `app/components/MainWorkspace.vue` — layout adjustment to include preview panel
- `app/composables/useVisualDisplay.ts` — consume staged/live state (created in media-library-panel change)
- IPC calls to player window (push-to-player from player-window change)
