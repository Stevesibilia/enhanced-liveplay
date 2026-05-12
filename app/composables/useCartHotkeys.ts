import type { CartSlotKeyBinding, GlobalActionId, GlobalKeyBindings } from '~/types/project';
import type { AudioItem } from '~/types/project';
import { DEFAULT_CART_SLOT_KEYS, DEFAULT_GLOBAL_KEY_BINDINGS } from '~/types/project';

// Reserved combos that cannot be assigned to cart slots
const RESERVED_COMBOS: CartSlotKeyBinding[] = [
  { key: 's', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'q', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'w', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'z', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'n', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'o', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'a', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'c', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'v', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'x', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'y', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'r', ctrlKey: true, shiftKey: false, altKey: false },
  { key: 'F1', ctrlKey: false, shiftKey: false, altKey: false },
  { key: ' ', ctrlKey: false, shiftKey: false, altKey: false },
  { key: 'Shift', ctrlKey: false, shiftKey: false, altKey: false },
  { key: 'Escape', ctrlKey: false, shiftKey: false, altKey: false },
];


export const bindingsMatch = (a: CartSlotKeyBinding, b: CartSlotKeyBinding): boolean => {
  return a.key.toLowerCase() === b.key.toLowerCase()
    && a.ctrlKey === b.ctrlKey
    && a.shiftKey === b.shiftKey
    && a.altKey === b.altKey;
};

/**
 * Check if a binding is a reserved combo.
 */
export const isReservedCombo = (binding: CartSlotKeyBinding): boolean => {
  return RESERVED_COMBOS.some(r => bindingsMatch(r, binding));
};

/**
 * Format a key binding for display (e.g., "Ctrl+1", "Q", "Space").
 */
export const formatKeyLabel = (binding: CartSlotKeyBinding): string => {
  const parts: string[] = [];
  if (binding.ctrlKey) parts.push('Ctrl');
  if (binding.shiftKey) parts.push('Shift');
  if (binding.altKey) parts.push('Alt');
  let keyLabel: string;
  if (binding.key === ' ') keyLabel = 'Space';
  else if (binding.key === 'ShiftRight') keyLabel = 'Right Shift';
  else keyLabel = binding.key.length === 1 ? binding.key.toUpperCase() : binding.key;
  parts.push(keyLabel);
  return parts.join('+');
};

/**
 * Convert a KeyboardEvent to a CartSlotKeyBinding.
 */
export const eventToBinding = (e: KeyboardEvent): CartSlotKeyBinding => {
  return {
    key: e.key,
    ctrlKey: e.ctrlKey || e.metaKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey,
  };
};

/**
 * Convert a KeyboardEvent to a binding, mapping Right Shift to 'ShiftRight'.
 * Use this for capturing global action bindings.
 */
export const globalEventToBinding = (e: KeyboardEvent): CartSlotKeyBinding => {
  if (e.key === 'Shift' && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT) {
    return { key: 'ShiftRight', ctrlKey: false, shiftKey: false, altKey: false };
  }
  return eventToBinding(e);
};

/** Global action metadata, ordered for display. */
export const GLOBAL_ACTIONS: { id: GlobalActionId; label: string; category: string }[] = [
  { id: 'pause-resume', label: 'Pause / Resume', category: 'Playback' },
  { id: 'toggle-loop',  label: 'Toggle Loop',    category: 'Playback' },
  { id: 'stop-all',     label: 'Stop All',        category: 'Playback' },
  { id: 'volume-up',    label: 'Volume Up',        category: 'Volume' },
  { id: 'volume-down',  label: 'Volume Down',      category: 'Volume' },
];

export const useCartHotkeys = () => {
  const { currentProject, selectedItem, saveProject } = useProject();
  const { getCartItem } = useCartItems();
  const { playCue, stopCue, pauseCue, resumeCue, activeCues, stopAllCues, setMasterGain, masterGainDb, setLoopForCue } = useAudioEngine();

  const keyMappings = computed(() => {
    return currentProject.value?.cartSlotKeys ?? { ...DEFAULT_CART_SLOT_KEYS };
  });

  const globalKeyMappings = computed(() => {
    return currentProject.value?.globalKeyBindings ?? { ...DEFAULT_GLOBAL_KEY_BINDINGS };
  });

  const matchesGlobal = (e: KeyboardEvent, binding: CartSlotKeyBinding): boolean => {
    if (binding.key === 'ShiftRight') {
      return e.key === 'Shift'
        && e.location === KeyboardEvent.DOM_KEY_LOCATION_RIGHT
        && !e.ctrlKey && !e.altKey;
    }
    return e.key.toLowerCase() === binding.key.toLowerCase()
      && (e.ctrlKey || e.metaKey) === binding.ctrlKey
      && e.shiftKey === binding.shiftKey
      && e.altKey === binding.altKey;
  };

  /**
   * Trigger a cart slot by index — mirrors click behavior.
   */
  const triggerSlot = (slotIndex: number) => {
    const item = getCartItem(slotIndex);
    if (!item) return;

    if (activeCues.value.has(item.uuid)) {
      // Already playing — stop it (toggle behavior)
      stopCue(item.uuid);
    } else {
      playCue(item);
    }
  };

  /**
   * Find which slot a key event maps to. Returns slot index or -1.
   */
  const findSlotForEvent = (e: KeyboardEvent): number => {
    const mappings = keyMappings.value;
    for (const [slotStr, binding] of Object.entries(mappings)) {
      if (
        e.key.toLowerCase() === binding.key.toLowerCase()
        && (e.ctrlKey || e.metaKey) === binding.ctrlKey
        && e.shiftKey === binding.shiftKey
        && e.altKey === binding.altKey
      ) {
        return parseInt(slotStr, 10);
      }
    }
    return -1;
  };

  /**
   * Check if focus is on a text input element.
   */
  const isTextInputFocused = (): boolean => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
  };

  /**
   * Get the target audio item for global shortcuts.
   * Prefers the active (playing) cue, falls back to selectedItem.
   */
  const getTargetItem = (): AudioItem | null => {
    // Try active (playing) cue first — pause/resume should target what's audible
    if (activeCues.value.size > 0) {
      const firstUuid = activeCues.value.keys().next().value;
      if (firstUuid) {
        const { findItemByUuid } = useProject();
        const item = findItemByUuid(firstUuid);
        if (item && item.type === 'audio') return item as AudioItem;
        // Check cart-only items
        const { getCartOnlyItem } = useCartItems();
        const cartItem = getCartOnlyItem(firstUuid);
        if (cartItem) return cartItem;
      }
    }
    // Fall back to selected item (e.g., to start playback when nothing is playing)
    if (selectedItem.value && selectedItem.value.type === 'audio') {
      return selectedItem.value as AudioItem;
    }
    return null;
  };

  /**
   * Toggle pause/resume for the target item. If stopped, start playing.
   */
  const togglePlayStop = () => {
    const item = getTargetItem();
    if (!item) return;
    if (activeCues.value.has(item.uuid)) {
      const cue = activeCues.value.get(item.uuid);
      if (cue && cue.isPaused) {
        resumeCue(item.uuid);
      } else {
        pauseCue(item.uuid);
      }
    } else {
      playCue(item);
    }
  };

  /**
   * Toggle loop on the target item's endBehavior.
   */
  const toggleLoop = () => {
    const item = getTargetItem();
    if (!item) return;
    const newLoop = item.endBehavior.action !== 'loop';
    item.endBehavior = newLoop ? { action: 'loop' } : { action: 'nothing' };
    // Sync the live Howl so the change takes effect without restarting
    setLoopForCue(item.uuid, newLoop);
    saveProject();
  };

  /**
   * Global keydown handler.
   */
  const handleKeydown = (e: KeyboardEvent) => {
    if (isTextInputFocused()) return;
    if (!currentProject.value) return;

    const gm = globalKeyMappings.value;

    if (matchesGlobal(e, gm['pause-resume'])) {
      e.preventDefault(); e.stopPropagation(); togglePlayStop(); return;
    }
    if (matchesGlobal(e, gm['toggle-loop'])) {
      e.preventDefault(); e.stopPropagation(); toggleLoop(); return;
    }
    if (matchesGlobal(e, gm['stop-all'])) {
      e.preventDefault(); e.stopPropagation(); stopAllCues(); return;
    }
    // Volume actions: skip if the same key is also assigned to a cart slot
    if (matchesGlobal(e, gm['volume-up']) && findSlotForEvent(e) < 0) {
      e.preventDefault(); e.stopPropagation(); setMasterGain(masterGainDb.value + 1); return;
    }
    if (matchesGlobal(e, gm['volume-down']) && findSlotForEvent(e) < 0) {
      e.preventDefault(); e.stopPropagation(); setMasterGain(masterGainDb.value - 1); return;
    }

    // Cart slot hotkeys
    const slotIndex = findSlotForEvent(e);
    if (slotIndex >= 0) {
      e.preventDefault();
      e.stopPropagation();
      triggerSlot(slotIndex);
    }
  };

  /**
   * Update a slot's key binding. Returns conflict slot index or -1.
   */
  const updateBinding = (slotIndex: number, binding: CartSlotKeyBinding): { conflict: number } => {
    if (!currentProject.value) return { conflict: -1 };

    // Check for conflicts with other slots
    const mappings = currentProject.value.cartSlotKeys ?? {};
    for (const [slotStr, existing] of Object.entries(mappings)) {
      const existingSlot = parseInt(slotStr, 10);
      if (existingSlot !== slotIndex && bindingsMatch(existing, binding)) {
        return { conflict: existingSlot };
      }
    }

    // Apply the binding
    if (!currentProject.value.cartSlotKeys) {
      currentProject.value.cartSlotKeys = { ...DEFAULT_CART_SLOT_KEYS };
    }
    currentProject.value.cartSlotKeys[slotIndex] = binding;
    return { conflict: -1 };
  };

  const resetToDefaults = () => {
    if (!currentProject.value) return;
    currentProject.value.cartSlotKeys = { ...DEFAULT_CART_SLOT_KEYS };
    currentProject.value.globalKeyBindings = { ...DEFAULT_GLOBAL_KEY_BINDINGS };
  };

  const updateGlobalBinding = (actionId: GlobalActionId, binding: CartSlotKeyBinding) => {
    if (!currentProject.value) return;
    if (!currentProject.value.globalKeyBindings) {
      currentProject.value.globalKeyBindings = { ...DEFAULT_GLOBAL_KEY_BINDINGS };
    }
    currentProject.value.globalKeyBindings[actionId] = binding;
  };

  // Lifecycle: register/unregister global listener
  let mounted = false;

  const mount = () => {
    if (mounted) return;
    window.addEventListener('keydown', handleKeydown);
    mounted = true;
  };

  const unmount = () => {
    if (!mounted) return;
    window.removeEventListener('keydown', handleKeydown);
    mounted = false;
  };

  return {
    keyMappings,
    globalKeyMappings,
    triggerSlot,
    mount,
    unmount,
    updateBinding,
    updateGlobalBinding,
    resetToDefaults,
    findSlotForEvent,
  };
};
