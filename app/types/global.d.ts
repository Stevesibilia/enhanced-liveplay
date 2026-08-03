import type { IpcEvent, TriggerItemPayload, StopItemPayload, UpdateInfo, MidiConfig, DisplayState, PlayerDisplayState } from './ipc';

export {};

declare global {
  interface Window {
    electronAPI: {
      selectProjectFolder: () => Promise<string | null>;
      selectProjectFile: () => Promise<string | null>;
      selectAudioFiles: () => Promise<string[] | null>;
      selectVisualMediaFiles: () => Promise<string[] | null>;
      readFile: (filePath: string) => Promise<{ success: boolean; data?: string; error?: string }>;
      readAudioFile: (filePath: string) => Promise<{ success: boolean; data?: number[]; error?: string }>;
      writeFile: (filePath: string, data: string) => Promise<{ success: boolean; error?: string }>;
      copyFile: (source: string, destination: string) => Promise<{ success: boolean; error?: string }>;
      ensureDirectory: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
      generateWaveform: (audioPath: string, outputPath: string) => Promise<{ success: boolean; error?: string }>;
      openFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
      setCurrentProject: (projectPath: string | null) => Promise<{ success: boolean }>;
      exportProject: (projectFolderPath: string, projectName?: string) => Promise<{ success: boolean; path?: string; size?: number; canceled?: boolean; error?: string }>;
      importProject: () => Promise<{ 
        success: boolean; 
        projectPath?: string; 
        extractPath?: string; 
        multipleProjects?: boolean;
        projectFiles?: string[];
        canceled?: boolean; 
        error?: string 
      }>;
      importLpaFile: (lpaPath: string) => Promise<{ 
        success: boolean; 
        projectPath?: string; 
        extractPath?: string; 
        multipleProjects?: boolean;
        projectFiles?: string[];
        canceled?: boolean; 
        error?: string 
      }>;
      onExportProgress: (callback: (event: IpcEvent, data: { percentage: number; fileName: string }) => void) => void;
      onImportProgress: (callback: (event: IpcEvent, data: { percentage: number; fileName: string }) => void) => void;
      removeExportProgressListener: (callback: (event: IpcEvent, data: { percentage: number; fileName: string }) => void) => void;
      removeImportProgressListener: (callback: (event: IpcEvent, data: { percentage: number; fileName: string }) => void) => void;
      getFilePath: (file: File) => string | null;
      checkFfmpeg: () => Promise<{ available: boolean; path: string | null }>;
      searchYouTube: (query: string) => Promise<Array<{
        id: string;
        title: string;
        thumbnail: string;
        channelTitle: string;
        length?: string;
      }>>;
      downloadYouTubeAudio: (
        videoId: string,
        title: string,
        projectFolderPath: string,
        progressCallback?: (progress: { videoId: string; percentage: number; status: string }) => void
      ) => Promise<{ success: boolean; file: string; fileName: string; title: string }>;
      onMenuNewProject: (callback: () => void) => void;
      onMenuOpenProject: (callback: () => void) => void;
      onMenuSaveProject: (callback: () => void) => void;
      onMenuExportProject: (callback: () => void) => void;
      onMenuImportProject: (callback: () => void) => void;
      onMenuCloseProject: (callback: () => void) => void;
      onMenuOpenProjectFolder: (callback: () => void) => void;
      onMenuSetTheme: (callback: (event: IpcEvent, themeId: string) => void) => void;
      onMenuChangeAccentColor: (callback: () => void) => void;
      onMenuChangeLanguage: (callback: (event: IpcEvent, locale: string) => void) => void;
      onMenuShowAbout: (callback: () => void) => void;
      onMenuToggleMinimalMode: (callback: () => void) => void;
      onMenuToggleVisualDisplay: (callback: () => void) => void;
      setVisualDisplayEnabled: (enabled: boolean) => Promise<{ success: boolean }>;
      setCurrentTheme: (themeId: string) => Promise<{ success: boolean }>;
      enterMinimalMode: () => Promise<void>;
      exitMinimalMode: () => Promise<void>;
      openExternal: (url: string) => Promise<void>;
      updateMenuLanguage: (locale: string) => Promise<{ success: boolean }>;
      getSystemLocale: () => Promise<string>;
      getAvailableLocales: () => Promise<Array<{ code: string; name: string; direction: string }>>;
      getLocaleData: (localeCode: string) => Promise<Record<string, string>>;
      checkForUpdates: () => Promise<{ success: boolean; updateInfo?: UpdateInfo; error?: string; isManualUpdate?: boolean }>;
      downloadUpdate: () => Promise<{ success: boolean; error?: string }>;
      installUpdate: () => void;
      getAppVersion: () => Promise<string>;
      onUpdateAvailable: (callback: (event: IpcEvent, info: { currentVersion: string; newVersion: string; releaseNotes?: string; releaseDate?: string }) => void) => void;
      onUpdateDownloadProgress: (callback: (event: IpcEvent, progress: { percent: number; transferred: number; total: number }) => void) => void;
      onUpdateDownloaded: (callback: (event: IpcEvent, info: { version: string }) => void) => void;
      onUpdateError: (callback: (event: IpcEvent, error: string) => void) => void;
      onManualUpdateAvailable: (callback: (event: IpcEvent, info: { currentVersion: string; newVersion: string; downloadUrl: string; isManualUpdate: boolean }) => void) => void;
      onTriggerItem: (callback: (event: IpcEvent, data: TriggerItemPayload) => void) => void;
      onStopItem: (callback: (event: IpcEvent, data: StopItemPayload) => void) => void;
      onOpenProjectFile: (callback: (event: IpcEvent, data: { filePath: string; projectData: unknown }) => void) => void;
      onOpenLpaFile: (callback: (event: IpcEvent, data: { lpaPath: string }) => void) => void;
      readMidiConfig: () => Promise<MidiConfig>;
      writeMidiConfig: (config: MidiConfig) => Promise<{ success: boolean }>;
      writeClipboardText: (text: string) => Promise<{ success: boolean }>;
      importVisualMedia: (projectFolderPath: string, sourceFilePath: string, uuid: string) => Promise<{ success: boolean; mediaFileName?: string; mediaPath?: string; error?: string }>;
      readVisualMedia: (projectFolderPath: string, mediaPath: string) => Promise<{ success: boolean; data?: string; mimeType?: string; error?: string }>;
      deleteVisualMedia: (projectFolderPath: string, mediaPath: string) => Promise<{ success: boolean; error?: string }>;
      // Player window
      openPlayerWindow: () => Promise<{ success: boolean }>;
      closePlayerWindow: () => Promise<{ success: boolean }>;
      getPlayerWindowStatus: () => Promise<{ open: boolean }>;
      pushToPlayer: (displayState: PlayerDisplayState | DisplayState) => Promise<{ success: boolean; error?: string }>;
      togglePlayerFullscreen: () => Promise<{ success: boolean; error?: string }>;
      onPlayerWindowStatusChanged: (callback: (isOpen: boolean) => void) => void;
      // Remote viewer (LAN browser)
      setRemoteViewerEnabled: (enabled: boolean) => Promise<{ success: boolean; enabled: boolean }>;
      getRemoteViewerStatus: () => Promise<{ enabled: boolean; port: number | null; urls: string[] }>;
    };
  }

  interface ImportMeta {
    client: boolean;
  }
}
