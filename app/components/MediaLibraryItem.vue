<template>
  <div class="media-library-item" :class="{ selected, live: isLive }" @click="$emit('select')" @contextmenu.prevent="$emit('contextmenu', $event)">
    <div class="thumbnail">
      <img v-if="item.mediaType === 'image' && thumbnailSrc" :src="thumbnailSrc" :alt="item.displayName" />
      <div v-else class="pdf-icon">
        <span class="material-symbols-rounded">picture_as_pdf</span>
      </div>
      <button class="push-btn" @click.stop="$emit('push')" title="Push to player">
        <span class="material-symbols-rounded">send</span>
      </button>
    </div>
    <div class="item-name" :title="item.displayName">{{ item.displayName }}</div>
  </div>
</template>

<script setup lang="ts">
import type { VisualMediaItem } from '~/types/project';

const props = defineProps<{
  item: VisualMediaItem;
  selected?: boolean;
  isLive?: boolean;
}>();

defineEmits<{
  select: [];
  contextmenu: [event: MouseEvent];
  push: [];
}>();

const { currentProject } = useProject();

const thumbnailSrc = ref<string | null>(null);

const loadThumbnail = async () => {
  if (props.item.mediaType !== 'image' || !currentProject.value || !import.meta.client || !window.electronAPI) return;
  try {
    const result = await (window.electronAPI as any).readVisualMedia(
      currentProject.value.folderPath,
      props.item.mediaPath
    );
    if (result.success && result.data) {
      thumbnailSrc.value = `data:${result.mimeType};base64,${result.data}`;
    }
  } catch (e) {
    console.warn('Failed to load thumbnail for', props.item.displayName, e);
  }
};

onMounted(loadThumbnail);
watch(() => props.item.mediaPath, loadThumbnail);
</script>

<style scoped lang="scss">
.media-library-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-surface-hover);

    .push-btn {
      opacity: 1;
    }
  }

  &.selected {
    background-color: rgba(218, 30, 40, 0.15);
    outline: 2px solid var(--color-accent);
    border-radius: 4px;
  }

  &.live {
    .thumbnail {
      border-color: #4caf50;
      box-shadow: 0 0 6px rgba(76, 175, 80, 0.4);
    }
  }
}

.thumbnail {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.push-btn {
  position: absolute;
  bottom: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background-color: var(--color-accent);
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--transition-fast), transform var(--transition-fast);

  .material-symbols-rounded {
    font-size: 14px;
  }

  &:hover {
    transform: scale(1.1);
  }
}

.pdf-icon {
  .material-symbols-rounded {
    font-size: 40px;
    color: var(--color-text-secondary);
  }
}

.item-name {
  margin-top: 4px;
  font-size: 11px;
  text-align: center;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-primary);
}
</style>
