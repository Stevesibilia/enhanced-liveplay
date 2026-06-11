import { watch } from 'vue';
import type { Project, ThemeMode } from '~/types/project';
import { THEME_LIST } from '~/types/project';

/**
 * Registers IPC listeners for application menu actions (theme toggle,
 * accent color, language, about, open-project-file, minimal mode).
 */
export const useMenuListeners = () => {
  const { currentProject, saveProject, openProject, visualDisplayEnabled, setVisualDisplayEnabled } = useProject();
  const { setLocale, currentLocale } = useLocalization();
  const theme = useState('theme', () => 'cobalt');

  const showColorPicker = ref(false);
  const showAboutModal = ref(false);
  const isMinimalMode = ref(false);

  const toggleMinimalMode = async () => {
    if (!import.meta.client || !window.electronAPI) return;
    isMinimalMode.value = !isMinimalMode.value;
    if (isMinimalMode.value) {
      await window.electronAPI.enterMinimalMode();
    } else {
      await window.electronAPI.exitMinimalMode();
    }
  };

  const registerListeners = () => {
    if (!import.meta.client || !window.electronAPI) return;

    window.electronAPI.onMenuSetTheme((_event, themeId) => {
      if (!THEME_LIST.some(t => t.id === themeId)) return;
      theme.value = themeId;
      if (currentProject.value) {
        currentProject.value.theme.mode = themeId as ThemeMode;
        saveProject();
      }
      // Mirror to main so the menu radio survives rebuilds
      window.electronAPI.setCurrentTheme(themeId);
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

    window.electronAPI.onMenuToggleMinimalMode(() => {
      toggleMinimalMode();
    });

    window.electronAPI.onMenuToggleVisualDisplay(() => {
      setVisualDisplayEnabled(!visualDisplayEnabled.value);
    });

    // Keep the main process menu state in sync with the active project's flag.
    watch(
      visualDisplayEnabled,
      (enabled) => {
        if (window.electronAPI?.setVisualDisplayEnabled) {
          window.electronAPI.setVisualDisplayEnabled(enabled);
        }
      },
      { immediate: true }
    );

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
    isMinimalMode,
    toggleMinimalMode,
    registerListeners,
  };
};
