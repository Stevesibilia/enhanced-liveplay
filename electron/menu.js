const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const state = require('./state');
const {
  createStateViewerWindow,
  createPlayerWindow,
  closePlayerWindow,
} = require('./windows');

// Translation strings for menu (default: English)
// Dynamically load all locale files from the locales directory
function loadLocaleFiles() {
  const localesDir = path.join(__dirname, '../locales');
  const localeFiles = {};
  
  try {
    // Read all files in the locales directory
    const files = fs.readdirSync(localesDir);
    
    // Filter for JSON files and load them
    files.forEach(file => {
      if (file.endsWith('.json')) {
        const code = file.replace('.json', '');
        try {
          localeFiles[code] = require(path.join(localesDir, file));
          console.log(`Loaded locale: ${code}`);
        } catch (error) {
          console.error(`Failed to load locale ${code}:`, error);
        }
      }
    });
    
    console.log(`Loaded ${Object.keys(localeFiles).length} locale files`);
  } catch (error) {
    console.error('Failed to read locales directory:', error);
    // Fallback to English if directory read fails
    localeFiles.en = require('../locales/en.json');
  }
  
  return localeFiles;
}

const localeFiles = loadLocaleFiles();

// Build menu translations from locale files
const menuTranslations = Object.entries(localeFiles).reduce((acc, [code, data]) => {
  acc[code] = {
    file: data.menu.file,
    newProject: data.menu.newProject,
    openProject: data.menu.openProject,
    saveProject: data.menu.saveProject,
    exportProject: data.menu.exportProject,
    importProject: data.menu.importProject,
    closeProject: data.menu.closeProject,
    openProjectFolder: data.menu.openProjectFolder,
    exit: data.menu.exit,
    view: data.menu.view,
    theme: data.menu.theme || 'Theme',
    changeAccentColor: data.menu.changeAccentColor,
    fullscreen: data.menu.fullscreen,
    language: data.menu.language,
    help: data.menu.help,
    about: data.menu.about
  };
  return acc;
}, {});

// Selectable themes — ids and order must match THEME_LIST in app/types/project.ts.
// Labels are proper nouns, not translated.
const THEMES = [
  { id: 'cobalt', label: 'Cobalt' },
  { id: 'calm-slate', label: 'Calm Slate' },
  { id: 'dark', label: 'Classic Dark' },
  { id: 'light', label: 'Classic Light' },
];

let currentLocale = 'en';

function createMenu(locale = 'en', isDev = false) {
  currentLocale = locale;
  const t = menuTranslations[locale] || menuTranslations.en;
  
  const template = [
    {
      label: t.file,
      submenu: [
        {
          label: t.newProject,
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            state.getMainWindow().webContents.send('menu-new-project');
          }
        },
        {
          label: t.openProject,
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            state.getMainWindow().webContents.send('menu-open-project');
          }
        },
        {
          label: t.saveProject,
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            state.getMainWindow().webContents.send('menu-save-project');
          }
        },
        { type: 'separator' },
        {
          label: t.exportProject,
          enabled: state.getCurrentProject() !== null,
          click: () => {
            state.getMainWindow().webContents.send('menu-export-project');
          }
        },
        {
          label: t.importProject,
          click: () => {
            state.getMainWindow().webContents.send('menu-import-project');
          }
        },
        { type: 'separator' },
        {
          label: t.openProjectFolder,
          click: () => {
            state.getMainWindow().webContents.send('menu-open-project-folder');
          }
        },
        { type: 'separator' },
        {
          label: t.closeProject,
          accelerator: 'CmdOrCtrl+W',
          click: () => {
            state.getMainWindow().webContents.send('menu-close-project');
          }
        },
        { type: 'separator' },
        {
          label: t.exit,
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: t.view,
      submenu: [
        {
          label: t.theme,
          submenu: THEMES.map((theme) => ({
            label: theme.label,
            type: 'radio',
            checked: state.getCurrentTheme() === theme.id,
            click: () => {
              state.getMainWindow().webContents.send('menu-set-theme', theme.id);
            }
          }))
        },
        {
          label: t.changeAccentColor,
          click: () => {
            state.getMainWindow().webContents.send('menu-change-accent-color');
          }
        },
        { type: 'separator' },
        {
          label: t.fullscreen,
          accelerator: 'F11',
          click: () => {
            // Toggle fullscreen on the focused window
            const focusedWindow = BrowserWindow.getFocusedWindow();
            const playerWindow = state.getPlayerWindow();
            if (focusedWindow) {
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
              // Notify player renderer if it's the player window
              if (focusedWindow === playerWindow) {
                playerWindow.webContents.send('toggle-fullscreen');
              }
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Minimal Mode',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            state.getMainWindow().webContents.send('menu-toggle-minimal-mode');
          }
        },
        { type: 'separator' },
        {
          label: 'Enable Visual Display',
          type: 'checkbox',
          checked: state.getVisualDisplayEnabled(),
          click: () => {
            state.getMainWindow().webContents.send('menu-toggle-visual-display');
          }
        },
        {
          label: 'Open/Close Player Window',
          accelerator: 'CmdOrCtrl+P',
          enabled: state.getVisualDisplayEnabled(),
          click: () => {
            if (!state.getVisualDisplayEnabled()) return;
            if (state.getPlayerWindow()) {
              closePlayerWindow();
            } else {
              createPlayerWindow();
            }
          }
        },
        { type: 'separator' },
        {
          label: t.language,
          submenu: Object.values(localeFiles).map((localeData) => ({
            label: localeData._metadata.nativeName,
            type: 'radio',
            checked: locale === localeData._metadata.code,
            click: () => {
              state.getMainWindow().webContents.send('menu-change-language', localeData._metadata.code);
              createMenu(localeData._metadata.code, isDev);
            }
          }))
        },
        ...(isDev ? [
          { type: 'separator' },
          {
            label: 'Show Current State',
            accelerator: 'CmdOrCtrl+Shift+D',
            click: () => {
              createStateViewerWindow();
            }
          },
          { type: 'separator' },
          { role: 'reload' },
          { role: 'forceReload' },
          { 
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => {
            const mainWindow = state.getMainWindow();
            if (mainWindow && mainWindow.webContents) {
              mainWindow.webContents.toggleDevTools();
            }
          }
        }
        ] : [])
      ]
    },
    {
      label: t.help,
      submenu: [
        {
          label: t.about,
          click: () => {
            state.getMainWindow().webContents.send('menu-show-about');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Re-render the menu with the current locale (used by IPC handlers after
// project or visual-display state changes).
function rebuildMenu() {
  createMenu(currentLocale, state.isDevMode);
}

function getLocaleFiles() {
  return localeFiles;
}

module.exports = { createMenu, rebuildMenu, getLocaleFiles };
