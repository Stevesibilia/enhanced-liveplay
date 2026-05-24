## 1. Panel Component

- [x] 1.1 Create `PreviewPanel.vue` — container with staged area (top) and live indicator (bottom)
- [x] 1.2 Add resizable panel width using existing `useResizablePanel` composable
- [x] 1.3 Integrate into MainWorkspace.vue layout (right side, always visible)

## 2. Staged Content Display

- [x] 2.1 Render staged image (scaled to fit preview area)
- [x] 2.2 Render staged PDF page (using pdfjs-dist, single page in preview size)
- [x] 2.3 Show placeholder state when nothing is staged
- [x] 2.4 Wire to `useVisualDisplay` composable — react to selection changes from media library

## 3. PDF Page Navigation

- [x] 3.1 Add prev/next page buttons (visible only when PDF is staged)
- [x] 3.2 Add page indicator (e.g., "3 / 12")
- [x] 3.3 Implement page bounds checking (disable at first/last page)
- [x] 3.4 Update staged pdfPage state on navigation

## 4. Push & Black Controls

- [x] 4.1 Add "Push" button — copies staged state to live state + calls pushToPlayer IPC
- [x] 4.2 Add "Black" button — sets live to black + calls pushToPlayer with type 'black'
- [x] 4.3 Disable Push when nothing is staged
- [x] 4.4 Handle push when player window not open (update live state, queue for when window opens)

## 5. Live Indicator

- [x] 5.1 Show small thumbnail of current live content
- [x] 5.2 Show "No Display" label and black thumbnail when player is black
- [x] 5.3 Update live indicator reactively when push/black actions occur

## 6. Styling

- [x] 6.1 Style consistent with existing app theme (dark mode, accent colors)
- [x] 6.2 Ensure responsive behavior when panel is resized
