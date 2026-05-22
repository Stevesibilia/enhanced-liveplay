import { describe, it, expect } from 'vitest';
import { getVisualMediaType, ALL_VISUAL_EXTENSIONS } from '../app/types/project';

describe('getVisualMediaType', () => {
  it('returns "image" for supported image extensions', () => {
    expect(getVisualMediaType('photo.jpg')).toBe('image');
    expect(getVisualMediaType('photo.jpeg')).toBe('image');
    expect(getVisualMediaType('photo.png')).toBe('image');
    expect(getVisualMediaType('photo.gif')).toBe('image');
    expect(getVisualMediaType('photo.webp')).toBe('image');
    expect(getVisualMediaType('icon.svg')).toBe('image');
  });

  it('returns "pdf" for .pdf extension', () => {
    expect(getVisualMediaType('document.pdf')).toBe('pdf');
  });

  it('returns null for unsupported extensions', () => {
    expect(getVisualMediaType('video.mp4')).toBeNull();
    expect(getVisualMediaType('audio.mp3')).toBeNull();
    expect(getVisualMediaType('file.txt')).toBeNull();
  });

  it('is case-insensitive', () => {
    expect(getVisualMediaType('PHOTO.JPG')).toBe('image');
    expect(getVisualMediaType('Doc.PDF')).toBe('pdf');
  });
});

describe('ALL_VISUAL_EXTENSIONS', () => {
  it('includes all image and pdf extensions', () => {
    expect(ALL_VISUAL_EXTENSIONS).toContain('.jpg');
    expect(ALL_VISUAL_EXTENSIONS).toContain('.png');
    expect(ALL_VISUAL_EXTENSIONS).toContain('.pdf');
    expect(ALL_VISUAL_EXTENSIONS).toContain('.svg');
  });
});

describe('stale link cleanup logic', () => {
  // This tests the logic that would run in useVisualMedia.validateVisualMediaLinks
  // We test the pure logic here without Vue reactivity
  it('clears linkedCueUuid when referenced item does not exist', () => {
    const visualMedia = [
      { uuid: 'v1', displayName: 'Map', linkedCueUuid: 'audio-exists', mediaFileName: 'x.png', mediaPath: 'media/visuals/x.png', mediaType: 'image' as const },
      { uuid: 'v2', displayName: 'Score', linkedCueUuid: 'audio-gone', mediaFileName: 'y.pdf', mediaPath: 'media/visuals/y.pdf', mediaType: 'pdf' as const },
      { uuid: 'v3', displayName: 'No link', mediaFileName: 'z.jpg', mediaPath: 'media/visuals/z.jpg', mediaType: 'image' as const },
    ];

    const existingUuids = new Set(['audio-exists']);

    // Simulate the cleanup logic
    for (const item of visualMedia) {
      if (item.linkedCueUuid && !existingUuids.has(item.linkedCueUuid)) {
        item.linkedCueUuid = undefined;
      }
    }

    expect(visualMedia[0].linkedCueUuid).toBe('audio-exists');
    expect(visualMedia[1].linkedCueUuid).toBeUndefined();
    expect(visualMedia[2].linkedCueUuid).toBeUndefined();
  });
});
