<template>
  <div class="live-display-panel">
    <div class="workspace-header">
      <span class="header-label">Composition</span>
      <span class="layer-count">{{ layers.length }} layer{{ layers.length === 1 ? '' : 's' }}</span>
      <div class="header-spacer"></div>
      <button class="header-btn" :disabled="!hasDrafts" @click="onPublishAll">
        <span class="material-symbols-rounded">visibility</span>
        Publish All
      </button>
      <button class="header-btn danger" :disabled="!hasPublished" @click="onBlackAll">
        <span class="material-symbols-rounded">block</span>
        Black
      </button>
    </div>

    <div
      ref="workspaceRef"
      class="workspace"
      :class="{ 'drag-over': isDragOver }"
      @click.self="onWorkspaceClick"
      @dragover.prevent="onDragOver"
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div v-if="layers.length === 0" class="empty-placeholder">
        <span class="material-symbols-rounded">layers</span>
        <p>Drag or push items here</p>
      </div>

      <div
        v-for="layer in sortedLayers"
        :key="layer.id"
        class="layer"
        :class="{
          published: layer.published,
          draft: !layer.published,
          selected: selectedLayerId === layer.id,
          pending: isLayerPending(layer.id),
        }"
        :style="{
          left: layer.x + '%',
          top: layer.y + '%',
          width: layer.width + '%',
          height: layer.height + '%',
          zIndex: layer.zIndex,
        }"
        @mousedown.stop="onLayerMouseDown($event, layer)"
        @click.stop="onSelectLayer(layer.id)"
      >
        <img
          :src="imageSrcMap[layer.id] || ''"
          :alt="layer.mediaItem.displayName"
          draggable="false"
          class="layer-content"
          @load="onImageLoad($event, layer)"
        />

        <template v-if="selectedLayerId === layer.id">
          <div
            v-for="handle in resizeHandles"
            :key="handle"
            class="resize-handle"
            :class="`handle-${handle}`"
            @mousedown.stop="onResizeStart($event, layer, handle)"
          ></div>
        </template>

        <div v-if="isLayerPending(layer.id)" class="pending-tag">
          <span class="material-symbols-rounded">schedule</span>
          <span>queued</span>
        </div>
      </div>
    </div>

    <Transition name="action-bar">
      <div v-if="selectedLayer" class="action-bar">
        <span class="action-name">{{ selectedLayer.mediaItem.displayName }}</span>
        <button class="action-btn" @click="togglePublish(selectedLayer)">
          <span class="material-symbols-rounded">
            {{ selectedLayer.published ? 'visibility_off' : 'visibility' }}
          </span>
          {{ selectedLayer.published ? 'Unpublish' : 'Publish' }}
        </button>
        <button class="action-btn" @click="bringToFront(selectedLayer.id)">
          <span class="material-symbols-rounded">flip_to_front</span>
          Front
        </button>
        <button class="action-btn" @click="sendToBack(selectedLayer.id)">
          <span class="material-symbols-rounded">flip_to_back</span>
          Back
        </button>
        <button class="action-btn danger" @click="onRemove(selectedLayer.id)">
          <span class="material-symbols-rounded">delete</span>
          Remove
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { VisualMediaItem } from '~/types/project';
import type { DisplayLayer } from '~/types/ipc';

const { currentProject, findItemByUuid } = useProject();
const {
  layers,
  selectedLayerId,
  selectLayer,
  addLayer,
  removeLayer,
  updateLayer,
  publishLayerWithLinking,
  unpublishLayerWithFade,
  blackAll,
  bringToFront,
  sendToBack,
  getPublishedState,
  isLayerPending,
} = useVisualDisplay();
const { syncToPlayer } = usePlayerSync();
const { playCue } = useAudioEngine();

const workspaceRef = ref<HTMLElement | null>(null);
const isDragOver = ref(false);

const imageSrcMap = ref<Record<string, string>>({});

const resizeHandles = ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'] as const;
type ResizeHandle = typeof resizeHandles[number];

// Tracks layers that have had their box auto-sized to image aspect ratio.
const autoFitted = new Set<string>();

// --- Derived state ---
const sortedLayers = computed(() =>
  [...layers.value].sort((a, b) => a.zIndex - b.zIndex)
);
const selectedLayer = computed(() =>
  selectedLayerId.value
    ? layers.value.find((l) => l.id === selectedLayerId.value) ?? null
    : null
);
const hasDrafts = computed(() => layers.value.some((l) => !l.published));
const hasPublished = computed(() => layers.value.some((l) => l.published));

// --- Media loading ---
const loadImage = async (item: VisualMediaItem): Promise<string | null> => {
  if (!currentProject.value || !window.electronAPI) return null;
  try {
    const result = await (window.electronAPI as any).readVisualMedia(
      currentProject.value.folderPath,
      item.mediaPath
    );
    if (result.success && result.data) {
      return `data:${result.mimeType};base64,${result.data}`;
    }
  } catch (e) {
    console.warn('Failed to load layer image:', e);
  }
  return null;
};

// Ensure image src is loaded for every image layer
watch(
  layers,
  async (current) => {
    const knownIds = new Set(Object.keys(imageSrcMap.value));
    for (const layer of current) {
      if (layer.mediaItem.mediaType !== 'image') continue;
      if (knownIds.has(layer.id)) continue;
      const src = await loadImage(layer.mediaItem);
      if (src) imageSrcMap.value = { ...imageSrcMap.value, [layer.id]: src };
    }
    // Drop entries for removed layers
    const liveIds = new Set(current.map((l) => l.id));
    for (const id of Object.keys(imageSrcMap.value)) {
      if (!liveIds.has(id)) {
        const next = { ...imageSrcMap.value };
        delete next[id];
        imageSrcMap.value = next;
      }
    }
  },
  { immediate: true, deep: true }
);

// Fit the layer's bounding box to the image's natural aspect ratio the
// first time the image loads. Keeps the layer centered on its current
// position and clamps to the workspace bounds.
const onImageLoad = (e: Event, layer: DisplayLayer) => {
  if (autoFitted.has(layer.id)) return;
  const img = e.target as HTMLImageElement;
  const rect = workspaceRef.value?.getBoundingClientRect();
  if (!rect || !img.naturalWidth || !img.naturalHeight) return;

  const imageAspect = img.naturalWidth / img.naturalHeight;
  const workspaceAspect = rect.width / rect.height;

  // Preserve the current width % unless the resulting height would overflow.
  let widthPct = layer.width;
  let heightPct = widthPct * (workspaceAspect / imageAspect);
  if (heightPct > 100) {
    heightPct = 100;
    widthPct = heightPct * (imageAspect / workspaceAspect);
  }

  // Keep the layer centered on its current center.
  const centerX = layer.x + layer.width / 2;
  const centerY = layer.y + layer.height / 2;
  const x = Math.max(0, Math.min(100 - widthPct, centerX - widthPct / 2));
  const y = Math.max(0, Math.min(100 - heightPct, centerY - heightPct / 2));

  autoFitted.add(layer.id);
  updateLayer(layer.id, { x, y, width: widthPct, height: heightPct });
  if (layer.published) void syncIfReady();
};

// --- Workspace interactions ---

const onWorkspaceClick = () => {
  selectLayer(null);
};

const onSelectLayer = (id: string) => {
  selectLayer(id);
};

// --- Drag from media library ---

const onDragOver = (e: DragEvent) => {
  if (e.dataTransfer?.types.includes('application/x-visual-media-uuid')) {
    isDragOver.value = true;
    e.dataTransfer.dropEffect = 'copy';
  }
};

const onDragLeave = () => {
  isDragOver.value = false;
};

const onDrop = (e: DragEvent) => {
  isDragOver.value = false;
  const uuid = e.dataTransfer?.getData('application/x-visual-media-uuid');
  if (!uuid || !currentProject.value) return;
  const item = currentProject.value.visualMedia?.find((m) => m.uuid === uuid);
  if (!item) return;

  const rect = workspaceRef.value?.getBoundingClientRect();
  let x: number | undefined;
  let y: number | undefined;
  if (rect) {
    const width = 50;
    const height = 50;
    const cx = ((e.clientX - rect.left) / rect.width) * 100 - width / 2;
    const cy = ((e.clientY - rect.top) / rect.height) * 100 - height / 2;
    x = Math.max(0, Math.min(100 - width, cx));
    y = Math.max(0, Math.min(100 - height, cy));
  }
  const layer = addLayer(item, { x, y });
  if (layer) selectLayer(layer.id);
};

// --- Move + Resize ---

interface DragSession {
  layerId: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origWidth: number;
  origHeight: number;
  rectWidth: number;
  rectHeight: number;
  mode: 'move' | 'resize';
  handle?: ResizeHandle;
}

let dragSession: DragSession | null = null;

const onLayerMouseDown = (e: MouseEvent, layer: DisplayLayer) => {
  selectLayer(layer.id);
  beginDrag(e, layer, 'move');
};

const onResizeStart = (e: MouseEvent, layer: DisplayLayer, handle: ResizeHandle) => {
  beginDrag(e, layer, 'resize', handle);
};

const beginDrag = (
  e: MouseEvent,
  layer: DisplayLayer,
  mode: 'move' | 'resize',
  handle?: ResizeHandle
) => {
  const rect = workspaceRef.value?.getBoundingClientRect();
  if (!rect) return;
  dragSession = {
    layerId: layer.id,
    startX: e.clientX,
    startY: e.clientY,
    origX: layer.x,
    origY: layer.y,
    origWidth: layer.width,
    origHeight: layer.height,
    rectWidth: rect.width,
    rectHeight: rect.height,
    mode,
    handle,
  };
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);
};

const onDragMove = (e: MouseEvent) => {
  if (!dragSession) return;
  const dxPct = ((e.clientX - dragSession.startX) / dragSession.rectWidth) * 100;
  const dyPct = ((e.clientY - dragSession.startY) / dragSession.rectHeight) * 100;

  if (dragSession.mode === 'move') {
    const nx = clamp(
      dragSession.origX + dxPct,
      0,
      Math.max(0, 100 - dragSession.origWidth)
    );
    const ny = clamp(
      dragSession.origY + dyPct,
      0,
      Math.max(0, 100 - dragSession.origHeight)
    );
    updateLayer(dragSession.layerId, { x: nx, y: ny });
  } else if (dragSession.mode === 'resize' && dragSession.handle) {
    const next = computeResize(dragSession, dxPct, dyPct);
    updateLayer(dragSession.layerId, next);
  }
};

const onDragEnd = () => {
  if (dragSession) {
    const layer = layers.value.find((l) => l.id === dragSession!.layerId);
    if (layer?.published) void syncIfReady();
  }
  dragSession = null;
  window.removeEventListener('mousemove', onDragMove);
  window.removeEventListener('mouseup', onDragEnd);
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const computeResize = (s: DragSession, dx: number, dy: number) => {
  let { origX: x, origY: y, origWidth: w, origHeight: h } = s;
  const aspect = s.origWidth / s.origHeight;
  const isCorner = s.handle!.length === 2;

  const handle = s.handle!;
  if (handle.includes('e')) w = clamp(s.origWidth + dx, 5, 100 - s.origX);
  if (handle.includes('w')) {
    const nw = clamp(s.origWidth - dx, 5, s.origX + s.origWidth);
    x = s.origX + (s.origWidth - nw);
    w = nw;
  }
  if (handle.includes('s')) h = clamp(s.origHeight + dy, 5, 100 - s.origY);
  if (handle.includes('n')) {
    const nh = clamp(s.origHeight - dy, 5, s.origY + s.origHeight);
    y = s.origY + (s.origHeight - nh);
    h = nh;
  }

  if (isCorner) {
    // Preserve aspect ratio on corner drags
    const candidateH = w / aspect;
    if (candidateH <= 100 - y && candidateH >= 5) {
      if (handle.includes('n')) y = s.origY + (s.origHeight - candidateH);
      h = candidateH;
    } else {
      const candidateW = h * aspect;
      if (handle.includes('w')) x = s.origX + (s.origWidth - candidateW);
      w = candidateW;
    }
  }

  return { x, y, width: w, height: h };
};

// --- Action bar handlers ---

const togglePublish = (layer: DisplayLayer) => {
  if (layer.published) {
    unpublishLayerWithFade(layer.id, { syncCallback: syncIfReady });
  } else {
    publishLayerWithLinking(layer.id, {
      syncCallback: syncIfReady,
      playCue,
      findItemByUuid,
    });
  }
};

const onRemove = (id: string) => {
  const layer = layers.value.find((l) => l.id === id);
  removeLayer(id);
  if (layer?.published) void syncIfReady();
};

const onPublishAll = () => {
  // Publish each currently-draft layer through the linking pipeline so each
  // honors its own linked cue / delay. Already-published layers are untouched.
  const draftIds = layers.value.filter((l) => !l.published).map((l) => l.id);
  if (draftIds.length === 0) return;
  for (const id of draftIds) {
    publishLayerWithLinking(id, {
      syncCallback: syncIfReady,
      playCue,
      findItemByUuid,
    });
  }
};

const onBlackAll = () => {
  blackAll();
  void syncIfReady();
};

const syncIfReady = async () => {
  if (!currentProject.value) return;
  const state = getPublishedState(currentProject.value.folderPath);
  await syncToPlayer(state);
};

// Keyboard: delete removes selected layer
const onKeyDown = (e: KeyboardEvent) => {
  if (
    (e.key === 'Delete' || e.key === 'Backspace') &&
    selectedLayerId.value &&
    document.activeElement === document.body
  ) {
    onRemove(selectedLayerId.value);
  }
};

onMounted(() => {
  if (import.meta.client) window.addEventListener('keydown', onKeyDown);
});
onUnmounted(() => {
  if (import.meta.client) window.removeEventListener('keydown', onKeyDown);
});
</script>

<style scoped lang="scss">
.live-display-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  overflow: hidden;
  position: relative;
}

.workspace-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background-color: var(--color-surface);
}

.header-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.layer-count {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.header-spacer {
  flex: 1;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background-color: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 11px;
  cursor: pointer;
  transition: background-color var(--transition-fast);

  .material-symbols-rounded { font-size: 14px; }

  &:hover:not(:disabled) {
    background-color: var(--color-surface-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &.danger {
    color: var(--color-danger, #e57373);
  }
}

.workspace {
  flex: 1;
  position: relative;
  margin: 8px;
  border-radius: 4px;
  background-color: #000;
  overflow: hidden;
  border: 1px solid var(--color-border);

  &.drag-over {
    outline: 2px dashed var(--color-accent);
    outline-offset: -4px;
  }
}

.empty-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  pointer-events: none;

  .material-symbols-rounded {
    font-size: 48px;
    opacity: 0.4;
  }

  p {
    margin-top: 8px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    opacity: 0.6;
  }
}

.layer {
  position: absolute;
  cursor: move;
  user-select: none;
  box-sizing: border-box;

  .layer-content {
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    display: block;
  }

  &.draft {
    border: 2px dashed rgba(255, 255, 255, 0.5);
    opacity: 0.6;
  }

  &.published {
    border: 2px solid #4caf50;
  }

  &.selected {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
    z-index: 9999 !important;
  }

  &.pending {
    border: 2px dashed #ffb74d;
  }
}

.pending-tag {
  position: absolute;
  top: 4px;
  left: 4px;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #ffb74d;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  pointer-events: none;

  .material-symbols-rounded {
    font-size: 12px;
  }
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: var(--color-accent);
  border: 1px solid #fff;
  border-radius: 2px;

  &.handle-nw { top: -5px; left: -5px; cursor: nwse-resize; }
  &.handle-ne { top: -5px; right: -5px; cursor: nesw-resize; }
  &.handle-sw { bottom: -5px; left: -5px; cursor: nesw-resize; }
  &.handle-se { bottom: -5px; right: -5px; cursor: nwse-resize; }
  &.handle-n  { top: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
  &.handle-s  { bottom: -5px; left: 50%; transform: translateX(-50%); cursor: ns-resize; }
  &.handle-e  { right: -5px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
  &.handle-w  { left: -5px; top: 50%; transform: translateY(-50%); cursor: ew-resize; }
}

.action-bar {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  z-index: 10000;
}

.action-name {
  font-size: 11px;
  color: var(--color-text-secondary);
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 6px;
  border-right: 1px solid var(--color-border);
  margin-right: 2px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 4px 8px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: var(--color-text-primary);
  font-size: 11px;
  cursor: pointer;

  .material-symbols-rounded { font-size: 14px; }

  &:hover { background-color: var(--color-surface-hover); }
  &.danger { color: var(--color-danger, #e57373); }
}

.action-bar-enter-active,
.action-bar-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}

.action-bar-enter-from,
.action-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
