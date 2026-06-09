import type { PlayerDisplayState } from '~/types/ipc';

/**
 * Pushes the full published-layer state to the player window via IPC.
 *
 * The player window is auto-opened on the first sync. Delivery buffering lives
 * in the main process: it caches the last state and flushes it once the player
 * renderer signals readiness, so a push issued before the window has finished
 * loading is never dropped. This composable therefore pushes unconditionally
 * after ensuring the window is open — no timing guess needed.
 */
export const usePlayerSync = () => {
  const syncToPlayer = async (state: PlayerDisplayState) => {
    if (!import.meta.client || !window.electronAPI) return;

    const status = await window.electronAPI.getPlayerWindowStatus();
    if (!status.open) {
      await window.electronAPI.openPlayerWindow();
    }

    await window.electronAPI.pushToPlayer(state as any);
  };

  return { syncToPlayer };
};
