import { describe, it, expect } from 'vitest';
import { validateProjectStructure, runMigrations, CURRENT_SCHEMA_VERSION } from '../app/utils/migrations';

describe('validateProjectStructure', () => {
  it('passes with valid minimal project', () => {
    expect(() => validateProjectStructure({ name: 'Test', items: [] })).not.toThrow();
  });

  it('throws on missing name', () => {
    expect(() => validateProjectStructure({ items: [] })).toThrow('"name"');
  });

  it('throws on missing items', () => {
    expect(() => validateProjectStructure({ name: 'Test' })).toThrow('"items"');
  });

  it('throws on non-object input', () => {
    expect(() => validateProjectStructure(null)).toThrow('not a valid JSON object');
  });
});

describe('runMigrations', () => {
  it('migrates version 0 file to current version with defaults', () => {
    const project: any = {
      name: 'Legacy',
      version: '1.0.0',
      items: [
        {
          type: 'audio',
          uuid: '1',
          duckingBehavior: { mode: 'stop-all' }
        }
      ]
    };

    runMigrations(project);

    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(project.cartOnlyItems).toEqual([]);
    expect(project.cartSlotKeys).toBeDefined();
    expect(project.items[0].fadeOutDuration).toBe(1.0);
    expect(project.items[0].crossFade).toBe(0);
    expect(project.items[0].playFade).toBe(0);
    expect(project.items[0].stopFade).toBe(0);
    expect(project.items[0].duckingBehavior.duckFadeIn).toBe(0.25);
    expect(project.items[0].duckingBehavior.duckFadeOut).toBe(1.0);
  });

  it('skips migration for current-version file', () => {
    const project: any = {
      name: 'Current',
      version: '1.0.0',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      items: [{ type: 'audio', uuid: '1' }],
      cartOnlyItems: [],
    };

    // Should not add cartSlotKeys (that's a migration 0→1 thing)
    runMigrations(project);
    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    // cartSlotKeys was not added because migration didn't run
    expect(project.cartSlotKeys).toBeUndefined();
  });

  it('is idempotent — running twice produces same result', () => {
    const project: any = {
      name: 'Test',
      version: '1.0.0',
      items: [
        { type: 'audio', uuid: '1', duckingBehavior: { mode: 'duck-others', duckLevel: 0.2 } }
      ]
    };

    runMigrations(project);
    const after1 = JSON.stringify(project);

    runMigrations(project);
    const after2 = JSON.stringify(project);

    expect(after1).toBe(after2);
  });

  it('migrates nested group children', () => {
    const project: any = {
      name: 'Test',
      version: '1.0.0',
      items: [
        {
          type: 'group',
          uuid: 'g1',
          children: [
            { type: 'audio', uuid: 'a1' }
          ]
        }
      ]
    };

    runMigrations(project);
    expect(project.items[0].children[0].fadeOutDuration).toBe(1.0);
    expect(project.items[0].children[0].crossFade).toBe(0);
  });

  it('migrates v1 project to v2 with visualMedia and visualFolders', () => {
    const project: any = {
      name: 'V1Project',
      version: '1.0.0',
      schemaVersion: 1,
      items: [],
      cartOnlyItems: [],
      cartSlotKeys: {},
    };

    runMigrations(project);

    expect(project.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(project.visualMedia).toEqual([]);
    expect(project.visualFolders).toEqual([]);
  });

  it('does not overwrite existing visualMedia on migration', () => {
    const project: any = {
      name: 'V1WithVisuals',
      version: '1.0.0',
      schemaVersion: 1,
      items: [],
      cartOnlyItems: [],
      visualMedia: [{ uuid: 'existing' }],
      visualFolders: ['Maps'],
    };

    runMigrations(project);

    expect(project.visualMedia).toEqual([{ uuid: 'existing' }]);
    expect(project.visualFolders).toEqual(['Maps']);
  });
});
