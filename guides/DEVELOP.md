# LivePlay - Developer Documentation

This document is for developers who want to contribute to LivePlay, understand its architecture, or build custom modifications.

---

## Replatform Branch: Development Setup (feat/replatform-server)

> This section applies to the `feat/replatform-server` branch which uses the upstream
> v2.1.1 client-server architecture (C++20 engine + Electron/Nuxt client).
> See `guides/REPLATFORM-MIGRATION-PLAN.md` for the full migration context.

### Architecture

```
server/   C++20 audio engine (miniaudio, Crow REST/WS, TagLib)
client/   Electron + Nuxt remote-control client
```

Client and server communicate via:

- REST `http://localhost:4480` — project data, cues, waveforms, file ops
- WebSocket `ws://localhost:4480/ws` — ~60 Hz meters + transport events
- UDP `:4481` — LAN auto-discovery (single-host: not needed)

### Prerequisites

| Requirement                   | Notes                                                                     |
| ----------------------------- | ------------------------------------------------------------------------- |
| **Docker**                    | Required to build the C++ server binary                                   |
| **Node.js 20+**               | Client dependencies (`client/` uses npm)                                  |
| `libasound2t64` + `libpulse0` | Linux: runtime audio libs (dev packages NOT needed; Docker handles those) |

Everything else (CMake, Ninja, vcpkg, C++ toolchain) runs inside Docker — nothing to install on the host.

### First-time Setup

```bash
# 1. Build the C++ server binary (first run ~10 min; Docker layer-cached after)
just build-server
# Output: server/build/liveplay-server

# 2. Install client Node dependencies
just install

# 3. Start dev mode (Nuxt + Electron)
just dev
```

`just dev` sets `ELECTRON_DISABLE_SANDBOX=1` automatically on Linux — always use `just dev`, not `npm run dev` directly from `client/`.

### Rebuilding the Server

Only needed when `server/` source changes:

```bash
just build-server        # release build → server/build/liveplay-server
just build-server-debug  # debug build   → server/build/liveplay-server-debug
```

### Useful `just` Recipes

```
just dev              Start Nuxt + Electron (sandbox-safe on Linux)
just dev-electron     Electron only (requires Nuxt already on :3000)
just dev-nuxt         Nuxt only
just build-server     Build C++ server via Docker
just install          Install client npm dependencies
just format-md <f>    Format markdown files via Prettier
```

---

## 🏗️ Architecture Overview

### Technology Stack

```
┌─────────────────────────────────────────────────┐
│              Electron 28.0.0                     │
├─────────────────────────────────────────────────┤
│  Main Process          │   Renderer Process     │
│  ├─ Node.js            │   ├─ Nuxt 3.20.0      │
│  ├─ Express Server     │   ├─ Vue 3.5.22       │
│  ├─ File System        │   ├─ TypeScript       │
│  ├─ IPC Handlers       │   ├─ Howler.js        │
│  └─ REST API (8080)    │   └─ SCSS             │
└─────────────────────────────────────────────────┘
```

### Key Dependencies

**Main Process (Electron)**:

- `electron` - Desktop app framework
- `express` - REST API server
- `fluent-ffmpeg` - Audio processing
- `yt-dlp-wrap` - YouTube audio download
- `electron-updater` - Auto-update system

**Renderer Process (Vue/Nuxt)**:

- `nuxt` - Vue meta-framework
- `vue` - Reactive UI framework
- `howler` - Web Audio API wrapper
- `wavesurfer.js` - Waveform visualization
- `material-symbols` - Icon library

---

## 📁 Project Structure

```
liveplay/
├── electron/                    # Electron Main Process
│   ├── main.js                 # Entry point, window, menu, IPC, API
│   └── preload.js              # IPC bridge (contextBridge)
│
├── components/                  # Vue 3 Single File Components
│   ├── WelcomeScreen.vue       # Initial project selection
│   ├── MainWorkspace.vue       # Main layout container
│   ├── PlaybackControls.vue    # Top section: play/stop controls
│   ├── ActiveCueItem.vue       # Individual playing cue display
│   ├── PlaylistView.vue        # Cue list management
│   ├── PlaylistItem.vue        # Recursive playlist item
│   ├── CartPlayer.vue          # 16-slot cart grid
│   ├── CartSlot.vue            # Individual cart button
│   ├── PropertiesPanel.vue     # Bottom property editor
│   ├── WaveformTrimmer.vue     # Audio trimming interface
│   ├── VUMeter.vue             # Audio level meter
│   ├── AboutModal.vue          # About dialog
│   ├── UpdateModal.vue         # Update notification
│   └── YouTubeImportModal.vue  # YouTube downloader
│
├── composables/                 # Vue Composables (Business Logic)
│   ├── useProject.ts           # Project CRUD, item management
│   ├── useAudioEngine.ts       # Audio playback, ducking, triggers
│   └── useLocalization.ts      # i18n localization system
│
├── types/                       # TypeScript Definitions
│   ├── project.ts              # Data models, interfaces
│   └── global.d.ts             # Global type augmentations
│
├── locales/                     # Internationalization
│   ├── en.json                 # English translations
│   └── el.json                 # Greek translations
│
├── assets/                      # Static Assets (bundled)
│   ├── styles/
│   │   ├── main.scss           # Global styles, CSS variables
│   │   └── variables.scss      # SCSS variables
│   ├── icons/                  # App icons
│   └── fonts/                  # Source fonts (backup)
│
├── public/                      # Static Assets (copied as-is)
│   ├── fonts/                  # IBM Plex Sans, Inter (renamed)
│   └── liveplay_screenshot.jpg
│
├── app.vue                      # Root Vue component
├── nuxt.config.ts              # Nuxt 3 configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies & scripts
├── README.md                   # User documentation
├── DEVELOP.md                  # This file
├── UPDATE_SYSTEM.md            # Auto-update documentation
└── LICENSE.txt                 # AGPL-3.0 license
```

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.x (for node-gyp native modules)
- **Visual Studio Build Tools** (Windows only)
- **Git**

### Installation

```bash
# Clone the repository
git clone https://github.com/tdoukinitsas/liveplay.git
cd liveplay

# Install dependencies
npm install

# Run development server
npm run dev
```

This will:

1. Start Nuxt dev server on `http://localhost:3000`
2. Wait for server to be ready
3. Launch Electron with DevTools open

### Development Scripts

```json
{
  "dev": "Start Nuxt + Electron in dev mode",
  "dev:nuxt": "Start only Nuxt dev server",
  "dev:electron": "Start only Electron (requires Nuxt running)",
  "build": "Build Nuxt for production",
  "build:electron": "Build + package Electron app",
  "generate": "Generate static Nuxt site",
  "preview": "Preview built Nuxt site"
}
```

---

## 🧩 Core Systems

### 1. Project Management (`composables/useProject.ts`)

Handles all project-related operations:

```typescript
const {
  currentProject, // Ref<Project | null>
  selectedItem, // Ref<BaseItem | null>
  createNewProject, // (name, path) => Promise<void>
  openProject, // (filePath) => Promise<void>
  saveProject, // () => Promise<void>
  closeProject, // () => void
  addItem, // (item, parentIndex?) => void
  removeItem, // (uuid) => void
  findItemByUuid, // (uuid) => BaseItem | null
  findItemByIndex, // (index[]) => BaseItem | null
  moveItem, // (from[], to[]) => void
  updateItemProperty, // (uuid, key, value) => void
} = useProject();
```

**Key Functions**:

- **createNewProject**: Creates folder structure, initializes JSON
- **openProject**: Loads `.liveplay` file, validates data
- **saveProject**: Serializes project to JSON, writes to disk
- **addItem**: Adds audio/group to playlist, recalculates indices
- **removeItem**: Deletes item recursively, updates indices
- **findItemByUuid**: Fast O(n) lookup using flat map
- **findItemByIndex**: Traverses tree using index array

### 2. Audio Engine (`composables/useAudioEngine.ts`)

Manages all audio playback using Howler.js:

```typescript
const {
  activeCues, // Map<uuid, ActiveCue>
  initAudioContext, // () => void
  playCue, // (item) => void
  stopCue, // (uuid) => void
  stopAllCues, // () => void
  triggerByUuid, // (uuid) => void
  triggerByIndex, // (index[]) => void
  estimateAudioLevel, // (volume, item, time) => number
} = useAudioEngine();
```

**Playback Flow**:

1. User triggers cue → `playCue(item)`
2. Load audio buffer (cached)
3. Create Howler instance with in/out points
4. Apply ducking to other active cues
5. Start playback, add to `activeCues` map
6. Execute start behavior
7. Monitor progress with RAF loop
8. On end: execute end behavior, restore ducking

**Ducking Implementation**:

```typescript
const applyDucking = (newCue: ActiveCue) => {
  switch (newCue.item.duckingBehavior.mode) {
    case "stopAll":
      stopAllCues();
      break;
    case "duckOthers":
      activeCues.forEach((cue) => {
        if (cue.uuid !== newCue.uuid) {
          cue.originalVolume = cue.howl.volume();
          cue.howl.volume(cue.originalVolume * duckLevel);
        }
      });
      break;
    case "noDucking":
      // Do nothing
      break;
  }
};
```

### 3. Localization (`composables/useLocalization.ts`)

Full internationalization system with **20 languages** and **RTL support**:

```typescript
const {
  currentLocale, // Ref<'en' | 'el' | 'fr' | 'es' | 'it' | 'pt' | 'ar' | 'fa' | 'de' | 'sv' | 'no' | 'ru' | 'ja' | 'zh' | 'hi' | 'bn' | 'tr' | 'ko' | 'sq' | 'ur'>
  t, // (key) => string
  setLocale, // (locale) => void
  getDirection, // () => 'ltr' | 'rtl'
  availableLocales, // { code, name, direction }[]
} = useLocalization();
```

**Supported Languages**:

- Western European: English (`en`), Greek (`el`), French (`fr`), Spanish (`es`), Italian (`it`), Portuguese (`pt`), German (`de`), Swedish (`sv`), Norwegian (`no`), Albanian (`sq`)
- Slavic: Russian (`ru`)
- East Asian: Japanese (`ja`), Chinese (`zh`), Korean (`ko`)
- South Asian: Hindi (`hi`), Bengali (`bn`), Urdu (`ur`)
- Middle Eastern: Arabic (`ar`), Farsi (`fa`), Turkish (`tr`)
- RTL layout support for Arabic, Farsi, and Urdu

**Translation Keys**:

- Nested object structure: `t('playlist.title')`
- Fallback to English if key missing
- Auto-saves to `localStorage('liveplay-locale')`

**Locale Files** (`locales/*.json`):

- Include `_metadata` with `code`, `name`, `nativeName`, `direction`
- All translations in structured JSON
- Dynamically loaded in both renderer and main process

**Dynamic Menu Generation**:

- Electron menu automatically generated from locale files
- Language submenu populated from `_metadata.nativeName`
- No hardcoded strings in menu definitions

See `INTERNATIONALIZATION.md` for detailed i18n documentation.

### 4. IPC Communication

**Main → Renderer** (Events):

```javascript
// In electron/main.js
mainWindow.webContents.send("menu-new-project");
mainWindow.webContents.send("update-available", info);
mainWindow.webContents.send("trigger-item", { uuid });
```

**Renderer → Main** (Invocations):

```javascript
// In preload.js
contextBridge.exposeInMainWorld("electronAPI", {
  selectProjectFolder: () => ipcRenderer.invoke("select-project-folder"),
  readFile: (path) => ipcRenderer.invoke("read-file", path),
  // ... more handlers
});
```

**Available IPC Handlers**:

- `select-project-folder` - Open folder picker
- `select-project-file` - Open .liveplay file picker
- `select-audio-files` - Select audio files to import
- `read-file` - Read text file
- `read-audio-file` - Read binary audio data
- `write-file` - Write file to disk
- `copy-file` - Copy file (used for importing media)
- `ensure-directory` - Create directory recursively
- `generate-waveform` - Create waveform JSON (placeholder)
- `open-folder` - Open in system file explorer
- `set-current-project` - Update current project path
- `check-ffmpeg` - Verify FFmpeg availability
- `search-youtube` - Search YouTube videos
- `download-youtube-audio` - Download and convert to MP3
- `open-external` - Open URL in default browser
- `update-menu-language` - Change menu language
- `check-for-updates` - Manual update check
- `download-update` - Download available update
- `install-update` - Quit and install update
- `get-app-version` - Get current app version

### 5. REST API (`electron/main.js`)

Express server on port 8080:

```javascript
GET  /api/trigger/uuid/:uuid        // Trigger cue by UUID
GET  /api/trigger/index/:index      // Trigger by index (e.g., "0,1,2")
GET  /api/stop/uuid/:uuid           // Stop specific cue
GET  /api/project/info              // Get current project data
```

**Example Usage**:

```bash
curl http://localhost:8080/api/trigger/index/0
curl http://localhost:8080/api/stop/uuid/abc-123-def-456
```

---

## 📊 Data Models

### BaseItem (Abstract)

```typescript
interface BaseItem {
  uuid: string; // v4 UUID
  index: number[]; // [0,1,2] = third item in second group
  displayName: string; // User-visible name
  color: string; // Hex color (e.g., "#0066FF")
  type: "audio" | "group";
}
```

### AudioItem

```typescript
interface AudioItem extends BaseItem {
  type: "audio";
  mediaFileName: string; // "song.mp3"
  mediaPath: string; // Absolute path
  waveformPath: string; // Path to waveform JSON
  inPoint: number; // Trim start (seconds)
  outPoint: number; // Trim end (seconds)
  volume: number; // 0-2 (1 = 100%)
  duration: number; // Total duration
  endBehavior: EndBehavior;
  startBehavior: StartBehavior;
  duckingBehavior: DuckingBehavior;
  customActions: CustomAction[];
}
```

### GroupItem

```typescript
interface GroupItem extends BaseItem {
  type: "group";
  children: (AudioItem | GroupItem)[]; // Recursive
  startBehavior: GroupStartBehavior;
  endBehavior: EndBehavior;
  isExpanded: boolean; // UI state
}
```

### Project

```typescript
interface Project {
  name: string;
  version: string; // "1.0.0"
  folderPath: string; // Absolute path
  items: (AudioItem | GroupItem)[];
  cartItems: CartItem[]; // { slot: number, itemUuid: string }
  theme: {
    mode: "light" | "dark";
    accentColor: string;
  };
  createdAt: string; // ISO 8601
  lastModified: string; // ISO 8601
}
```

---

## 🎨 Theming System

### CSS Variables

All colors and spacing use CSS custom properties:

```scss
:root {
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  // ...

  --border-radius-sm: 2px;
  --border-radius-md: 4px;
  --border-radius-lg: 8px;

  --transition-fast: 150ms ease;
  --transition-base: 250ms ease;
  // ...
}

[data-theme="light"] {
  --color-background: #ffffff;
  --color-surface: #f4f4f4;
  --color-text-primary: #161616;
  --color-accent: var(--color-accent-custom, #da1e28);
  // ...
}

[data-theme="dark"] {
  --color-background: #161616;
  --color-surface: #262626;
  --color-text-primary: #f4f4f4;
  --color-accent: var(--color-accent-custom, #da1e28);
  // ...
}
```

### Custom Accent Colors

```typescript
// Set custom accent color
document.documentElement.style.setProperty("--color-accent-custom", "#0066FF");
```

### Theme Toggle

```typescript
// In app.vue
const theme = useState("theme", () => "dark");

// Toggle
theme.value = theme.value === "dark" ? "light" : "dark";
```

---

## 🔄 Auto-Update System

See [UPDATE_SYSTEM.md](UPDATE_SYSTEM.md) for comprehensive documentation.

**Quick Overview**:

1. App checks GitHub releases on startup (production only)
2. Compares current version with latest release
3. Shows `UpdateModal` if new version available
4. User downloads update (with progress bar)
5. User installs immediately or on exit
6. App quits and installs new version

**Key Files**:

- `electron/main.js` - Auto-updater configuration
- `components/UpdateModal.vue` - Update UI
- `package.json` - Publish configuration

---

## 🧪 Adding New Features

### Adding a New Component

1. **Create Component** (`components/MyComponent.vue`):

```vue
<template>
  <div class="my-component">
    <h2>{{ t("myComponent.title") }}</h2>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocalization();
const { currentProject } = useProject();
</script>

<style scoped lang="scss">
.my-component {
  padding: var(--spacing-md);
  background: var(--color-surface);
}
</style>
```

2. **Add Translations** (`locales/en.json`, `locales/el.json`):

```json
{
  "myComponent": {
    "title": "My Component"
  }
}
```

3. **Import in Parent**:

```vue
<template>
  <MyComponent />
</template>
```

### Adding a New Item Type

1. **Define Type** (`types/project.ts`):

```typescript
export interface VideoItem extends BaseItem {
  type: "video";
  videoPath: string;
  // ...
}
```

2. **Update Unions**:

```typescript
export type PlaylistItem = AudioItem | GroupItem | VideoItem;
```

3. **Add Playback Logic** (`composables/useAudioEngine.ts`):

```typescript
const playVideo = (item: VideoItem) => {
  // Implementation
};
```

4. **Update UI Components** to handle new type

### Adding a New IPC Handler

1. **Main Process** (`electron/main.js`):

```javascript
ipcMain.handle("my-new-handler", async (event, arg) => {
  // Implementation
  return { success: true, data: result };
});
```

2. **Preload** (`electron/preload.js`):

```javascript
contextBridge.exposeInMainWorld("electronAPI", {
  // ...
  myNewHandler: (arg) => ipcRenderer.invoke("my-new-handler", arg),
});
```

3. **Types** (`types/global.d.ts`):

```typescript
interface Window {
  electronAPI: {
    // ...
    myNewHandler: (arg: string) => Promise<{ success: boolean; data: any }>;
  };
}
```

4. **Use in Renderer**:

```typescript
const result = await window.electronAPI.myNewHandler("test");
```

---

## 🏗️ Building for Production

### Build Process

```bash
# 1. Build Nuxt (generates .output/public)
npm run build

# 2. Package Electron app (uses .output/public)
npm run build:electron
```

**Outputs** (in `dist-electron/`):

- Windows: `LivePlay Setup x.x.x.exe` + `latest.yml`
- macOS: `LivePlay-x.x.x.dmg` + `latest-mac.yml`
- Linux: `LivePlay-x.x.x.AppImage` + `latest-linux.yml`

### Publishing Updates

1. **Update Version** (`package.json`):

```json
{
  "version": "1.2.0"
}
```

2. **Build All Platforms**:

```bash
npm run build:electron
```

3. **Create GitHub Release**:
   - Go to https://github.com/tdoukinitsas/liveplay/releases/new
   - Tag: `v1.2.0`
   - Upload all files from `dist-electron/`
   - Include release notes
   - Publish

4. **Users Auto-Update**:
   - App checks on next launch
   - Shows update modal
   - Downloads and installs

---

## 🐛 Debugging

### Renderer Process

```bash
# Development mode (DevTools auto-open)
npm run dev

# Or press Ctrl+Shift+I in the app
```

### Main Process

```bash
# Add console.log statements in electron/main.js
# Output appears in the terminal running `npm run dev`
```

### IPC Communication

```javascript
// Main process
ipcMain.handle("my-handler", async (event, arg) => {
  console.log("[MAIN] Received:", arg);
  return { success: true };
});

// Renderer process
const result = await window.electronAPI.myHandler("test");
console.log("[RENDERER] Result:", result);
```

### Audio Issues

```typescript
// In useAudioEngine.ts, add logging:
const playCue = (item: AudioItem) => {
  console.log("Playing cue:", item.displayName);
  console.log("Howl instance:", howl);
  console.log("Duration:", howl.duration());
};
```

---

## 📝 Code Style Guidelines

### TypeScript

- Use **explicit types** for function parameters and return values
- Use **interfaces** for object shapes
- Use **type** for unions and complex types
- Avoid `any` - use `unknown` and type guards

```typescript
// Good
function addItem(item: AudioItem, parent?: GroupItem): void {
  // ...
}

// Bad
function addItem(item: any, parent?: any) {
  // ...
}
```

### Vue Components

- Use **Composition API** with `<script setup>`
- Use **TypeScript** for props and emits
- Use **scoped styles** with SCSS
- Use **CSS variables** for theming

```vue
<script setup lang="ts">
const props = defineProps<{
  title: string;
  count?: number;
}>();

const emit = defineEmits<{
  update: [value: string];
}>();
</script>
```

### CSS

- Use **CSS custom properties** for colors and spacing
- Use **kebab-case** for class names
- Use **SCSS nesting** sparingly (max 3 levels)
- Use **BEM methodology** for complex components

```scss
.playlist-item {
  padding: var(--spacing-md);
  background: var(--color-surface);

  &__header {
    font-weight: 600;
  }

  &--playing {
    background: var(--color-accent);
  }
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Create new project
- [ ] Import audio files
- [ ] Play/stop cues
- [ ] Adjust volume, in/out points
- [ ] Test ducking modes
- [ ] Test cart player
- [ ] Test keyboard shortcuts
- [ ] Test theme toggle
- [ ] Test accent color change
- [ ] Test save/load project
- [ ] Test API endpoints
- [ ] Test update system (production build)

### Automated Testing (TODO)

Consider adding:

- **Vitest** for unit tests
- **Playwright** for E2E tests
- **Testing Library** for component tests

---

## 🚀 Performance Optimization

### Audio Buffering

- Howler.js handles buffering automatically
- Audio files are cached in memory after first load
- Consider implementing LRU cache for large projects

### Vue Reactivity

- Use `shallowRef` for large, non-nested data
- Use `computed` for derived values
- Use `watchEffect` for side effects

```typescript
// Good - shallow ref for large object
const largeData = shallowRef<AudioItem[]>([]);

// Good - computed for derived value
const playingCues = computed(() => Array.from(activeCues.value.values()));
```

### Rendering Optimization

- Use `v-once` for static content
- Use `v-memo` for expensive lists
- Lazy load heavy components

```vue
<template>
  <!-- Static content -->
  <div v-once>{{ staticTitle }}</div>

  <!-- Memoized list -->
  <PlaylistItem
    v-for="item in items"
    :key="item.uuid"
    v-memo="[item.uuid, item.displayName]"
    :item="item"
  />
</template>
```

---

## 🔒 Security Considerations

### Electron Security

- ✅ `nodeIntegration: false` - No Node.js in renderer
- ✅ `contextIsolation: true` - Separate contexts
- ✅ `contextBridge` - Controlled IPC exposure
- ⚠️ `webSecurity: false` - For local file loading (consider alternatives)

### IPC Security

- Validate all input from renderer
- Sanitize file paths
- Limit file system access to project folder

```javascript
// Good - validate input
ipcMain.handle("read-file", async (event, filePath) => {
  if (!isValidPath(filePath)) {
    return { success: false, error: "Invalid path" };
  }
  // ...
});
```

### API Security

- API runs on localhost only
- Consider adding authentication for production
- Rate limiting for external triggers

---

## 📚 Resources

### Documentation

- [Electron Docs](https://www.electronjs.org/docs)
- [Vue 3 Docs](https://vuejs.org/guide/)
- [Nuxt 3 Docs](https://nuxt.com/docs)
- [Howler.js Docs](https://howlerjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### Useful Tools

- **Vue DevTools**: Browser extension for Vue debugging
- **Vite Inspector**: Press `Shift+Alt+I` to inspect components
- **Electron DevTools**: Built into Electron

---

## 🤝 Contributing

### Contribution Workflow

1. **Fork** the repository
2. **Clone** your fork
3. **Create** a feature branch: `git checkout -b feature/my-feature`
4. **Make** your changes
5. **Test** thoroughly
6. **Commit** with clear messages: `git commit -m "Add: New feature"`
7. **Push** to your fork: `git push origin feature/my-feature`
8. **Create** a Pull Request

### Commit Message Convention

```
Type: Brief description

Detailed explanation (optional)

Fixes #123
```

**Types**:

- `Add:` New feature
- `Fix:` Bug fix
- `Update:` Modify existing feature
- `Remove:` Delete code/feature
- `Refactor:` Code restructuring
- `Docs:` Documentation changes
- `Style:` Code style changes (formatting)
- `Test:` Add/modify tests

### Pull Request Guidelines

- Clear description of changes
- Link to related issues
- Screenshots/GIFs for UI changes
- Test instructions
- Update documentation if needed

---

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/tdoukinitsas/liveplay/issues)
- **Discussions**: [GitHub Discussions](https://github.com/tdoukinitsas/liveplay/discussions)
- **Developer**: [@tdoukinitsas](https://github.com/tdoukinitsas)

---

**Happy coding! 🎵💻**
