import type { VisualMediaItem } from '~/types/project';

export const useVisualMedia = () => {
  const { currentProject, saveProject, findItemByUuid } = useProject();

  // Add a visual media item to the project
  const addVisualMedia = (item: VisualMediaItem): void => {
    if (!currentProject.value) return;
    if (!currentProject.value.visualMedia) {
      currentProject.value.visualMedia = [];
    }
    currentProject.value.visualMedia.push(item);
    saveProject();
  };

  // Remove a visual media item by UUID, optionally deleting from disk
  const removeVisualMedia = async (uuid: string, deleteFromDisk = false): Promise<void> => {
    if (!currentProject.value) return;
    const index = currentProject.value.visualMedia.findIndex(item => item.uuid === uuid);
    if (index === -1) return;

    const item = currentProject.value.visualMedia[index];

    if (deleteFromDisk && import.meta.client && window.electronAPI) {
      await (window.electronAPI as any).deleteVisualMedia(
        currentProject.value.folderPath,
        item.mediaPath
      );
    }

    currentProject.value.visualMedia.splice(index, 1);
    saveProject();
  };

  // Update a visual media item (folder assignment, linking, etc.)
  const updateVisualMedia = (uuid: string, updates: Partial<VisualMediaItem>): void => {
    if (!currentProject.value) return;
    const item = currentProject.value.visualMedia.find(i => i.uuid === uuid);
    if (!item) return;
    Object.assign(item, updates);
    saveProject();
  };

  // Move a batch of items into a folder. The '__unfiled__' sentinel clears the
  // folder (item becomes unfiled). Persists once after all moves.
  const moveItemsToFolder = (uuids: string[], folder: string | null): void => {
    if (!currentProject.value) return;
    const target = folder === '__unfiled__' ? undefined : folder ?? undefined;
    for (const uuid of uuids) {
      const item = currentProject.value.visualMedia.find(i => i.uuid === uuid);
      if (item) item.folder = target;
    }
    saveProject();
  };

  // Add a visual folder
  const addVisualFolder = (name: string): void => {
    if (!currentProject.value) return;
    if (!currentProject.value.visualFolders) {
      currentProject.value.visualFolders = [];
    }
    if (!currentProject.value.visualFolders.includes(name)) {
      currentProject.value.visualFolders.push(name);
      saveProject();
    }
  };

  // Remove a visual folder — clears folder field on items in that folder
  const removeVisualFolder = (name: string): void => {
    if (!currentProject.value) return;
    const idx = currentProject.value.visualFolders.indexOf(name);
    if (idx === -1) return;
    currentProject.value.visualFolders.splice(idx, 1);

    // Clear folder field on any items in the removed folder
    for (const item of currentProject.value.visualMedia) {
      if (item.folder === name) {
        item.folder = undefined;
      }
    }
    saveProject();
  };

  // Validate and clean stale linked cue references
  const validateVisualMediaLinks = (): void => {
    if (!currentProject.value) return;
    for (const item of currentProject.value.visualMedia) {
      if (item.linkedCueUuid) {
        const referenced = findItemByUuid(item.linkedCueUuid);
        if (!referenced) {
          console.warn(`Visual media "${item.displayName}" has stale link to non-existent cue ${item.linkedCueUuid}, clearing.`);
          item.linkedCueUuid = undefined;
        }
      }
    }
  };

  return {
    addVisualMedia,
    removeVisualMedia,
    updateVisualMedia,
    moveItemsToFolder,
    addVisualFolder,
    removeVisualFolder,
    validateVisualMediaLinks,
  };
};
