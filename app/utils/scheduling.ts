/**
 * Pure scheduling math for event-driven cue transitions.
 * Extracted from useAudioEngine for testability.
 */

export interface TriggerParams {
  trimmedDuration: number; // seconds
  crossFade: number; // seconds, 0 = none
  stopFade: number; // seconds, 0 = none
  isCartItem: boolean;
  isLooping: boolean;
  currentAudioTime: number; // seconds, position within sprite
}

export interface ScheduledTriggers {
  crossFadeAtMs: number | null; // ms from sprite start, or null if not armed
  stopFadeAtMs: number | null;
  endAtMs: number | null;
  crossFadeDelayMs: number | null; // ms from now, or null
  stopFadeDelayMs: number | null;
  endDelayMs: number | null;
}

/**
 * Compute which triggers to arm and their timing.
 *
 * Rules:
 * - Cart items never get crossfade or stop-fade
 * - Crossfade takes priority over stop-fade
 * - End detection fires for all non-looping items
 * - Triggers in the past (delay <= 0) are not armed
 */
export function computeTriggers(params: TriggerParams): ScheduledTriggers {
  const { trimmedDuration, crossFade, stopFade, isCartItem, isLooping, currentAudioTime } = params;

  const result: ScheduledTriggers = {
    crossFadeAtMs: null,
    stopFadeAtMs: null,
    endAtMs: null,
    crossFadeDelayMs: null,
    stopFadeDelayMs: null,
    endDelayMs: null,
  };

  // Crossfade (non-cart, crossFade > 0)
  if (!isCartItem && crossFade > 0) {
    const atMs = (trimmedDuration - crossFade) * 1000;
    const delayMs = atMs - currentAudioTime * 1000;
    result.crossFadeAtMs = atMs;
    result.crossFadeDelayMs = delayMs > 0 ? delayMs : null;
  }
  // Stop-fade (non-cart, stopFade > 0, no crossfade)
  else if (!isCartItem && stopFade > 0) {
    const atMs = (trimmedDuration - stopFade) * 1000;
    const delayMs = atMs - currentAudioTime * 1000;
    result.stopFadeAtMs = atMs;
    result.stopFadeDelayMs = delayMs > 0 ? delayMs : null;
  }

  // End detection (all non-looping)
  if (!isLooping) {
    const atMs = trimmedDuration * 1000;
    const delayMs = atMs - currentAudioTime * 1000;
    result.endAtMs = atMs;
    result.endDelayMs = delayMs > 0 ? delayMs : null;
  }

  return result;
}
