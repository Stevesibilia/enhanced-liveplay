<template>
  <div class="control-config-overlay" @click.self="$emit('close')">
    <div class="control-config-panel">
      <div class="config-header">
        <div class="header-left">
          <h3>{{ t('cart.configureControls') }}</h3>
          <span v-if="activeTab === 'midi' && connectedDevices.length > 0" class="device-info">
            {{ connectedDevices.join(', ') }}
          </span>
          <span v-else-if="activeTab === 'midi'" class="device-info no-device">{{ t('midi.noDevices') }}</span>
        </div>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>

      <div class="tab-bar">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'keyboard' }"
          @click="activeTab = 'keyboard'"
        >
          <span class="tab-icon">&#x2328;</span> {{ t('cart.tabKeyboard') }}
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'midi' }"
          @click="activeTab = 'midi'"
        >
          <span class="tab-icon">&#x1F3B9;</span> {{ t('cart.tabMidi') }}
        </button>
      </div>

      <!-- Keyboard tab -->
      <div v-if="activeTab === 'keyboard'" class="config-body">
        <div class="category-header">Cart Slots</div>
        <!-- Cart slot rows -->
        <div
          v-for="slot in 16"
          :key="slot"
          class="action-row key-slot-row"
          :class="{ capturing: capturingSlot === slot - 1, conflict: conflictSlot === slot - 1 }"
          @click="startCapture(slot - 1)"
        >
          <span class="action-label">Cart Slot {{ slot }}</span>
          <span class="action-binding" :class="{ 'is-default': capturingSlot !== slot - 1 && isDefaultKey(slot - 1) }">
            <template v-if="capturingSlot === slot - 1">
              {{ t('cart.pressAnyKey') }}
            </template>
            <template v-else>
              {{ getKeyLabel(slot - 1) }}
            </template>
          </span>
          <span v-if="keyErrorMessage && keyErrorSlot === slot - 1" class="error-msg">{{ keyErrorMessage }}</span>
        </div>
        <!-- Global shortcut sections (remappable) -->
        <template v-for="category in globalCategories" :key="category">
          <div class="category-header">{{ category }}</div>
          <div
            v-for="action in globalActionsByCategory(category)"
            :key="action.id"
            class="action-row key-slot-row"
            :class="{ capturing: capturingGlobal === action.id, conflict: globalErrorAction === action.id && !!globalKeyErrorMessage }"
            @click="startGlobalCapture(action.id)"
          >
            <span class="action-label">{{ action.label }}</span>
            <span class="action-binding" :class="{ 'is-default': capturingGlobal !== action.id && isDefaultGlobalKey(action.id) }">
              <template v-if="capturingGlobal === action.id">
                {{ t('cart.pressAnyKey') }}
              </template>
              <template v-else>
                {{ getGlobalKeyLabel(action.id) }}
              </template>
            </span>
            <span v-if="globalKeyErrorMessage && globalErrorAction === action.id" class="error-msg">{{ globalKeyErrorMessage }}</span>
          </div>
        </template>
      </div>

      <!-- MIDI tab -->
      <div v-if="activeTab === 'midi'" class="config-body">
        <template v-for="category in midiCategories" :key="category">
          <div class="category-header">{{ category }}</div>
          <div
            v-for="action in midiActionsByCategory(category)"
            :key="action.id"
            class="action-row"
            :class="{ learning: learning === action.id }"
          >
            <span class="action-label">{{ action.label }}</span>
            <span class="action-binding">
              <template v-if="learning === action.id">
                {{ t('midi.waitingForInput') }}
              </template>
              <template v-else-if="getMidiBinding(action.id)">
                {{ formatMidiBindingLabel(action.id) }}
              </template>
              <template v-else>
                —
              </template>
            </span>
            <div class="action-buttons">
              <button
                class="learn-btn"
                :class="{ active: learning === action.id }"
                @click="toggleLearn(action.id)"
              >
                {{ learning === action.id ? t('midi.cancel') : t('midi.learn') }}
              </button>
              <button
                v-if="getMidiBinding(action.id)"
                class="clear-btn"
                @click="handleMidiClear(action.id)"
              >
                {{ t('midi.clear') }}
              </button>
            </div>
          </div>
        </template>
      </div>

      <div class="config-footer">
        <button class="reset-btn" @click="handleReset">
          {{ activeTab === 'keyboard' ? t('cart.resetDefaults') : t('midi.resetAll') }}
        </button>
        <button class="done-btn" @click="$emit('close')">{{ t('cart.close') }}</button>
      </div>

      <!-- MIDI Conflict dialog -->
      <div v-if="midiConflictInfo" class="conflict-overlay" @click.self="midiConflictInfo = null">
        <div class="conflict-dialog">
          <p>{{ midiConflictMessage }}</p>
          <div class="conflict-buttons">
            <button class="cancel-btn" @click="midiConflictInfo = null">{{ t('midi.cancel') }}</button>
            <button class="confirm-btn" @click="resolveMidiConflict">{{ t('midi.reassign') }}</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  formatKeyLabel,
  eventToBinding,
  globalEventToBinding,
  isReservedCombo,
  bindingsMatch,
  GLOBAL_ACTIONS,
} from '~/composables/useCartHotkeys';
import { DEFAULT_CART_SLOT_KEYS, type GlobalActionId } from '~/types/project';
import {
  MIDI_ACTIONS,
  formatMidiBinding,
  type MidiBinding,
  type MidiActionId,
} from '~/composables/useMidiController';

const emit = defineEmits<{
  close: [];
}>();

const { t } = useLocalization();

// Keyboard state
const { keyMappings, globalKeyMappings, updateBinding: updateKeyBinding, updateGlobalBinding, resetToDefaults } = useCartHotkeys();
const { currentProject, saveProject } = useProject();
const capturingSlot = ref<number | null>(null);
const keyErrorMessage = ref<string | null>(null);
const keyErrorSlot = ref<number | null>(null);
const conflictSlot = ref<number | null>(null);

// MIDI state
const {
  config: midiConfig,
  connectedDevices,
  learning,
  startLearn,
  stopLearn,
  updateBinding: updateMidiBinding,
  clearBinding: clearMidiBinding,
  clearAllBindings,
} = useMidiController();

const midiConflictInfo = ref<{ actionId: MidiActionId; binding: MidiBinding; conflictAction: string } | null>(null);

const activeTab = ref<'keyboard' | 'midi'>('keyboard');

// --- Global shortcuts (remappable) ---

const capturingGlobal = ref<GlobalActionId | null>(null);
const globalKeyErrorMessage = ref<string | null>(null);
const globalErrorAction = ref<GlobalActionId | null>(null);

const globalCategories = computed(() => {
  const cats: string[] = [];
  for (const action of GLOBAL_ACTIONS) {
    if (!cats.includes(action.category)) cats.push(action.category);
  }
  return cats;
});

const globalActionsByCategory = (category: string) =>
  GLOBAL_ACTIONS.filter(a => a.category === category);

const isDefaultGlobalKey = (actionId: GlobalActionId): boolean =>
  !currentProject.value?.globalKeyBindings?.[actionId];

const getGlobalKeyLabel = (actionId: GlobalActionId): string => {
  const binding = globalKeyMappings.value[actionId];
  return binding ? formatKeyLabel(binding) : '—';
};

const startGlobalCapture = (actionId: GlobalActionId) => {
  capturingGlobal.value = actionId;
  globalKeyErrorMessage.value = null;
  globalErrorAction.value = null;
  capturingSlot.value = null;
};

// --- Keyboard helpers ---

const isDefaultKey = (slotIndex: number): boolean => {
  return !currentProject.value?.cartSlotKeys?.[slotIndex];
};

const getKeyLabel = (slotIndex: number): string => {
  const binding = keyMappings.value[slotIndex];
  if (binding) return formatKeyLabel(binding);
  const def = DEFAULT_CART_SLOT_KEYS[slotIndex];
  return def ? formatKeyLabel(def) : '—';
};

const startCapture = (slotIndex: number) => {
  capturingSlot.value = slotIndex;
  keyErrorMessage.value = null;
  keyErrorSlot.value = null;
  conflictSlot.value = null;
  capturingGlobal.value = null;
};

const handleKeydown = (e: KeyboardEvent) => {
  // Escape handling (works for both tabs)
  if (e.key === 'Escape') {
    if (activeTab.value === 'keyboard' && capturingSlot.value !== null) {
      capturingSlot.value = null;
      keyErrorMessage.value = null;
      keyErrorSlot.value = null;
      e.preventDefault();
      return;
    }
    if (activeTab.value === 'keyboard' && capturingGlobal.value !== null) {
      capturingGlobal.value = null;
      globalKeyErrorMessage.value = null;
      globalErrorAction.value = null;
      e.preventDefault();
      return;
    }
    if (activeTab.value === 'midi' && learning.value) {
      stopLearn();
      e.preventDefault();
      return;
    }
    emit('close');
    return;
  }

  if (activeTab.value !== 'keyboard') return;
  if (['Control', 'Alt', 'Meta'].includes(e.key)) return;

  // Global action capture
  if (capturingGlobal.value !== null) {
    // Allow Shift alone (for Right Shift binding), but skip other modifier-only keys
    if (e.key === 'Shift' && e.location !== KeyboardEvent.DOM_KEY_LOCATION_RIGHT) return;

    e.preventDefault();
    e.stopPropagation();

    const binding = globalEventToBinding(e);
    const capturingId = capturingGlobal.value;

    // Check conflict with other global actions
    for (const action of GLOBAL_ACTIONS) {
      if (action.id === capturingId) continue;
      const existing = globalKeyMappings.value[action.id];
      if (existing && bindingsMatch(existing, binding)) {
        globalKeyErrorMessage.value = `Already assigned to "${action.label}"`;
        globalErrorAction.value = capturingId;
        return;
      }
    }

    // Check conflict with cart slots
    for (const [slotStr, slotBinding] of Object.entries(keyMappings.value)) {
      if (bindingsMatch(slotBinding, binding)) {
        const slotNum = parseInt(slotStr, 10) + 1;
        globalKeyErrorMessage.value = `Already assigned to Cart Slot ${slotNum}`;
        globalErrorAction.value = capturingId;
        return;
      }
    }

    updateGlobalBinding(capturingId, binding);
    globalKeyErrorMessage.value = null;
    globalErrorAction.value = null;
    capturingGlobal.value = null;
    saveProject();
    return;
  }

  // Cart slot capture
  if (capturingSlot.value === null) return;
  if (e.key === 'Shift') return;

  e.preventDefault();
  e.stopPropagation();

  const binding = eventToBinding(e);

  if (isReservedCombo(binding)) {
    keyErrorMessage.value = t('cart.reserved');
    keyErrorSlot.value = capturingSlot.value;
    return;
  }

  // Check conflict with global actions
  for (const action of GLOBAL_ACTIONS) {
    const existing = globalKeyMappings.value[action.id];
    if (existing && bindingsMatch(existing, binding)) {
      keyErrorMessage.value = `Already assigned to "${action.label}"`;
      keyErrorSlot.value = capturingSlot.value;
      return;
    }
  }

  const result = updateKeyBinding(capturingSlot.value, binding);
  if (result.conflict >= 0) {
    keyErrorMessage.value = `Already assigned to Slot ${result.conflict + 1}`;
    keyErrorSlot.value = capturingSlot.value;
    conflictSlot.value = result.conflict;
    return;
  }

  keyErrorMessage.value = null;
  keyErrorSlot.value = null;
  conflictSlot.value = null;
  capturingSlot.value = null;
  saveProject();
};

// --- MIDI helpers ---

const midiCategories = computed(() => {
  const cats: string[] = [];
  for (const action of MIDI_ACTIONS) {
    if (!cats.includes(action.category)) cats.push(action.category);
  }
  return cats;
});

const midiActionsByCategory = (category: string) => {
  return MIDI_ACTIONS.filter(a => a.category === category);
};

const getMidiBinding = (actionId: string): MidiBinding | undefined => {
  return midiConfig.value.bindings[actionId];
};

const formatMidiBindingLabel = (actionId: string): string => {
  const binding = midiConfig.value.bindings[actionId];
  return binding ? formatMidiBinding(binding) : '';
};

const midiConflictMessage = computed(() => {
  if (!midiConflictInfo.value) return '';
  const conflictAction = MIDI_ACTIONS.find(a => a.id === midiConflictInfo.value!.conflictAction);
  const label = conflictAction?.label ?? midiConflictInfo.value.conflictAction;
  return `This control is already assigned to "${label}". Reassign it?`;
});

const toggleLearn = (actionId: MidiActionId) => {
  if (learning.value === actionId) {
    stopLearn();
    return;
  }
  startLearn(actionId, (binding: MidiBinding) => {
    stopLearn();
    const result = updateMidiBinding(actionId, binding);
    if (result.conflict) {
      midiConflictInfo.value = { actionId, binding, conflictAction: result.conflict };
    }
  });
};

const resolveMidiConflict = () => {
  if (!midiConflictInfo.value) return;
  const { actionId, binding, conflictAction } = midiConflictInfo.value;
  clearMidiBinding(conflictAction as MidiActionId);
  updateMidiBinding(actionId, binding);
  midiConflictInfo.value = null;
};

const handleMidiClear = (actionId: MidiActionId) => {
  clearMidiBinding(actionId);
};

// --- Shared ---

const handleReset = () => {
  if (activeTab.value === 'keyboard') {
    resetToDefaults();
    saveProject();
  } else {
    clearAllBindings();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeydown, true);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown, true);
  if (learning.value) stopLearn();
});
</script>

<style scoped>
.control-config-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.control-config-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  position: relative;
}

.config-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 16px 20px 12px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.config-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.device-info {
  font-size: 12px;
  color: var(--color-success);
}

.device-info.no-device {
  color: var(--color-text-disabled);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 0 4px;
  line-height: 1;
}

.close-btn:hover {
  color: var(--color-text-primary);
}

/* Tabs */
.tab-bar {
  display: flex;
  gap: 0;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
}

.tab-btn {
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn.active {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-accent);
}

.tab-icon {
  font-size: 15px;
}

/* Body */
.config-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

/* Keyboard tab rows */
.key-slot-row {
  cursor: pointer;
}

.key-slot-row.capturing {
  background: color-mix(in srgb, var(--color-info) 10%, transparent);
}

.key-slot-row.conflict {
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}

.action-binding.is-default {
  opacity: 0.45;
}

.error-msg {
  font-size: 12px;
  color: var(--color-danger);
  margin-left: auto;
}

/* MIDI tab rows */
.category-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
  padding: 12px 20px 4px;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 20px;
  transition: background-color 0.1s;
}

.action-row:hover {
  background: var(--color-surface-hover);
}

.action-row.learning {
  background: color-mix(in srgb, var(--color-info) 10%, transparent);
}

.action-label {
  font-size: 13px;
  color: var(--color-text-primary);
  min-width: 120px;
  flex-shrink: 0;
}

.action-binding {
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-primary);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 2px 8px;
  min-width: 90px;
  text-align: center;
  flex: 1;
}

.action-buttons {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.learn-btn,
.clear-btn {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 3px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  cursor: pointer;
  transition: background-color 0.15s;
}

.learn-btn:hover,
.clear-btn:hover {
  background: var(--color-surface-hover);
}

.learn-btn.active {
  background: var(--color-accent);
  color: white;
  border-color: transparent;
}

/* Footer */
.config-footer {
  display: flex;
  justify-content: space-between;
  padding: 12px 20px;
  border-top: 1px solid var(--color-border);
}

.reset-btn,
.done-btn {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
  transition: background-color 0.15s;
}

.reset-btn:hover,
.done-btn:hover {
  background: var(--color-surface-hover);
}

.done-btn {
  background: var(--color-accent);
  color: white;
  border-color: transparent;
}

.done-btn:hover {
  opacity: 0.9;
}

/* Conflict dialog */
.conflict-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.conflict-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 20px;
  max-width: 300px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.conflict-dialog p {
  font-size: 13px;
  color: var(--color-text-primary);
  margin-bottom: 16px;
}

.conflict-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn,
.confirm-btn {
  padding: 6px 14px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text-primary);
}

.confirm-btn {
  background: var(--color-accent);
  color: white;
  border-color: transparent;
}
</style>
