## Context

After the split both forks added MIDI (`useMidiController` present on each side) and both maintain cart hotkeys (`useCartHotkeys`). The fork owns `.liveplay` schema migrations in `utils/migrations.ts`; upstream moved project handling into the C++ server, whose `ProjectState::load` accepts 1.x files, upgrades to a v2 routing schema, and records `RepairInfo` for corrupt projects. The fork is on Nuxt 4 / Electron 42; upstream did its own Nuxt/Electron migration (Nuxt 3 baseline per upstream README).

## Goals / Non-Goals

**Goals:**

- Exactly one implementation per duplicated feature.
- Clear ownership of schema migration (prefer server).
- One runtime version, applied consistently.

**Non-Goals:**

- New MIDI/hotkey features (reconciliation only).
- Re-architecting the server's migration logic beyond gap-filling.

## Decisions

1. **Keep the better duplicate, delete the other** — compare on mapping flexibility, tests, and server-command targeting; document the choice per feature.
2. **Server owns migrations where possible** — for cases the C++ loader already handles, drop the JS equivalents. For fork-specific cases (e.g., visual fields), Phase 4's sidecar migration covers them; any remaining audio-schema gaps are filled server-side or as a pre-load client check.
3. **Runtime version decided once** — evaluate effort of re-applying Nuxt 4 / Electron 42 onto upstream client vs staying on upstream's baseline; choose and apply across the whole client to avoid mixed-version breakage.
4. **MIDI/hotkey commands target the server** — any transport action issues REST/WS commands, not Howler calls.

## Risks / Trade-offs

- [Subtle behavioral differences between duplicate impls] → write/port tests before deleting either side.
- [Migration gaps cause silent data issues] → enumerate fork migration cases explicitly; verify each is covered by server or sidecar.
- [Framework re-migration cost] → if re-applying Nuxt 4 is heavy, staying on upstream's baseline may be the pragmatic call.
