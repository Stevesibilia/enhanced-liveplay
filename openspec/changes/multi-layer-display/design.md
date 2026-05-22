## Context

The player window currently displays a single visual item at a time (image or PDF page). The GM pushes one item and it replaces whatever was showing. The new flow introduces a composition workspace in the main window where the GM arranges multiple items as layers before publishing them to the player.

Current architecture:
- `DisplayState`: `{ type: 'black' | 'image' | 'pdf', mediaPath?, pdfPage? }`
- `pushToPlayer(displayState)` sends a single state to the player via IPC
- Player renders one item (img element or canvas for PDF)

The LiveDisplayPanel currently shows a single live thumbnail. It needs to become an interactive composition workspace.

## Goals / Non-Goals

**Goals:**
- Multiple items visible simultaneously on the player window (layered, free-positioned)
- Composition workspace in main window where GM arranges layers before publishing
- Draft/published state per layer: items start as drafts (GM-only), become published (visible to players)
- Drag from media library into composition workspace
- Drag to reposition, handles to resize within the workspace
- Publish all or per-layer publish/unpublish
- Player renders all published layers in z-order with correct positioning

**Non-Goals:**
- Animations or transitions between states (future)
- Layer opacity/blending modes (future)
- Text layers or shapes (future — only media library items)
- Undo/redo of layer operations (future)
- Saving compositions as reusable presets (future)

## Decisions

**1. Layer data model**

Each layer is an object:
```ts
interface DisplayLayer {
  id: string;           // unique ID (uuid)
  mediaItem: VisualMediaItem;
  x: number;           // percentage (0-100) of container width
  y: number;           // percentage (0-100) of container height
  width: number;       // percentage of container width
  height: number;      // percentage of container height
  zIndex: number;      // stacking order
  published: boolean;  // visible to players?
  pdfPage?: number;    // for PDFs
}
```

Using percentages instead of pixels ensures the composition scales to any player window size.

*Alternative considered*: Pixel positions — rejected because player window can be any resolution/size. Percentages are resolution-independent.

**2. State management: single source of truth in composable**

`useVisualDisplay` composable holds the full layer stack as a reactive array. Both the composition workspace and the player sync from this state.

```ts
const layers = useState<DisplayLayer[]>('visualDisplay.layers', () => []);
```

Operations: `addLayer`, `removeLayer`, `updateLayer`, `publishLayer`, `unpublishLayer`, `publishAll`, `clearAll`.

*Alternative considered*: Separate draft/published arrays — rejected because it duplicates state and makes reordering across states complex.

**3. IPC protocol: full published state sync**

On any publish/unpublish/update action, send the full array of published layers to the player:

```ts
// Sent to player on every state change
interface PlayerDisplayState {
  layers: PublishedLayer[];  // only published layers, sorted by zIndex
}

interface PublishedLayer {
  id: string;
  type: 'image' | 'pdf';
  mediaPath: string;      // absolute path
  pdfPage?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}
```

Full state sync is simpler than incremental add/remove commands — no state drift between main and player windows.

*Alternative considered*: Incremental commands (add-layer, remove-layer, update-layer) — rejected because it introduces state synchronization complexity and potential drift if messages are lost.

**4. Player rendering: CSS absolute positioning**

Player window renders layers as absolutely-positioned elements within a relative container. Each layer is an `<img>` or `<canvas>` (for PDFs) with percentage-based `left`, `top`, `width`, `height`.

```html
<div id="display" style="position: relative; width: 100%; height: 100%;">
  <img style="position: absolute; left: 10%; top: 5%; width: 80%; height: 90%;" />
  <img style="position: absolute; left: 60%; top: 70%; width: 30%; height: 25%;" />
</div>
```

*Alternative considered*: Canvas-based rendering — rejected because it's more complex, loses browser image scaling quality, and makes PDF rendering harder.

**5. Composition workspace interaction model**

- **Add layer**: Drag item from media library grid into workspace, OR click push button on item
- **Move**: Drag layer within workspace (updates x/y)
- **Resize**: Corner/edge handles on selected layer (updates width/height)
- **Select**: Click layer to select (shows handles, enables delete/publish controls)
- **Reorder**: Right-click context menu or keyboard shortcuts for bring-to-front/send-to-back
- **Publish/Unpublish**: Toggle button per layer, or "Publish All" button
- **Remove**: Delete key or button removes layer from composition entirely

**6. Draft layers visual distinction**

In the composition workspace, draft (unpublished) layers show with a dashed border and reduced opacity. Published layers show with a solid green border. This gives clear visual feedback about what players can see.

## Risks / Trade-offs

- **Performance with many layers** → Accept for now; practical use case is 2-5 layers. If needed later, can throttle IPC updates.
- **Percentage positioning may feel imprecise** → Can add snap-to-grid or alignment guides later. For v1, free drag is sufficient.
- **Full state sync on every change** → Acceptable for small layer counts. If player receives updates faster than it can render, can debounce on the player side.
- **No undo** → GM can unpublish or remove layers. Full undo is a future enhancement.
- **Drag-and-drop between panels** → HTML5 drag API can be finicky. May need fallback to "click push button" as primary add method with drag as enhancement.
