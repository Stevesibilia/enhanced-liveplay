<template>
  <Teleport to="body">
    <div class="cue-picker-overlay" @click.self="onCancel">
      <div class="cue-picker">
        <div class="picker-header">
          <h3>Select Audio Cue</h3>
          <button class="icon-btn" @click="onCancel" title="Close">
            <span class="material-symbols-rounded">close</span>
          </button>
        </div>

        <div class="picker-search">
          <span class="material-symbols-rounded search-icon">search</span>
          <input
            ref="searchInput"
            v-model="search"
            class="search-input"
            placeholder="Filter by name…"
            @keydown.escape="onCancel"
          />
        </div>

        <ul v-if="filtered.length" class="picker-list">
          <li
            v-for="cue in filtered"
            :key="cue.uuid"
            class="picker-item"
            :class="{ current: cue.uuid === currentUuid }"
            @click="onSelect(cue.uuid)"
          >
            <span
              class="color-dot"
              :style="{ backgroundColor: cue.color }"
            ></span>
            <span class="cue-name">{{ cue.displayName }}</span>
            <span v-if="cue.uuid === currentUuid" class="current-tag">current</span>
          </li>
        </ul>
        <div v-else class="picker-empty">No audio cues match.</div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type { AudioItem, GroupItem } from '~/types/project';

const props = defineProps<{
  currentUuid?: string | null;
}>();

const emit = defineEmits<{
  select: [uuid: string];
  cancel: [];
}>();

const { currentProject } = useProject();
const search = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const flattenAudio = (items: (AudioItem | GroupItem)[] | undefined): AudioItem[] => {
  if (!items) return [];
  const result: AudioItem[] = [];
  for (const item of items) {
    if (item.type === 'audio') result.push(item);
    else if (item.type === 'group') result.push(...flattenAudio(item.children));
  }
  return result;
};

const allCues = computed<AudioItem[]>(() => {
  const project = currentProject.value;
  if (!project) return [];
  const playlist = flattenAudio(project.items);
  const cartOnly = project.cartOnlyItems ?? [];
  return [...playlist, ...cartOnly];
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return allCues.value;
  return allCues.value.filter((c) => c.displayName.toLowerCase().includes(q));
});

const onSelect = (uuid: string) => emit('select', uuid);
const onCancel = () => emit('cancel');

onMounted(() => {
  nextTick(() => searchInput.value?.focus());
});
</script>

<style scoped lang="scss">
.cue-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 10001;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cue-picker {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 420px;
  max-width: 90vw;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);

  h3 {
    margin: 0;
    font-size: 14px;
    color: var(--color-text-primary);
  }
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

.picker-search {
  position: relative;
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);

  .search-icon {
    position: absolute;
    left: 22px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 16px;
    color: var(--color-text-secondary);
    pointer-events: none;
  }
}

.search-input {
  width: 100%;
  padding: 6px 10px 6px 30px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 13px;
  outline: none;

  &:focus { border-color: var(--color-accent); }
}

.picker-list {
  list-style: none;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  flex: 1;
}

.picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: var(--color-text-primary);

  &:hover { background-color: var(--color-surface-hover); }

  &.current {
    background-color: rgba(218, 30, 40, 0.12);
    color: var(--color-accent);
  }
}

.color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.cue-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-tag {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-text-secondary);
}

.picker-empty {
  padding: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
}
</style>
