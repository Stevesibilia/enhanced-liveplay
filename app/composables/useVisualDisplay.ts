import type { VisualMediaItem } from '~/types/project';

/**
 * Manages visual display state: which item is selected, staged (preview), and live (pushed to player).
 * Consumed by MediaLibraryPanel, PreviewPanel, and PlayerWindow.
 */
export const useVisualDisplay = () => {
  // The item currently highlighted/selected in the media library grid
  const selectedItem = useState<VisualMediaItem | null>('visualDisplay.selected', () => null);

  // The item staged for preview (shown in preview panel before pushing live)
  const stagedItem = useState<VisualMediaItem | null>('visualDisplay.staged', () => null);

  // The item currently live/pushed to the player window
  const liveItem = useState<VisualMediaItem | null>('visualDisplay.live', () => null);

  const selectItem = (item: VisualMediaItem | null) => {
    selectedItem.value = item;
    // Auto-stage on select for immediate preview
    stagedItem.value = item;
  };

  const stageItem = (item: VisualMediaItem | null) => {
    stagedItem.value = item;
  };

  const pushLive = (item?: VisualMediaItem | null) => {
    const source = item ?? stagedItem.value;
    // Clone to ensure reactivity triggers (different object reference)
    liveItem.value = source ? { ...source } : null;
  };

  const clearAll = () => {
    selectedItem.value = null;
    stagedItem.value = null;
    liveItem.value = null;
  };

  return {
    selectedItem,
    stagedItem,
    liveItem,
    selectItem,
    stageItem,
    pushLive,
    clearAll,
  };
};
