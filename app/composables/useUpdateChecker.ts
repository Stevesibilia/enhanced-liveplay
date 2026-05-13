/**
 * Manages update-available notifications from Electron auto-updater.
 */
export const useUpdateChecker = () => {
  const showUpdateModal = ref(false);
  const updateInfo = ref({
    currentVersion: '',
    newVersion: '',
    releaseNotes: '',
    releaseDate: '',
    isManualUpdate: false,
    downloadUrl: '',
  });

  const registerListeners = () => {
    if (!import.meta.client || !window.electronAPI) return;

    window.electronAPI.onUpdateAvailable((_event, info) => {
      updateInfo.value = { ...updateInfo.value, ...info };
      showUpdateModal.value = true;
    });

    window.electronAPI.onManualUpdateAvailable((_event, info) => {
      updateInfo.value = { ...updateInfo.value, ...info };
      showUpdateModal.value = true;
    });
  };

  return {
    showUpdateModal,
    updateInfo,
    registerListeners,
  };
};
