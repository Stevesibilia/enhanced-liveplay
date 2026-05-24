<template>
  <div
    class="media-library-panel"
    @dragover.prevent="onDragOver"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
    :class="{ 'drag-active': isDragging }"
  >
    <!-- Folder Sidebar -->
    <div class="folder-sidebar" :class="{ collapsed: folderSidebarCollapsed }">
      <div class="sidebar-header">
        <span v-if="!folderSidebarCollapsed" class="sidebar-title">Folders</span>
        <button class="icon-btn" @click="folderSidebarCollapsed = !folderSidebarCollapsed" :title="folderSidebarCollapsed ? 'Show folders' : 'Hide folders'">
          <span class="material-symbols-rounded">{{ folderSidebarCollapsed ? 'chevron_right' : 'chevron_left' }}</span>
        </button>
        <button v-if="!folderSidebarCollapsed" class="icon-btn" @click="showNewFolderDialog" title="New Folder">
          <span class="material-symbols-rounded">create_new_folder</span>
        </button>
      </div>
      <ul v-if="!folderSidebarCollapsed" class="folder-list">
        <li
          class="folder-item"
          :class="{ active: selectedFolder === null }"
          @click="selectedFolder = null"
        >
          <span class="material-symbols-rounded">folder_open</span>
          <span>All</span>
        </li>
        <li
          class="folder-item"
          :class="{ active: selectedFolder === '__unfiled__' }"
          @click="selectedFolder = '__unfiled__'"
        >
          <span class="material-symbols-rounded">folder_off</span>
          <span>Unfiled</span>
        </li>
        <li
          v-for="folder in folders"
          :key="folder"
          class="folder-item"
          :class="{ active: selectedFolder === folder }"
          @click="selectedFolder = folder"
          @dblclick="startRenameFolder(folder)"
        >
          <span class="material-symbols-rounded">folder</span>
          <span v-if="renamingFolder !== folder" class="folder-name">{{ folder }}</span>
          <input
            v-else
            ref="folderRenameInput"
            class="rename-input"
            :value="folder"
            @keydown.enter="confirmRenameFolder($event, folder)"
            @keydown.escape="renamingFolder = null"
            @blur="confirmRenameFolder($event, folder)"
          />
          <button
            v-if="renamingFolder !== folder"
            class="folder-delete-btn"
            title="Delete folder"
            @click.stop="confirmDeleteFolderFromButton(folder)"
          >
            <span class="material-symbols-rounded">delete</span>
          </button>
        </li>
      </ul>
    </div>

    <!-- Grid Area -->
    <div class="grid-area">
      <div class="grid-header">
        <button class="action-btn" @click="handleImportClick">
          <span class="material-symbols-rounded">upload_file</span>
          <span>Import</span>
        </button>
        <span class="item-count">{{ filteredItems.length }} items</span>
      </div>

      <div v-if="filteredItems.length === 0" class="empty-state">
        <span class="material-symbols-rounded">image</span>
        <p>No media items</p>
        <p class="hint">Drag files here or click Import</p>
      </div>

      <div v-else class="thumbnail-grid">
        <MediaLibraryItem
          v-for="item in filteredItems"
          :key="item.uuid"
          :item="item"
          :selected="selectedItemId === item.uuid"
          @select="selectItem(item)"
          @push="pushItem(item)"
          @properties="openItemProperties(item)"
          @delete="confirmDeleteItemFromButton(item)"
        />
      </div>

      <!-- Import progress -->
      <div v-if="importProgress.active" class="import-progress">
        <span>Importing {{ importProgress.current }}/{{ importProgress.total }}...</span>
      </div>
    </div>

    <!-- Delete Confirmation Dialog -->
    <Teleport to="body">
      <div v-if="deleteDialog.visible" class="dialog-overlay" @click.self="deleteDialog.visible = false">
        <div class="dialog">
          <h3>Delete {{ deleteDialog.type === 'folder' ? 'Folder' : 'Item' }}</h3>
          <p v-if="deleteDialog.type === 'folder'">
            Delete folder "{{ deleteDialog.name }}"? Items in this folder will become unfiled.
          </p>
          <p v-else>
            Delete "{{ deleteDialog.name }}"? This will remove it from the project and disk.
          </p>
          <div class="dialog-actions">
            <button class="btn-cancel" @click="deleteDialog.visible = false">Cancel</button>
            <button class="btn-confirm danger" @click="executeDelete">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- New Folder Dialog -->
    <Teleport to="body">
      <div v-if="newFolderDialog.visible" class="dialog-overlay" @click.self="newFolderDialog.visible = false">
        <div class="dialog">
          <h3>New Folder</h3>
          <input
            ref="newFolderInput"
            v-model="newFolderDialog.value"
            class="dialog-input"
            placeholder="Folder name"
            @keydown.enter="confirmNewFolder"
            @keydown.escape="newFolderDialog.visible = false"
          />
          <div class="dialog-actions">
            <button class="btn-cancel" @click="newFolderDialog.visible = false">Cancel</button>
            <button class="btn-confirm" @click="confirmNewFolder">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import type { VisualMediaItem } from '~/types/project';
import { getVisualMediaType } from '~/types/project';

const { currentProject } = useProject();
const { addVisualMedia, removeVisualMedia, updateVisualMedia, addVisualFolder, removeVisualFolder } = useVisualMedia();
const { selectItem: visualDisplaySelect, addLayer, selectLayer, openProperties } = useVisualDisplay();

// --- State ---
const selectedFolder = ref<string | null>(null);
const selectedItemId = ref<string | null>(null);
const isDragging = ref(false);
const renamingFolder = ref<string | null>(null);
const folderSidebarCollapsed = ref(false);

const importProgress = reactive({ active: false, current: 0, total: 0 });

// Active targets for the dialog flows (button-driven now)
const targetItem = ref<VisualMediaItem | null>(null);
const targetFolder = ref<string | null>(null);

const deleteDialog = reactive({ visible: false, type: '' as 'item' | 'folder', name: '' });
const newFolderDialog = reactive({ visible: false, value: '' });

const newFolderInput = ref<HTMLInputElement | null>(null);

// --- Computed ---
const folders = computed(() => currentProject.value?.visualFolders || []);

const allItems = computed(() => currentProject.value?.visualMedia || []);

const filteredItems = computed(() => {
  if (selectedFolder.value === null) return allItems.value;
  if (selectedFolder.value === '__unfiled__') return allItems.value.filter(i => !i.folder);
  return allItems.value.filter(i => i.folder === selectedFolder.value);
});

// --- Selection ---
const emit = defineEmits<{
  'item-selected': [item: VisualMediaItem];
}>();

const selectItem = (item: VisualMediaItem) => {
  selectedItemId.value = item.uuid;
  visualDisplaySelect(item);
  emit('item-selected', item);
};

// Push from the media library = add as a new draft layer in the composition.
// It does NOT appear on the player until the GM publishes it.
// PDF support is deferred — addLayer returns null for non-image media.
const pushItem = (item: VisualMediaItem) => {
  const layer = addLayer(item);
  if (layer) selectLayer(layer.id);
};

// --- Drag and Drop ---
const onDragOver = () => { isDragging.value = true; };
const onDragLeave = () => { isDragging.value = false; };

const onDrop = async (e: DragEvent) => {
  isDragging.value = false;
  if (!e.dataTransfer?.files?.length || !currentProject.value) return;
  const files = Array.from(e.dataTransfer.files);
  const paths = files.map(f => (f as any).path).filter(Boolean);
  if (paths.length > 0) {
    await importFiles(paths);
  }
};

// --- Import ---
const handleImportClick = async () => {
  if (!import.meta.client || !window.electronAPI || !currentProject.value) return;
  const filePaths = await window.electronAPI.selectVisualMediaFiles();
  if (filePaths && filePaths.length > 0) {
    await importFiles(filePaths);
  }
};

const importFiles = async (filePaths: string[]) => {
  if (!currentProject.value || !import.meta.client || !window.electronAPI) return;

  const validPaths = filePaths.filter(p => getVisualMediaType(p) !== null);
  if (!validPaths.length) return;

  importProgress.active = true;
  importProgress.total = validPaths.length;
  importProgress.current = 0;

  for (const filePath of validPaths) {
    importProgress.current++;
    const uuid = crypto.randomUUID();
    const mediaType = getVisualMediaType(filePath)!;
    const fileName = filePath.split(/[/\\]/).pop() || 'unnamed';
    const displayName = fileName.replace(/\.[^.]+$/, '');

    try {
      const result = await (window.electronAPI as any).importVisualMedia(
        currentProject.value.folderPath,
        filePath,
        uuid
      );
      if (result.success) {
        addVisualMedia({
          uuid,
          displayName,
          mediaFileName: result.mediaFileName!,
          mediaPath: result.mediaPath!,
          mediaType,
          folder: selectedFolder.value && selectedFolder.value !== '__unfiled__' ? selectedFolder.value : undefined,
        });
      }
    } catch (e) {
      console.error('Failed to import:', filePath, e);
    }
  }

  importProgress.active = false;
};

// --- Item Operations (button-driven) ---

// Cog button → open the Visual Properties pane for this item
const openItemProperties = (item: VisualMediaItem) => {
  selectItem(item);
  openProperties(item);
};

// Trash button → confirm-then-delete flow
const confirmDeleteItemFromButton = (item: VisualMediaItem) => {
  targetItem.value = item;
  deleteDialog.type = 'item';
  deleteDialog.name = item.displayName;
  deleteDialog.visible = true;
};


// --- Folder Operations ---
const showNewFolderDialog = () => {
  newFolderDialog.value = '';
  newFolderDialog.visible = true;
  nextTick(() => newFolderInput.value?.focus());
};

const confirmNewFolder = () => {
  const name = newFolderDialog.value.trim();
  if (!name) return;
  addVisualFolder(name);
  newFolderDialog.visible = false;
};

const startRenameFolder = (folder: string) => {
  renamingFolder.value = folder;
};

const confirmRenameFolder = (event: Event, oldName: string) => {
  const input = event.target as HTMLInputElement;
  const newName = input.value.trim();
  if (newName && newName !== oldName) {
    // Rename: add new, move items, remove old
    addVisualFolder(newName);
    for (const item of allItems.value) {
      if (item.folder === oldName) {
        updateVisualMedia(item.uuid, { folder: newName });
      }
    }
    removeVisualFolder(oldName);
  }
  renamingFolder.value = null;
};

const confirmDeleteFolderFromButton = (folder: string) => {
  targetFolder.value = folder;
  deleteDialog.type = 'folder';
  deleteDialog.name = folder;
  deleteDialog.visible = true;
};

// --- Delete Execution ---
const executeDelete = async () => {
  if (deleteDialog.type === 'item' && targetItem.value) {
    const item = targetItem.value;
    await removeVisualMedia(item.uuid, true);
    if (selectedItemId.value === item.uuid) {
      selectedItemId.value = null;
    }
    targetItem.value = null;
  } else if (deleteDialog.type === 'folder' && targetFolder.value) {
    const folder = targetFolder.value;
    removeVisualFolder(folder);
    if (selectedFolder.value === folder) {
      selectedFolder.value = null;
    }
    targetFolder.value = null;
  }
  deleteDialog.visible = false;
};
</script>

<style scoped lang="scss">
.media-library-panel {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-background);
  color: var(--color-text-primary);

  &.drag-active {
    outline: 2px dashed var(--color-accent);
    outline-offset: -4px;
    background-color: rgba(218, 30, 40, 0.05);
  }
}

.folder-sidebar {
  width: 180px;
  min-width: 140px;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  background-color: var(--color-surface);
  transition: width 0.2s ease, min-width 0.2s ease;

  &.collapsed {
    width: 36px;
    min-width: 36px;
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.icon-btn {
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  display: flex;

  .material-symbols-rounded { font-size: 18px; }

  &:hover {
    color: var(--color-text-primary);
    background-color: var(--color-surface-hover);
  }
}

.folder-list {
  list-style: none;
  padding: 4px;
  margin: 0;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: var(--color-text-primary);

  .material-symbols-rounded { font-size: 16px; color: var(--color-text-secondary); }

  .folder-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .folder-delete-btn {
    display: none;
    border: none;
    background: transparent;
    padding: 2px;
    border-radius: 3px;
    cursor: pointer;
    color: var(--color-text-secondary);

    &:hover {
      color: var(--color-danger, #e53935);
      background: rgba(0, 0, 0, 0.15);
    }

    .material-symbols-rounded { font-size: 14px; color: inherit; }
  }

  &:hover {
    background-color: var(--color-surface-hover);

    .folder-delete-btn { display: flex; }
  }

  &.active {
    background-color: rgba(218, 30, 40, 0.15);
    color: var(--color-accent);
    .material-symbols-rounded { color: var(--color-accent); }
  }
}

.rename-input {
  flex: 1;
  background: var(--color-background);
  border: 1px solid var(--color-accent);
  border-radius: 2px;
  color: var(--color-text-primary);
  font-size: 12px;
  padding: 1px 4px;
  outline: none;
}

.grid-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--color-background);
}

.grid-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-primary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;

  .material-symbols-rounded { font-size: 16px; }

  &:hover { background-color: var(--color-surface-hover); }
}

.item-count {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);

  .material-symbols-rounded { font-size: 48px; margin-bottom: 8px; }
  p { margin: 2px 0; font-size: 13px; }
  .hint { font-size: 11px; }
}

.thumbnail-grid {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  align-content: start;
}

.import-progress {
  padding: 8px 12px;
  background-color: var(--color-surface);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-text-secondary);
}

// Dialog styles
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  min-width: 300px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);

  h3 { margin: 0 0 12px; font-size: 14px; color: var(--color-text-primary); }
  p { margin: 0 0 16px; font-size: 13px; color: var(--color-text-secondary); }
}

.dialog-input {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 13px;
  margin-bottom: 16px;
  outline: none;

  &:focus { border-color: var(--color-accent); }
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel, .btn-confirm {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--color-border);
}

.btn-cancel {
  background: transparent;
  color: var(--color-text-primary);
  &:hover { background: var(--color-surface-hover); }
}

.btn-confirm {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
  &:hover { opacity: 0.9; }
  &.danger {
    background: var(--color-danger);
    border-color: var(--color-danger);
  }
}
</style>
