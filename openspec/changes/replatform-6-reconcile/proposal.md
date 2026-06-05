## Why

Some features exist in BOTH forks because each implemented them independently after the split (MIDI, cart hotkeys), and some fork concerns now overlap with server-owned behavior (project schema migrations vs the server's `ProjectState::load` + `BackupManager`). Plus a framework-version mismatch: this fork migrated to Nuxt 4 / Electron 42 while upstream did its own runtime migration. These must be reconciled deliberately — keep the better implementation, avoid duplication, and pick one runtime version.

## What Changes

- **MIDI**: diff fork `useMidiController` + `MidiConfigModal` against upstream `useMidiController`; keep the superior mapping/UX; ensure commands target server transport.
- **Cart hotkeys**: reconcile fork `useCartHotkeys` with upstream's; single implementation.
- **Schema/migrations**: diff fork `utils/migrations.ts` against the server's C++ load-time migration + `RepairInfo`; port only cases the server lacks (likely into the server or as pre-load client checks), otherwise drop the JS migrations.
- **Framework version**: decide Nuxt 3 (upstream) vs re-applying the fork's Nuxt 4 / Electron 42 migration; apply consistently across the client.

## Capabilities

### New Capabilities

- `feature-reconciliation`: the rules and outcomes for merging duplicated/overlapping features and selecting the runtime version.

### Modified Capabilities

_(touches fork specs `midi-mapping`, `cart-hotkeys`, `project-schema-versioning`, `nuxt-4-compat`, `electron-42-compat`)_

## Impact

- Single MIDI + single cart-hotkeys implementation on the client.
- Schema migration responsibility clarified (server-owned where possible).
- One chosen runtime version applied across `client/`.
- Depends on: `replatform-1-foundation`; best done after `replatform-3-ui-ports`.
