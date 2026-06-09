import type { VisualMediaItem, AudioItem } from '~/types/project';
import type { DisplayLayer, PlayerDisplayState, PublishedLayer } from '~/types/ipc';

/**
 * Manages the multi-layer visual composition workspace.
 *
 * The composable owns a reactive stack of DisplayLayer objects. The GM adds
 * media library items as layers (drafts), arranges them, and publishes them
 * to the player window. Published layers are mirrored to the player via the
 * `push-to-player` IPC channel as a PlayerDisplayState payload.
 *
 * Publishing a layer that has a linked audio cue also triggers that cue,
 * honoring the item's signed linkDelay (audio-first / visual-first / both).
 * Per-visual fadeIn / fadeOut durations are forwarded to the player.
 */
export const useVisualDisplay = () => {
  // The item currently highlighted/selected in the media library grid (for the properties panel)
  const selectedItem = useState<VisualMediaItem | null>('visualDisplay.selected', () => null);

  // Whether the Visual Properties pane is open in the media tab
  const propertiesOpen = useState<boolean>('visualDisplay.propertiesOpen', () => false);

  // The full layer stack — both drafts and published layers
  const layers = useState<DisplayLayer[]>('visualDisplay.layers', () => []);

  // The currently selected layer (for handles + action bar in the workspace)
  const selectedLayerId = useState<string | null>('visualDisplay.selectedLayerId', () => null);

  // Pending timers for delayed audio/visual reveal, keyed by layer id.
  // Not reactive — purely internal scheduling state.
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>[]>();

  // Reactive set of layer ids with at least one pending timer.
  // Used by the UI to show a "queued" indicator.
  const pendingLayerIds = useState<Set<string>>(
    'visualDisplay.pendingLayerIds',
    () => new Set<string>()
  );

  const cancelPendingTimers = (layerId: string) => {
    const timers = pendingTimers.get(layerId);
    if (!timers) return;
    for (const t of timers) clearTimeout(t);
    pendingTimers.delete(layerId);
    if (pendingLayerIds.value.has(layerId)) {
      const next = new Set(pendingLayerIds.value);
      next.delete(layerId);
      pendingLayerIds.value = next;
    }
  };

  const trackTimer = (layerId: string, t: ReturnType<typeof setTimeout>) => {
    const list = pendingTimers.get(layerId) ?? [];
    list.push(t);
    pendingTimers.set(layerId, list);
    if (!pendingLayerIds.value.has(layerId)) {
      const next = new Set(pendingLayerIds.value);
      next.add(layerId);
      pendingLayerIds.value = next;
    }
  };

  const markTimerCleared = (layerId: string) => {
    if (pendingTimers.has(layerId) && pendingTimers.get(layerId)!.length === 0) {
      pendingTimers.delete(layerId);
    }
    if (!pendingTimers.has(layerId) && pendingLayerIds.value.has(layerId)) {
      const next = new Set(pendingLayerIds.value);
      next.delete(layerId);
      pendingLayerIds.value = next;
    }
  };

  const selectItem = (item: VisualMediaItem | null) => {
    selectedItem.value = item;
  };

  const openProperties = (item: VisualMediaItem) => {
    selectedItem.value = item;
    propertiesOpen.value = true;
  };

  const closeProperties = () => {
    propertiesOpen.value = false;
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
    cancelPendingTimers(id);
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
    // Clear any pending timers — nothing should fire after a black-all.
    for (const id of Array.from(pendingTimers.keys())) cancelPendingTimers(id);
    // Background layers survive the Black button; everything else goes dark.
    layers.value = layers.value.map((l) =>
      l.isBackground ? l : { ...l, published: false }
    );
  };

  // Mark a layer as the full-screen background (or clear that role). A background
  // layer snaps to full-screen, sits behind everything, and stays published on
  // Black. Only one background may be active — enabling clears any previous one.
  const setBackground = (id: string, value: boolean) => {
    if (!value) {
      updateLayer(id, { isBackground: false });
      return;
    }
    const minZ =
      layers.value.length === 0 ? 0 : Math.min(...layers.value.map((l) => l.zIndex));
    layers.value = layers.value.map((l) => {
      if (l.id === id) {
        return {
          ...l,
          isBackground: true,
          published: true, // a backdrop is shown immediately and stays on Black
          x: 0,
          y: 0,
          width: 100,
          height: 100,
          zIndex: minZ - 1,
        };
      }
      return l.isBackground ? { ...l, isBackground: false } : l;
    });
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
    for (const id of Array.from(pendingTimers.keys())) cancelPendingTimers(id);
    selectedItem.value = null;
    propertiesOpen.value = false;
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
        fadeIn: l.mediaItem.fadeIn ?? 0,
        fadeOut: l.mediaItem.fadeOut ?? 0,
        isBackground: l.isBackground ?? false,
      }));
    return { layers: published };
  };

  /**
   * Push (publish) a layer live, honoring the linked cue & link delay.
   * - syncCallback: invoked whenever the player-bound state should be flushed.
   * - playCue: bound playCue function from useAudioEngine (composables must be
   *   resolved at the call site to avoid recursive imports).
   */
  const publishLayerWithLinking = (
    id: string,
    opts: {
      syncCallback: () => void | Promise<void>;
      playCue: (item: AudioItem) => void | Promise<unknown>;
      findItemByUuid: (uuid: string) => unknown;
    }
  ) => {
    // Suppress all visual/audio firing when the project has visuals disabled.
    const { visualDisplayEnabled } = useProject();
    if (!visualDisplayEnabled.value) return;

    const layer = layers.value.find((l) => l.id === id);
    if (!layer) return;

    // Cancel any in-flight timer for this layer (re-push)
    cancelPendingTimers(id);

    const item = layer.mediaItem;
    const linkedUuid = item.linkedCueUuid;
    const delay = item.linkDelay ?? 0;

    const linkedItem = linkedUuid ? opts.findItemByUuid(linkedUuid) : null;
    const cue =
      linkedItem && (linkedItem as { type?: string }).type === 'audio'
        ? (linkedItem as AudioItem)
        : null;

    const revealNow = () => {
      publishLayer(id);
      void opts.syncCallback();
    };

    if (!cue) {
      // No link, missing, or stale — just reveal.
      revealNow();
      return;
    }

    if (delay === 0) {
      revealNow();
      void opts.playCue(cue);
    } else if (delay > 0) {
      // audio first, visual after delay
      void opts.playCue(cue);
      const t = setTimeout(() => {
        pendingTimers.delete(id);
        markTimerCleared(id);
        publishLayer(id);
        void opts.syncCallback();
      }, delay * 1000);
      trackTimer(id, t);
    } else {
      // delay < 0: visual first, audio after |delay|
      revealNow();
      const t = setTimeout(() => {
        pendingTimers.delete(id);
        markTimerCleared(id);
        void opts.playCue(cue);
      }, Math.abs(delay) * 1000);
      trackTimer(id, t);
    }
  };

  /**
   * Unpublish a layer with fade-out. Cancels any pending audio trigger for
   * that visual; does NOT re-trigger the linked cue.
   */
  const unpublishLayerWithFade = (
    id: string,
    opts: { syncCallback: () => void | Promise<void> }
  ) => {
    cancelPendingTimers(id);
    unpublishLayer(id);
    void opts.syncCallback();
  };

  /**
   * True if a delayed action is queued for this layer.
   * Reactive via pendingLayerIds.
   */
  const isLayerPending = (id: string): boolean => pendingLayerIds.value.has(id);

  return {
    selectedItem,
    propertiesOpen,
    layers,
    selectedLayerId,
    selectItem,
    openProperties,
    closeProperties,
    selectLayer,
    addLayer,
    removeLayer,
    updateLayer,
    publishLayer,
    unpublishLayer,
    publishLayerWithLinking,
    unpublishLayerWithFade,
    publishAll,
    blackAll,
    setBackground,
    bringToFront,
    sendToBack,
    clearAll,
    getPublishedState,
    isLayerPending,
    pendingLayerIds,
  };
};
