import type { PlayerDisplayState } from '~/types/ipc';

/**
 * Pushes the full published-layer state to the player window via IPC.
 *
 * If the player window isn't open yet, the latest state is queued and flushed
 * the next time syncToPlayer() is called after the window opens. The player
 * window is auto-opened on the first sync.
 */
export const usePlayerSync = () => {
  const pendingState = useState<PlayerDisplayState | null>(
    'playerSync.pending',
    () => null
  );

  const syncToPlayer = async (state: PlayerDisplayState) => {
    if (!import.meta.client || !window.electronAPI) return;

    const status = await window.electronAPI.getPlayerWindowStatus();
    if (!status.open) {
      pendingState.value = state;
      await window.electronAPI.openPlayerWindow();
      // Give the player window a moment to load before flushing
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const payload = pendingState.value ?? state;
    pendingState.value = null;
    await window.electronAPI.pushToPlayer(payload as any);
  };

  return { syncToPlayer };
};
