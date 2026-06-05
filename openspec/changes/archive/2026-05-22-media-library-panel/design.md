## Context

The main window currently has a single workspace view (MainWorkspace/MinimalWorkspace). Audio controls fill the main area. The media library needs to coexist with audio — either as a tab that replaces the audio view or as a side-by-side layout. The existing UI uses Vue 3 with SCSS styling and material-symbols icons.

## Goals / Non-Goals

**Goals:**
- Tab-based switching between Audio and Media views in main workspace
- Folder sidebar with tree navigation (flat folders, not nested)
- Thumbnail grid showing visual media items
- Drag-and-drop import from OS file manager
- File picker dialog import (multi-select)
- Folder CRUD (create, rename, delete)
- Item operations: rename, assign to folder, delete
- Emit selection event when item clicked (consumed by preview panel)

**Non-Goals:**
- Preview/push functionality (preview-panel change)
- Player window interaction (player-window change)
- Nested folder hierarchy (flat folders only for v1)
- Thumbnail generation/caching (use native file loading, optimize later)
- Search/filter (future)

## Decisions

**1. Tab switching, not split view**

Audio and Media are separate tabs. When Media tab is active, the audio playlist is hidden (but audio keeps playing). Reasoning: both need significant screen real estate; splitting would make both cramped. The preview panel is always visible regardless of tab.

Alternative: Side-by-side split. Rejected for v1 — screen space too precious, especially with preview panel also visible.

**2. Thumbnail via native img tag**

Load images directly via `file://` protocol or IPC-served data URLs. No thumbnail cache for v1. PDFs show a generic PDF icon (rendering first page as thumbnail is expensive).

**3. Grid layout with fixed-size cells**

CSS Grid with fixed-size thumbnail cells (e.g., 120x120px). Responsive columns based on panel width. Consistent, predictable layout.

**4. Drag-and-drop uses HTML5 Drag API**

Listen for `dragover`/`drop` events on the media library panel. Extract file paths from `dataTransfer.files`. Call IPC import handler for each file. Show progress for multi-file imports.

## Risks / Trade-offs

- **Large libraries may be slow without thumbnail cache** → Accept for v1; optimize if users report issues
- **Tab switching loses scroll position** → Can preserve with keep-alive or scroll state; low priority
- **PDF has no visual preview in grid** → Generic icon is acceptable; could render page 1 later
