import type { Project } from '~/types/project';

/**
 * Manages import/export progress modals and project selection.
 * Encapsulates all IPC listeners related to importing and opening .lpa files.
 */
export const useImportExport = () => {
  const { openProject } = useProject();
  const { t } = useLocalization();

  const progressModal = ref({
    visible: false,
    title: '',
    message: '',
    percentage: 0,
  });

  const showProjectSelection = ref(false);
  const availableProjects = ref<string[]>([]);
  const pendingImportPath = ref('');

  const handleProjectSelection = async (projectName: string) => {
    showProjectSelection.value = false;
    const projectPath = `${pendingImportPath.value}/${projectName}`;
    await openProject(projectPath);
    pendingImportPath.value = '';
    availableProjects.value = [];
  };

  const handleProjectSelectionCancel = () => {
    showProjectSelection.value = false;
    pendingImportPath.value = '';
    availableProjects.value = [];
  };

  const handleImportResult = async (result: { success?: boolean; multipleProjects?: boolean; projectFiles?: string[]; extractPath?: string; projectPath?: string }) => {
    if (result.success) {
      if (result.multipleProjects && result.projectFiles) {
        availableProjects.value = result.projectFiles;
        pendingImportPath.value = result.extractPath || '';
        showProjectSelection.value = true;
      } else if (result.projectPath) {
        await openProject(result.projectPath);
      }
    }
  };

  const registerListeners = () => {
    if (!import.meta.client || !window.electronAPI) return;

    window.electronAPI.onMenuImportProject(async () => {
      try {
        const progressListener: Parameters<typeof window.electronAPI.onImportProgress>[0] = (_event, data) => {
          progressModal.value = {
            visible: true,
            title: t('importProgress.title'),
            message: `${t('importProgress.message')} ${data.fileName}...`,
            percentage: data.percentage,
          };
        };

        window.electronAPI.onImportProgress(progressListener);
        const result = await window.electronAPI.importProject();
        window.electronAPI.removeImportProgressListener(progressListener);
        progressModal.value.visible = false;
        await handleImportResult(result);
      } catch (error) {
        console.error('Import failed:', error);
        progressModal.value.visible = false;
      }
    });

    window.electronAPI.onOpenLpaFile(async (_event, data) => {
      try {
        console.log('Opening .lpa file:', data.lpaPath);
        const progressListener: Parameters<typeof window.electronAPI.onImportProgress>[0] = (_event, progressData) => {
          progressModal.value = {
            visible: true,
            title: t('importProgress.title'),
            message: `${t('importProgress.message')} ${progressData.fileName}...`,
            percentage: progressData.percentage,
          };
        };

        window.electronAPI.onImportProgress(progressListener);
        const result = await window.electronAPI.importLpaFile(data.lpaPath);
        window.electronAPI.removeImportProgressListener(progressListener);
        progressModal.value.visible = false;
        await handleImportResult(result);
      } catch (error) {
        console.error('Failed to open .lpa file:', error);
        progressModal.value.visible = false;
      }
    });
  };

  return {
    progressModal,
    showProjectSelection,
    availableProjects,
    handleProjectSelection,
    handleProjectSelectionCancel,
    registerListeners,
  };
};
