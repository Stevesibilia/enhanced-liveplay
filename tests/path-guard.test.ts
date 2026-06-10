import { describe, it, expect } from 'vitest';
import path from 'path';
// @ts-expect-error CommonJS module without type declarations
import { pathIsInProjectFolder } from '../electron/lib/path-guard';

// The guard receives the project *file* path and derives the folder from it.
const projectFile = path.join(path.sep, 'home', 'user', 'shows', 'my-show', 'project.liveplay');
const projectFolder = path.dirname(projectFile);

describe('pathIsInProjectFolder', () => {
  it('accepts a path inside the project folder', () => {
    const requested = path.join(projectFolder, 'media', 'song.mp3');
    expect(pathIsInProjectFolder(requested, projectFile)).toBe(requested);
  });

  it('accepts the project folder itself', () => {
    expect(pathIsInProjectFolder(projectFolder, projectFile)).toBe(projectFolder);
  });

  it('rejects an absolute path outside the project folder', () => {
    expect(pathIsInProjectFolder(path.join(path.sep, 'etc', 'passwd'), projectFile)).toBeNull();
  });

  it('rejects path traversal escaping the project folder', () => {
    const requested = path.join(projectFolder, '..', '..', '..', 'etc', 'passwd');
    expect(pathIsInProjectFolder(requested, projectFile)).toBeNull();
  });

  it('rejects sibling folders sharing the project folder as a name prefix', () => {
    const sibling = projectFolder + '-evil';
    expect(pathIsInProjectFolder(path.join(sibling, 'file.mp3'), projectFile)).toBeNull();
  });

  it('resolves traversal that stays inside the project folder', () => {
    const requested = path.join(projectFolder, 'media', '..', 'media', 'song.mp3');
    expect(pathIsInProjectFolder(requested, projectFile)).toBe(
      path.join(projectFolder, 'media', 'song.mp3')
    );
  });

  it('allows any path when no project is loaded', () => {
    const requested = path.join(path.sep, 'anywhere', 'file.mp3');
    expect(pathIsInProjectFolder(requested, null)).toBe(requested);
    expect(pathIsInProjectFolder(requested, undefined)).toBe(requested);
  });
});
