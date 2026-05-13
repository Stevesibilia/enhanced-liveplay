import type { Project } from '~/types/project';

/**
 * Registers IPC listeners for application menu actions (theme toggle,
 * accent color, language, about, open-project-file).
 */
export const useMenuListeners = () => {
  const { currentProject, saveProject, openProject } = useProject();
  const { setLocale, currentLocale } = useLocalization();
  const theme = useState('theme', () => 'dark');

  const showColorPicker = ref(false);
  const showAboutModal = ref(false);

  const registerListeners = () => {
    if (!import.meta.client || !window.electronAPI) return;

    window.electronAPI.onMenuToggleDarkMode(() => {
      theme.value = theme.value === 'dark' ? 'light' : 'dark';
      if (currentProject.value) {
        currentProject.value.theme.mode = theme.value as 'dark' | 'light';
        saveProject();
      }
    });

    window.electronAPI.onMenuChangeAccentColor(() => {
      showColorPicker.value = true;
    });

    window.electronAPI.onMenuChangeLanguage((_event, locale) => {
      setLocale(locale);
    });

    window.electronAPI.onMenuShowAbout(() => {
      showAboutModal.value = true;
    });

    window.electronAPI.onOpenProjectFile((_event, data) => {
      try {
        currentProject.value = data.projectData as Project;
        console.log('Opened project from file association:', data.filePath);
      } catch (error) {
        console.error('Failed to open project file:', error);
      }
    });

    // Sync menu with current UI language on startup
    window.electronAPI.updateMenuLanguage(currentLocale.value);
  };

  return {
    theme,
    showColorPicker,
    showAboutModal,
    registerListeners,
  };
};
