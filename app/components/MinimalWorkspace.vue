<template>
  <div class="minimal-workspace">
    <!-- Active Cues -->
    <div class="minimal-cues">
      <div v-if="activeCues.size === 0" class="no-cues">No active cues</div>
      <div v-else class="cue-list">
        <div v-for="[uuid, cue] in Array.from(activeCues.entries())" :key="uuid" class="mini-cue">
          <span class="cue-name">{{ cue.displayName }}</span>
          <span class="cue-time">{{ formatTime(cue.currentTime) }} / {{ formatTime(cue.duration) }}</span>
          <div class="cue-actions">
            <button v-if="!cue.isPaused" class="mini-btn" @click="pauseCue(uuid)" title="Pause">
              <span class="material-symbols-rounded">pause</span>
            </button>
            <button v-else class="mini-btn" @click="resumeCue(uuid)" title="Resume">
              <span class="material-symbols-rounded">play_arrow</span>
            </button>
            <button class="mini-btn stop" @click="stopCue(uuid)" title="Stop">
              <span class="material-symbols-rounded">stop</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Compact Cart Grid -->
    <div class="minimal-cart">
      <div
        v-for="slot in 16"
        :key="slot"
        class="mini-slot"
        :class="{ empty: !getCartItem(slot - 1) }"
        @click="triggerSlot(slot - 1)"
      >
        <span class="slot-hotkey">{{ getKeyLabel(slot - 1) }}</span>
        <span class="slot-name" :class="{ marquee: isOverflowing(slot - 1) }">
          <span class="slot-name-inner">{{ getSlotName(slot - 1) }}</span>
        </span>
      </div>
    </div>

    <!-- Master Volume + Expand -->
    <div class="minimal-footer">
      <span class="master-label">OUT</span>
      <input
        type="range"
        class="master-slider"
        :min="-60"
        :max="0"
        step="0.5"
        :value="masterGainDb"
        @input="handleVolumeChange"
      />
      <span class="master-db">{{ masterGainDb <= -60 ? '-∞' : masterGainDb.toFixed(0) }} dB</span>
      <button class="expand-btn" @click="$emit('exit-minimal')" title="Exit minimal mode">
        <span class="material-symbols-rounded">open_in_full</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatKeyLabel } from '~/composables/useCartHotkeys';

const emit = defineEmits<{ 'exit-minimal': [] }>();

const { currentProject } = useProject();
const { activeCues, pauseCue, resumeCue, stopCue, masterGainDb, setMasterGain } = useAudioEngine();
const { getCartItem } = useCartItems();
const { keyMappings, triggerSlot } = useCartHotkeys();

const getKeyLabel = (slotIndex: number): string => {
  const binding = keyMappings.value[slotIndex];
  return binding ? formatKeyLabel(binding) : '';
};

const getSlotName = (slotIndex: number): string => {
  const item = getCartItem(slotIndex);
  return item ? item.displayName : '';
};

const isOverflowing = (_slotIndex: number): boolean => {
  // Approximation: names longer than 8 chars will likely overflow in the compact grid
  const name = getSlotName(_slotIndex);
  return name.length > 8;
};

const handleVolumeChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  setMasterGain(parseFloat(target.value));
};

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
</script>

<style scoped>
.minimal-workspace {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  overflow: hidden;
  font-size: 12px;
}

/* Active Cues */
.minimal-cues {
  flex: 0 1 auto;
  max-height: 40%;
  overflow-y: auto;
  border-bottom: 1px solid var(--color-border);
  padding: 6px;
}

.no-cues {
  color: var(--color-text-secondary);
  text-align: center;
  padding: 8px;
  font-style: italic;
}

.mini-cue {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  background: var(--color-surface);
  margin-bottom: 4px;
}

.mini-cue:last-child {
  margin-bottom: 0;
}

.mini-cue .cue-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  color: var(--color-text-primary);
}

.mini-cue .cue-time {
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.cue-actions {
  display: flex;
  gap: 2px;
}

.mini-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  display: flex;
  align-items: center;
}

.mini-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.mini-btn.stop:hover {
  color: var(--color-error, #da1e28);
}

.mini-btn .material-symbols-rounded {
  font-size: 16px;
}

/* Cart Grid */
.minimal-cart {
  flex: 1 1 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  grid-auto-rows: minmax(40px, 1fr);
  gap: 4px;
  padding: 6px;
  overflow: hidden;
}

.mini-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  cursor: pointer;
  min-height: 40px;
  overflow: hidden;
  transition: background-color 0.1s;
}

.mini-slot:hover {
  background: var(--color-surface-hover);
}

.mini-slot.empty {
  opacity: 0.4;
  cursor: default;
}

.slot-hotkey {
  font-weight: 700;
  font-size: 11px;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.slot-name {
  width: 100%;
  overflow: hidden;
  text-align: center;
  font-size: 10px;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.slot-name.marquee .slot-name-inner {
  display: inline-block;
  animation: marquee 6s linear infinite;
  padding-left: 100%;
}

@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-100%); }
}

/* Master Footer */
.minimal-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.master-label {
  font-weight: 700;
  font-size: 10px;
  color: var(--color-text-secondary);
}

.master-slider {
  flex: 1;
  height: 4px;
  cursor: pointer;
  accent-color: var(--color-accent, #0f62fe);
}

.master-db {
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
  min-width: 40px;
  text-align: right;
}

.expand-btn {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 3px;
  display: flex;
  align-items: center;
}

.expand-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text-primary);
}

.expand-btn .material-symbols-rounded {
  font-size: 16px;
}
</style>
