<template>
  <div v-if="item" class="visual-properties-pane">
    <div class="pane-header">
      <h3>Properties: {{ item.displayName }}</h3>
      <button class="close-btn" @click="onClose" title="Close">
        <span class="material-symbols-rounded">close</span>
      </button>
    </div>

    <div class="pane-content">
      <!-- Display Name -->
      <div class="property-field">
        <label>Display Name</label>
        <input
          type="text"
          :value="localName"
          @input="localName = ($event.target as HTMLInputElement).value"
          @blur="commitName"
          @keydown.enter="commitName"
        />
      </div>

      <!-- Linked Cue -->
      <div class="property-field">
        <label>Linked Audio Cue</label>
        <div class="cue-row">
          <div class="cue-display" :class="{ missing: linkedCueMissing }">
            <span class="material-symbols-rounded">music_note</span>
            <span class="cue-name">{{ linkedCueLabel }}</span>
          </div>
          <button class="btn" @click="showPicker = true">
            {{ item.linkedCueUuid ? 'Change' : 'Link' }}
          </button>
          <button
            v-if="item.linkedCueUuid"
            class="btn danger"
            @click="clearLink"
          >
            Clear
          </button>
        </div>
      </div>

      <!-- Link Delay -->
      <div class="property-field">
        <label>
          Link Delay: <span class="value-tag">{{ linkDelayValue.toFixed(2) }}s</span>
        </label>
        <div class="range-row">
          <input
            type="range"
            min="-30"
            max="30"
            step="0.1"
            :value="linkDelayValue"
            @input="onDelayInput($event)"
          />
          <input
            type="number"
            min="-30"
            max="30"
            step="0.1"
            :value="linkDelayValue"
            @change="onDelayInput($event)"
            class="num-input"
          />
        </div>
        <p class="hint">+: audio first, −: visual first, 0: simultaneous</p>
      </div>

      <!-- Fade In -->
      <div class="property-field">
        <label>
          Fade In: <span class="value-tag">{{ fadeInValue.toFixed(2) }}s</span>
        </label>
        <div class="range-row">
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            :value="fadeInValue"
            @input="onFadeInInput($event)"
          />
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            :value="fadeInValue"
            @change="onFadeInInput($event)"
            class="num-input"
          />
        </div>
      </div>

      <!-- Fade Out -->
      <div class="property-field">
        <label>
          Fade Out: <span class="value-tag">{{ fadeOutValue.toFixed(2) }}s</span>
        </label>
        <div class="range-row">
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            :value="fadeOutValue"
            @input="onFadeOutInput($event)"
          />
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            :value="fadeOutValue"
            @change="onFadeOutInput($event)"
            class="num-input"
          />
        </div>
      </div>
    </div>

    <CuePicker
      v-if="showPicker"
      :current-uuid="item.linkedCueUuid ?? null"
      @select="onPickCue"
      @cancel="showPicker = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { VisualMediaItem } from '~/types/project';

const props = defineProps<{
  item: VisualMediaItem | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { updateVisualMedia } = useVisualMedia();
const { findItemByUuid } = useProject();

const showPicker = ref(false);
const localName = ref('');

watch(
  () => props.item?.uuid,
  () => {
    localName.value = props.item?.displayName ?? '';
  },
  { immediate: true }
);

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

const linkDelayValue = computed(() => props.item?.linkDelay ?? 0);
const fadeInValue = computed(() => props.item?.fadeIn ?? 0);
const fadeOutValue = computed(() => props.item?.fadeOut ?? 0);

const linkedCueRef = computed(() => {
  if (!props.item?.linkedCueUuid) return null;
  return findItemByUuid(props.item.linkedCueUuid);
});

const linkedCueMissing = computed(
  () => !!props.item?.linkedCueUuid && !linkedCueRef.value
);

const linkedCueLabel = computed(() => {
  if (!props.item?.linkedCueUuid) return 'None';
  if (!linkedCueRef.value) return 'None (was deleted)';
  return linkedCueRef.value.displayName;
});

const commitName = () => {
  if (!props.item) return;
  const trimmed = localName.value.trim();
  if (trimmed && trimmed !== props.item.displayName) {
    updateVisualMedia(props.item.uuid, { displayName: trimmed });
  } else {
    localName.value = props.item.displayName;
  }
};

const clearLink = () => {
  if (!props.item) return;
  updateVisualMedia(props.item.uuid, { linkedCueUuid: undefined });
};

const onPickCue = (uuid: string) => {
  if (!props.item) return;
  updateVisualMedia(props.item.uuid, { linkedCueUuid: uuid });
  showPicker.value = false;
};

const onDelayInput = (e: Event) => {
  if (!props.item) return;
  const v = clamp(parseFloat((e.target as HTMLInputElement).value) || 0, -30, 30);
  updateVisualMedia(props.item.uuid, { linkDelay: v });
};

const onFadeInInput = (e: Event) => {
  if (!props.item) return;
  const v = clamp(parseFloat((e.target as HTMLInputElement).value) || 0, 0, 10);
  updateVisualMedia(props.item.uuid, { fadeIn: v });
};

const onFadeOutInput = (e: Event) => {
  if (!props.item) return;
  const v = clamp(parseFloat((e.target as HTMLInputElement).value) || 0, 0, 10);
  updateVisualMedia(props.item.uuid, { fadeOut: v });
};

const onClose = () => emit('close');
</script>

<style scoped lang="scss">
.visual-properties-pane {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  width: 320px;
  height: 100%;
  overflow: hidden;
}

.pane-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--color-border);

  h3 {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 220px;
  }
}

.close-btn {
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

.pane-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.property-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  input[type="text"],
  input[type="number"] {
    padding: 6px 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-background);
    color: var(--color-text-primary);
    font-size: 13px;
    outline: none;

    &:focus { border-color: var(--color-accent); }
  }
}

.value-tag {
  font-size: 11px;
  color: var(--color-text-primary);
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0;
}

.cue-row {
  display: flex;
  gap: 6px;
  align-items: stretch;
}

.cue-display {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-background);
  color: var(--color-text-primary);
  font-size: 13px;
  overflow: hidden;

  .material-symbols-rounded {
    font-size: 16px;
    color: var(--color-text-secondary);
  }

  .cue-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.missing {
    color: var(--color-danger, #e57373);
    .material-symbols-rounded { color: var(--color-danger, #e57373); }
  }
}

.btn {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text-primary);
  font-size: 12px;
  cursor: pointer;

  &:hover { background: var(--color-surface-hover); }

  &.danger {
    color: var(--color-danger, #e57373);

    &:hover {
      background: rgba(229, 115, 115, 0.12);
    }
  }
}

.range-row {
  display: flex;
  align-items: center;
  gap: 8px;

  input[type="range"] {
    flex: 1;
    accent-color: var(--color-accent);
  }

  .num-input {
    width: 64px;
    padding: 4px 6px;
    font-size: 12px;
    text-align: right;
  }
}

.hint {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin: 0;
}
</style>
