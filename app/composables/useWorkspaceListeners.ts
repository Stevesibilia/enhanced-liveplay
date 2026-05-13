import type { AudioItem } from '~/types/project';

/**
 * IPC listeners scoped to the main workspace: save, export, close,
 * open folder, trigger/stop items, and keyboard shortcuts.
 */
export const useWorkspaceListeners = () => {
  const { selectedItem, saveProject, closeProject, currentProject } = useProject();
  const { triggerByUuid, triggerByIndex, stopCue, playCue } = useAudioEngine();
  const { t } = useLocalization();

  const progressModal = ref({
    visible: false,
    title: '',
    message: '',
    percentage: 0,
  });

  const registerListeners = () => {
    if (!import.meta.client || !window.electronAPI) return;

    window.electronAPI.onMenuSaveProject(() => {
      saveProject();
    });

    window.electronAPI.onMenuExportProject(async () => {
      if (!currentProject.value) return;

      try {
        const progressListener: Parameters<typeof window.electronAPI.onExportProgress>[0] = (_event, data) => {
          progressModal.value = {
            visible: true,
            title: t('exportProgress.title'),
            message: `${t('exportProgress.message')} ${data.fileName}...`,
            percentage: data.percentage,
          };
        };

        window.electronAPI.onExportProgress(progressListener);
        const result = await window.electronAPI.exportProject(currentProject.value.folderPath, currentProject.value.name);
        window.electronAPI.removeExportProgressListener(progressListener);
        await new Promise(resolve => setTimeout(resolve, 500));
        progressModal.value.visible = false;

        if (result.success) {
          console.log('Project exported successfully:', result.path);
        }
      } catch (error) {
        console.error('Export failed:', error);
        progressModal.value.visible = false;
      }
    });

    window.electronAPI.onMenuCloseProject(() => {
      closeProject();
    });

    window.electronAPI.onMenuOpenProjectFolder(() => {
      if (currentProject.value) {
        window.electronAPI.openFolder(currentProject.value.folderPath);
      }
    });

    window.electronAPI.onTriggerItem((_event, data) => {
      if (data.type === 'uuid') {
        triggerByUuid(data.value);
      } else if (data.type === 'index') {
        triggerByIndex(data.value);
      }
    });

    window.electronAPI.onStopItem((_event, data) => {
      if (data.type === 'uuid') {
        stopCue(data.value);
      }
    });
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'F1') {
      e.preventDefault();
      if (selectedItem.value && selectedItem.value.type === 'audio') {
        playCue(selectedItem.value as AudioItem);
      }
    }
  };

  return {
    progressModal,
    registerListeners,
    handleKeydown,
  };
};
