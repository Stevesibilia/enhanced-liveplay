import { describe, it, expect } from 'vitest';
import { THEME_LIST, isDarkTheme, DEFAULT_THEME } from '../app/types/project';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../app/utils/migrations';

describe('theme system', () => {
  it('new projects default to cobalt with no custom accent', () => {
    expect(DEFAULT_THEME.mode).toBe('cobalt');
    expect(DEFAULT_THEME.accentColor).toBe('');
  });

  it('classifies theme families', () => {
    expect(isDarkTheme('cobalt')).toBe(true);
    expect(isDarkTheme('calm-slate')).toBe(true);
    expect(isDarkTheme('dark')).toBe(true);
    expect(isDarkTheme('light')).toBe(false);
  });

  it('falls back to dark family for unknown ids', () => {
    expect(isDarkTheme('does-not-exist')).toBe(true);
  });

  it('THEME_LIST ids are unique and cobalt comes first', () => {
    const ids = THEME_LIST.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('cobalt');
  });
});

describe('migrateV2ToV3 — legacy default accent cleanup', () => {
  const baseProject = () => ({
    name: 'p',
    items: [],
    schemaVersion: 2,
    theme: { mode: 'dark', accentColor: '#DA1E28' },
  });

  it('clears the legacy default accent', () => {
    const p = baseProject();
    runMigrations(p);
    expect(p.theme.accentColor).toBe('');
    expect(p.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('clears the legacy default accent case-insensitively', () => {
    const p = baseProject();
    p.theme.accentColor = '#da1e28';
    runMigrations(p);
    expect(p.theme.accentColor).toBe('');
  });

  it('preserves a genuinely custom accent', () => {
    const p = baseProject();
    p.theme.accentColor = '#8a3ffc';
    runMigrations(p);
    expect(p.theme.accentColor).toBe('#8a3ffc');
  });

  it('is idempotent', () => {
    const p = baseProject();
    runMigrations(p);
    runMigrations(p);
    expect(p.theme.accentColor).toBe('');
  });
});

describe('migrateV3ToV4 — legacy default cue color cleanup', () => {
  const proj = (items: any[], cartOnly: any[] = []) => ({
    name: 'p', items, cartOnlyItems: cartOnly, schemaVersion: 3,
    theme: { mode: 'dark', accentColor: '' },
  });

  it('recolors pure-red default cues to the neutral default', () => {
    const p = proj([{ type: 'audio', color: '#FF0000' }]);
    runMigrations(p);
    expect(p.items[0].color).toBe('#6b7280');
    expect(p.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('recurses into groups and covers cart-only items', () => {
    const p = proj(
      [{ type: 'group', color: '#ff0000', children: [{ type: 'audio', color: '#FF0000' }] }],
      [{ type: 'audio', color: '#FF0000' }],
    );
    runMigrations(p);
    expect(p.items[0].color).toBe('#6b7280');
    expect((p.items[0] as any).children[0].color).toBe('#6b7280');
    expect(p.cartOnlyItems[0].color).toBe('#6b7280');
  });

  it('preserves deliberately picked colors', () => {
    const p = proj([{ type: 'audio', color: '#00CC99' }]);
    runMigrations(p);
    expect(p.items[0].color).toBe('#00CC99');
  });
});
