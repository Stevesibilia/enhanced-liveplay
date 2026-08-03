import type { PlayerDisplayState } from '~/types/ipc';

/**
 * Pushes the full published-layer state to the player window via IPC.
 *
 * All delivery and window management live in the main process: it caches the
 * last state, flushes it once the player renderer signals readiness, mirrors it
 * to connected remote viewers, and auto-opens the local player window only when
 * the local output is enabled (independent of the remote viewer). The push is
 * therefore unconditional — no window handling needed here.
 */
export const usePlayerSync = () => {
  const syncToPlayer = async (state: PlayerDisplayState) => {
    if (!import.meta.client || !window.electronAPI) return;
    await window.electronAPI.pushToPlayer(state as any);
  };

  return { syncToPlayer };
};
