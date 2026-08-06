import { DEFAULT_CART_SLOT_KEYS, NEUTRAL_CUE_COLOR } from '~/types/project';
import { waveformFileName } from '~/utils/paths';

// --- Migration functions ---
// Each migration takes a raw (any-typed) project object and mutates it in place.
// Migrations MUST be idempotent — running on an already-migrated file is a no-op.

function migrateV0ToV1(project: any): void {
  // Add cartOnlyItems if missing
  if (!project.cartOnlyItems) {
    project.cartOnlyItems = [];
  }

  // Add cartSlotKeys if missing — use defaults
  if (!project.cartSlotKeys) {
    project.cartSlotKeys = { ...DEFAULT_CART_SLOT_KEYS };
  }

  const migrateItem = (item: any): void => {
    if (item.type === 'audio') {
      // Add fadeOutDuration if missing
      if (item.fadeOutDuration === undefined) {
        item.fadeOutDuration = 1.0;
      }

      // Add playFade/stopFade/crossFade if missing
      if (item.playFade === undefined) {
        item.playFade = 0;
      }
      if (item.stopFade === undefined) {
        item.stopFade = 0;
      }
      if (item.crossFade === undefined) {
        item.crossFade = 0;
      }

      // Add ducking fade times if missing
      if (item.duckingBehavior) {
        if (item.duckingBehavior.duckFadeIn === undefined) {
          item.duckingBehavior.duckFadeIn = 0.25;
        }
        if (item.duckingBehavior.duckFadeOut === undefined) {
          item.duckingBehavior.duckFadeOut = 1.0;
        }
      }
    } else if (item.type === 'group') {
      if (item.children) {
        for (const child of item.children) {
          migrateItem(child);
        }
      }
    }
  };

  // Migrate all items (playlist + cart-only)
  if (project.items) {
    for (const item of project.items) {
      migrateItem(item);
    }
  }
  if (project.cartOnlyItems) {
    for (const item of project.cartOnlyItems) {
      migrateItem(item);
    }
  }
}

function migrateV1ToV2(project: any): void {
  // Add visualMedia array if missing
  if (!project.visualMedia) {
    project.visualMedia = [];
  }
  // Add visualFolders array if missing
  if (!project.visualFolders) {
    project.visualFolders = [];
  }
}

function migrateV2ToV3(project: any): void {
  // Every pre-theme-selector project carried accentColor '#DA1E28' because it
  // was the hardcoded default, not a user choice. Clear it so the new named
  // themes can supply their own accent; a genuinely custom color (anything
  // else) is preserved.
  if (project.theme && typeof project.theme.accentColor === 'string'
      && project.theme.accentColor.toUpperCase() === '#DA1E28') {
    project.theme.accentColor = '';
  }
}

function migrateV3ToV4(project: any): void {
  // Pre-restyle, every new cue was born pure red (#FF0000, first preset) —
  // a hardcoded default, not a user choice. Recolor exactly that value to
  // the neutral default; any other color was deliberately picked and stays.
  const recolor = (item: any): void => {
    if (typeof item.color === 'string' && item.color.toUpperCase() === '#FF0000') {
      item.color = NEUTRAL_CUE_COLOR;
    }
    if (item.type === 'group' && item.children) {
      for (const child of item.children) recolor(child);
    }
  };
  if (project.items) for (const item of project.items) recolor(item);
  if (project.cartOnlyItems) for (const item of project.cartOnlyItems) recolor(item);
}

function migrateV4ToV5(project: any): void {
  // waveformPath used to be persisted as an absolute path, which broke when a
  // project was synced to a host with a different folder layout (the stored
  // path pointed at the other machine's directory). Normalize it to a bare
  // filename; it is resolved against the current folderPath at runtime.
  const normalize = (item: any): void => {
    if (item.type === 'audio' && typeof item.waveformPath === 'string' && item.waveformPath) {
      item.waveformPath = waveformFileName(item.waveformPath);
    } else if (item.type === 'group' && item.children) {
      for (const child of item.children) normalize(child);
    }
  };
  if (project.items) for (const item of project.items) normalize(item);
  if (project.cartOnlyItems) for (const item of project.cartOnlyItems) normalize(item);
}

// --- Migration registry ---
// Index N = migration from version N to N+1
const migrations: Array<(project: any) => void> = [
  migrateV0ToV1, // 0 → 1
  migrateV1ToV2, // 1 → 2
  migrateV2ToV3, // 2 → 3
  migrateV3ToV4, // 3 → 4
  migrateV4ToV5, // 4 → 5
];

export const CURRENT_SCHEMA_VERSION = migrations.length;

// --- Validation ---

/**
 * Validates that parsed JSON has the minimum required structure for a project file.
 * Throws a descriptive error if validation fails.
 */
export function validateProjectStructure(json: any): void {
  if (!json || typeof json !== 'object') {
    throw new Error('Project file is not a valid JSON object');
  }
  if (typeof json.name !== 'string' || !json.name) {
    throw new Error('Project file is missing required field: "name"');
  }
  if (!Array.isArray(json.items)) {
    throw new Error('Project file is missing required field: "items" (expected array)');
  }
}

// --- Migration runner ---

/**
 * Runs all pending migrations on a project object, mutating it in place.
 * Sets schemaVersion to CURRENT_SCHEMA_VERSION after all migrations complete.
 */
export function runMigrations(project: any): void {
  const fromVersion: number = typeof project.schemaVersion === 'number'
    ? project.schemaVersion
    : 0;

  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v++) {
    migrations[v](project);
  }

  project.schemaVersion = CURRENT_SCHEMA_VERSION;
}
