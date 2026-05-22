<template>
  <div class="live-display-panel">
    <div class="live-header">
      <span class="live-label">Live</span>
      <span class="live-dot" :class="{ active: liveItem && !isLiveBlack }"></span>
      <button class="black-btn" @click="handleBlack">
        <span class="material-symbols-rounded">block</span>
        Black
      </button>
    </div>
    <div class="live-display">
      <div v-if="!liveItem || isLiveBlack" class="live-black">
        <span class="no-display-label">No Display</span>
      </div>
      <img
        v-else-if="liveItem.mediaType === 'image' && liveImageSrc"
        :src="liveImageSrc"
        class="live-image"
        :alt="liveItem.displayName"
      />
      <canvas
        v-else-if="liveItem.mediaType === 'pdf'"
        ref="liveCanvasRef"
        class="live-pdf"
      ></canvas>
      <div v-else class="live-black">
        <span class="no-display-label">Loading...</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DisplayState } from '~/types/ipc';

const { currentProject } = useProject();
const { liveItem } = useVisualDisplay();

const liveImageSrc = ref<string | null>(null);
const liveCanvasRef = ref<HTMLCanvasElement | null>(null);
const isLiveBlack = ref(true);

// Load image via IPC
const loadImage = async (item: any): Promise<string | null> => {
  if (!currentProject.value || !window.electronAPI) return null;
  try {
    const result = await (window.electronAPI as any).readVisualMedia(
      currentProject.value.folderPath,
      item.mediaPath
    );
    if (result.success && result.data) {
      return `data:${result.mimeType};base64,${result.data}`;
    }
  } catch (e) {
    console.warn('Failed to load image:', e);
  }
  return null;
};

// Watch live item changes
watch(liveItem, async (newItem) => {
  if (!newItem) {
    liveImageSrc.value = null;
    isLiveBlack.value = true;
    return;
  }
  isLiveBlack.value = false;
  if (newItem.mediaType === 'image') {
    liveImageSrc.value = await loadImage(newItem);
  }
}, { immediate: true });

const handleBlack = async () => {
  isLiveBlack.value = true;
  const displayState: DisplayState = { type: 'black' };
  if (window.electronAPI) {
    await window.electronAPI.pushToPlayer(displayState);
  }
};
</script>

<style scoped lang="scss">
.live-display-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  overflow: hidden;
}

.live-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.live-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--color-text-secondary);
  letter-spacing: 0.5px;
}

.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-text-secondary);

  &.active {
    background-color: #4caf50;
  }
}

.black-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 4px;
  background-color: var(--color-surface-hover, #333);
  color: var(--color-text-primary);
  font-size: 11px;
  cursor: pointer;
  transition: background-color var(--transition-fast);

  .material-symbols-rounded {
    font-size: 14px;
  }

  &:hover {
    background-color: var(--color-border);
  }
}

.live-display {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
  margin: 8px;
  border-radius: 4px;
  overflow: hidden;
}

.live-black {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.no-display-label {
  font-size: 12px;
  color: #555;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.live-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.live-pdf {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
