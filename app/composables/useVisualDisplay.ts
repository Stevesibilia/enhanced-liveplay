import type { VisualMediaItem } from '~/types/project';
import type { DisplayLayer, PlayerDisplayState, PublishedLayer } from '~/types/ipc';

/**
 * Manages the multi-layer visual composition workspace.
 *
 * The composable owns a reactive stack of DisplayLayer objects. The GM adds
 * media library items as layers (drafts), arranges them, and publishes them
 * to the player window. Published layers are mirrored to the player via the
 * `push-to-player` IPC channel as a PlayerDisplayState payload.
 */
export const useVisualDisplay = () => {
  // The item currently highlighted/selected in the media library grid (for the properties panel)
  const selectedItem = useState<VisualMediaItem | null>('visualDisplay.selected', () => null);

  // The full layer stack — both drafts and published layers
  const layers = useState<DisplayLayer[]>('visualDisplay.layers', () => []);

  // The currently selected layer (for handles + action bar in the workspace)
  const selectedLayerId = useState<string | null>('visualDisplay.selectedLayerId', () => null);

  const selectItem = (item: VisualMediaItem | null) => {
    selectedItem.value = item;
  };

  // --- Layer operations ---

  const nextZ = () =>
    layers.value.length === 0
      ? 1
      : Math.max(...layers.value.map((l) => l.zIndex)) + 1;

  const addLayer = (
    item: VisualMediaItem,
    opts: { x?: number; y?: number; width?: number; height?: number } = {}
  ): DisplayLayer | null => {
    // PDF support is deferred — only image layers can be added for now.
    if (item.mediaType !== 'image') {
      console.warn(`[visualDisplay] Skipping non-image media (${item.mediaType}): only images can be added as layers.`);
      return null;
    }

    const width = opts.width ?? 50;
    const height = opts.height ?? 50;
    // Centered default if x/y not provided
    const x = opts.x ?? (100 - width) / 2;
    const y = opts.y ?? (100 - height) / 2;

    const layer: DisplayLayer = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `layer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mediaItem: item,
      x,
      y,
      width,
      height,
      zIndex: nextZ(),
      published: false,
    };
    layers.value = [...layers.value, layer];
    return layer;
  };

  const removeLayer = (id: string) => {
    layers.value = layers.value.filter((l) => l.id !== id);
    if (selectedLayerId.value === id) selectedLayerId.value = null;
  };

  const updateLayer = (id: string, patch: Partial<DisplayLayer>) => {
    layers.value = layers.value.map((l) => (l.id === id ? { ...l, ...patch } : l));
  };

  const publishLayer = (id: string) => updateLayer(id, { published: true });

  const unpublishLayer = (id: string) => updateLayer(id, { published: false });

  const publishAll = () => {
    layers.value = layers.value.map((l) => ({ ...l, published: true }));
  };

  const blackAll = () => {
    layers.value = layers.value.map((l) => ({ ...l, published: false }));
  };

  const bringToFront = (id: string) => updateLayer(id, { zIndex: nextZ() });

  const sendToBack = (id: string) => {
    const minZ =
      layers.value.length === 0 ? 0 : Math.min(...layers.value.map((l) => l.zIndex));
    updateLayer(id, { zIndex: minZ - 1 });
  };

  const selectLayer = (id: string | null) => {
    selectedLayerId.value = id;
  };

  const clearAll = () => {
    selectedItem.value = null;
    layers.value = [];
    selectedLayerId.value = null;
  };

  /**
   * Build the player-bound payload (PlayerDisplayState) from current layers.
   * Requires the absolute project folder path to resolve media paths.
   */
  const getPublishedState = (projectFolderPath: string): PlayerDisplayState => {
    const published: PublishedLayer[] = layers.value
      .filter((l) => l.published)
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((l) => ({
        id: l.id,
        type: 'image',
        mediaPath: `${projectFolderPath}/${l.mediaItem.mediaPath}`,
        x: l.x,
        y: l.y,
        width: l.width,
        height: l.height,
        zIndex: l.zIndex,
      }));
    return { layers: published };
  };

  return {
    selectedItem,
    layers,
    selectedLayerId,
    selectItem,
    selectLayer,
    addLayer,
    removeLayer,
    updateLayer,
    publishLayer,
    unpublishLayer,
    publishAll,
    blackAll,
    bringToFront,
    sendToBack,
    clearAll,
    getPublishedState,
  };
};
