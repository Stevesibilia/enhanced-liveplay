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
