import { describe, it, expect } from 'vitest';
// @ts-expect-error CommonJS module without type declarations
import { getMimeType } from '../electron/lib/mime';

describe('getMimeType', () => {
  it('maps known visual media extensions', () => {
    expect(getMimeType('/p/img.jpg')).toBe('image/jpeg');
    expect(getMimeType('/p/img.jpeg')).toBe('image/jpeg');
    expect(getMimeType('/p/img.png')).toBe('image/png');
    expect(getMimeType('/p/img.gif')).toBe('image/gif');
    expect(getMimeType('/p/img.webp')).toBe('image/webp');
    expect(getMimeType('/p/img.svg')).toBe('image/svg+xml');
    expect(getMimeType('/p/doc.pdf')).toBe('application/pdf');
  });

  it('is case-insensitive on the extension', () => {
    expect(getMimeType('/p/IMG.PNG')).toBe('image/png');
  });

  it('falls back to octet-stream for unknown extensions', () => {
    expect(getMimeType('/p/file.xyz')).toBe('application/octet-stream');
    expect(getMimeType('/p/noext')).toBe('application/octet-stream');
  });
});
