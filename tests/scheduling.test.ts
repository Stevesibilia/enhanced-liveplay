import { describe, it, expect } from 'vitest';
import { computeTriggers, type TriggerParams } from '../app/utils/scheduling';

const defaults: TriggerParams = {
  trimmedDuration: 10,
  crossFade: 0,
  stopFade: 0,
  isCartItem: false,
  isLooping: false,
  currentAudioTime: 0,
};

describe('computeTriggers', () => {
  describe('crossfade scheduling', () => {
    it('arms crossfade at trimmedDuration - crossFade', () => {
      const r = computeTriggers({ ...defaults, crossFade: 2 });
      expect(r.crossFadeAtMs).toBe(8000);
      expect(r.crossFadeDelayMs).toBe(8000);
    });

    it('computes delay relative to current audio time', () => {
      const r = computeTriggers({ ...defaults, crossFade: 2, currentAudioTime: 5 });
      expect(r.crossFadeAtMs).toBe(8000);
      expect(r.crossFadeDelayMs).toBe(3000);
    });

    it('does not arm crossfade if already past trigger point', () => {
      const r = computeTriggers({ ...defaults, crossFade: 2, currentAudioTime: 9 });
      expect(r.crossFadeAtMs).toBe(8000);
      expect(r.crossFadeDelayMs).toBeNull();
    });

    it('does not arm crossfade for cart items', () => {
      const r = computeTriggers({ ...defaults, crossFade: 2, isCartItem: true });
      expect(r.crossFadeAtMs).toBeNull();
      expect(r.crossFadeDelayMs).toBeNull();
    });
  });

  describe('stop-fade scheduling', () => {
    it('arms stop-fade when no crossfade', () => {
      const r = computeTriggers({ ...defaults, stopFade: 1 });
      expect(r.stopFadeAtMs).toBe(9000);
      expect(r.stopFadeDelayMs).toBe(9000);
    });

    it('crossfade takes priority over stop-fade', () => {
      const r = computeTriggers({ ...defaults, crossFade: 2, stopFade: 1 });
      expect(r.crossFadeAtMs).toBe(8000);
      expect(r.stopFadeAtMs).toBeNull();
    });

    it('does not arm stop-fade for cart items', () => {
      const r = computeTriggers({ ...defaults, stopFade: 1, isCartItem: true });
      expect(r.stopFadeAtMs).toBeNull();
    });
  });

  describe('end detection', () => {
    it('arms end timeout for non-looping items', () => {
      const r = computeTriggers({ ...defaults });
      expect(r.endAtMs).toBe(10000);
      expect(r.endDelayMs).toBe(10000);
    });

    it('does not arm end timeout for looping items', () => {
      const r = computeTriggers({ ...defaults, isLooping: true });
      expect(r.endAtMs).toBeNull();
      expect(r.endDelayMs).toBeNull();
    });

    it('end timeout accounts for current position', () => {
      const r = computeTriggers({ ...defaults, currentAudioTime: 7 });
      expect(r.endAtMs).toBe(10000);
      expect(r.endDelayMs).toBe(3000);
    });

    it('end timeout for cart items fires (only crossfade/stop-fade are skipped)', () => {
      const r = computeTriggers({ ...defaults, isCartItem: true });
      expect(r.endAtMs).toBe(10000);
      expect(r.endDelayMs).toBe(10000);
      expect(r.crossFadeAtMs).toBeNull();
      expect(r.stopFadeAtMs).toBeNull();
    });
  });

  describe('combined scenarios', () => {
    it('all three triggers with crossfade', () => {
      const r = computeTriggers({ ...defaults, crossFade: 3 });
      expect(r.crossFadeAtMs).toBe(7000);
      expect(r.stopFadeAtMs).toBeNull(); // crossfade wins
      expect(r.endAtMs).toBe(10000);
    });

    it('stop-fade and end only (no crossfade)', () => {
      const r = computeTriggers({ ...defaults, stopFade: 2 });
      expect(r.crossFadeAtMs).toBeNull();
      expect(r.stopFadeAtMs).toBe(8000);
      expect(r.endAtMs).toBe(10000);
    });

    it('seeking past all trigger points arms nothing', () => {
      const r = computeTriggers({ ...defaults, crossFade: 2, currentAudioTime: 10 });
      expect(r.crossFadeDelayMs).toBeNull();
      expect(r.endDelayMs).toBeNull();
    });
  });
});
