<template>
  <div class="main-workspace">
    <ProjectHeader />
    <PlaybackControls />

    <div class="workspace-tabs">
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'audio' }"
        @click="activeTab = 'audio'"
      >
        <span class="material-symbols-rounded">library_music</span>
        <span>Audio</span>
      </button>
      <button
        class="tab-btn"
        :class="{ active: activeTab === 'media' }"
        @click="activeTab = 'media'"
      >
        <span class="material-symbols-rounded">image</span>
        <span>Media</span>
      </button>
    </div>
    
    <div class="workspace-content">
      <template v-if="activeTab === 'audio'">
        <div v-if="!cartFullscreen" class="playlist-section" :style="{ width: cartClosed ? '100%' : `calc(100% - ${cartWidth}px)` }">
          <PlaylistView />
        </div>
        
        <div 
          class="resize-handle"
          :class="{ 'collapsed-left': cartFullscreen, 'collapsed-right': cartClosed }"
          @mousedown="startResize"
        ></div>
        
        <div v-if="!cartClosed" class="cart-section" :style="{ width: cartFullscreen ? '100%' : `${cartWidth}px` }">
          <CartPlayer />
        </div>
      </template>

      <template v-if="activeTab === 'media'">
        <MediaLibraryPanel />
      </template>
    </div>
    
    <PropertiesPanel v-if="selectedItem" />
    
    <ProgressModal
      :visible="progressModal.visible"
      :title="progressModal.title"
      :message="progressModal.message"
      :percentage="progressModal.percentage"
    />
  </div>
</template>

<script setup lang="ts">
const { selectedItem } = useProject();
const { cartWidth, cartClosed, cartFullscreen, startResize } = useResizablePanel();
const { progressModal, registerListeners, handleKeydown } = useWorkspaceListeners();

const activeTab = ref<'audio' | 'media'>('audio');

// Register IPC listeners and keyboard shortcut
registerListeners();

onMounted(() => {
  if (import.meta.client) {
    window.addEventListener('keydown', handleKeydown);
  }
});

onUnmounted(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', handleKeydown);
  }
});
</script>

<style scoped lang="scss">
.main-workspace {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-tabs {
  display: flex;
  gap: 0;
  padding: 0 8px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  font-size: 12px;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);

  .material-symbols-rounded {
    font-size: 16px;
  }

  &:hover {
    color: var(--color-text-primary);
    background-color: var(--color-surface-hover);
  }

  &.active {
    color: var(--color-accent);
    border-bottom-color: var(--color-accent);
  }
}

.workspace-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.playlist-section {
  min-width: 30%;
  overflow: hidden;
}

.resize-handle {
  width: 5px;
  background-color: var(--color-border);
  cursor: col-resize;
  transition: background-color var(--transition-fast);
  position: relative;
  z-index: 10;
  
  &:hover {
    background-color: var(--color-accent);
  }
  
  &:active {
    background-color: var(--color-accent);
  }
  
  &.collapsed-left {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    background-color: transparent;
    
    &::after {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: var(--color-border);
      opacity: 0.5;
    }
    
    &:hover::after {
      width: 4px;
      background-color: var(--color-accent);
      opacity: 1;
    }
  }
  
  &.collapsed-right {
    position: absolute;
    right: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    background-color: transparent;
    
    &::after {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background-color: var(--color-border);
      opacity: 0.5;
    }
    
    &:hover::after {
      width: 4px;
      background-color: var(--color-accent);
      opacity: 1;
    }
  }
}

.cart-section {
  overflow: hidden;
}
</style>
