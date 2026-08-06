import { describe, it, expect } from 'vitest';
import { waveformDisplayScale } from '../app/utils/audio';

describe('waveformDisplayScale', () => {
  it('lifts a quiet track so its loudest peak fills full height', () => {
    // Loudest peak 0.2 -> scale 5x maps it to 1.0
    expect(waveformDisplayScale([0.05, 0.1, 0.2, 0.15])).toBeCloseTo(5, 5);
  });

  it('never scales below 1 for already-hot tracks', () => {
    expect(waveformDisplayScale([0.9, 1.0, 0.8])).toBe(1);
  });

  it('caps the boost so near-silent noise is not blown up', () => {
    // Peak 0.001 would be 1000x; capped at default maxScale 8
    expect(waveformDisplayScale([0.0005, 0.001])).toBe(8);
    expect(waveformDisplayScale([0.02], 4)).toBe(4);
  });

  it('handles absolute values (negative peaks)', () => {
    expect(waveformDisplayScale([-0.5, 0.25])).toBeCloseTo(2, 5);
  });

  it('returns 1 for empty, missing, or all-zero peaks', () => {
    expect(waveformDisplayScale([])).toBe(1);
    expect(waveformDisplayScale(null)).toBe(1);
    expect(waveformDisplayScale(undefined)).toBe(1);
    expect(waveformDisplayScale([0, 0, 0])).toBe(1);
  });
});
