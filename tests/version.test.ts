import { describe, it, expect } from 'vitest';
// @ts-expect-error CommonJS module without type declarations
import { compareVersions } from '../electron/lib/version';

describe('compareVersions', () => {
  it('returns 1 when the first version is greater', () => {
    expect(compareVersions('1.6.1', '1.6.0')).toBe(1);
    expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
  });

  it('returns -1 when the first version is lesser', () => {
    expect(compareVersions('1.5.9', '1.6.0')).toBe(-1);
    expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
  });

  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.6.0', '1.6.0')).toBe(0);
  });

  it('treats missing segments as zero', () => {
    expect(compareVersions('1.6', '1.6.0')).toBe(0);
    expect(compareVersions('1.6.1', '1.6')).toBe(1);
    expect(compareVersions('1', '1.0.0')).toBe(0);
  });
});
