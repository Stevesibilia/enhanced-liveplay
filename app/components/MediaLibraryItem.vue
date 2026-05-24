<template>
  <div
    class="media-library-item"
    :class="{ selected }"
    draggable="true"
    @click="$emit('select')"
    @dragstart="onDragStart"
  >
    <div class="thumbnail">
      <img v-if="item.mediaType === 'image' && thumbnailSrc" :src="thumbnailSrc" :alt="item.displayName" />
      <div v-else class="pdf-icon">
        <span class="material-symbols-rounded">picture_as_pdf</span>
      </div>

      <div v-if="item.linkedCueUuid" class="link-badge" title="Linked to an audio cue">
        <span class="material-symbols-rounded">music_note</span>
      </div>

      <div class="action-row">
        <button class="thumb-btn" @click.stop="$emit('properties')" title="Properties">
          <span class="material-symbols-rounded">settings</span>
        </button>
        <button class="thumb-btn push" @click.stop="$emit('push')" title="Add to composition">
          <span class="material-symbols-rounded">add</span>
        </button>
        <button class="thumb-btn danger" @click.stop="$emit('delete')" title="Delete">
          <span class="material-symbols-rounded">delete</span>
        </button>
      </div>
    </div>
    <div class="item-name" :title="item.displayName">{{ item.displayName }}</div>
  </div>
</template>

<script setup lang="ts">
import type { VisualMediaItem } from '~/types/project';

const props = defineProps<{
  item: VisualMediaItem;
  selected?: boolean;
}>();

defineEmits<{
  select: [];
  push: [];
  properties: [];
  delete: [];
}>();

const onDragStart = (e: DragEvent) => {
  if (!e.dataTransfer) return;
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('application/x-visual-media-uuid', props.item.uuid);
};

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

    .action-row {
      opacity: 1;
    }
  }

  &.selected {
    background-color: rgba(218, 30, 40, 0.15);
    outline: 2px solid var(--color-accent);
    border-radius: 4px;
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

.action-row {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  display: flex;
  justify-content: space-between;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;

  .thumb-btn {
    pointer-events: auto;
  }
}

.thumb-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  cursor: pointer;
  transition: background-color var(--transition-fast), transform var(--transition-fast);

  .material-symbols-rounded {
    font-size: 14px;
  }

  &:hover {
    background-color: rgba(0, 0, 0, 0.85);
    transform: scale(1.08);
  }

  &.push {
    background-color: var(--color-accent);

    &:hover {
      background-color: var(--color-accent-hover, var(--color-accent));
    }
  }

  &.danger:hover {
    background-color: var(--color-danger, #e53935);
  }
}

.link-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  color: #fff;
  pointer-events: none;

  .material-symbols-rounded {
    font-size: 12px;
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
