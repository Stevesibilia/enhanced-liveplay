## Context

The project type system (`app/types/project.ts`) defines all data structures. The `Project` interface is the root — serialized to JSON in the project folder. Schema versioning already exists via `schemaVersion` field with migration logic in `useProject.ts`. Audio files live in `media/` relative to project root; `.lpa` export zips the entire project folder.

## Goals / Non-Goals

**Goals:**
- Define a clean, extensible type for visual media items
- Integrate into existing project schema with proper versioning/migration
- Support images (jpg, png, gif, webp, svg) and PDFs
- User-organized folder structure within the media library
- Optional link from visual → audio cue (one-directional)
- Include visuals in .lpa export/import

**Non-Goals:**
- UI components (separate change)
- Player window display logic (separate change)
- Video support (future)
- Thumbnail generation (can use native file or deferred)

## Decisions

**1. Separate collection, not a BaseItem extension**

Visual media items live in `project.visualMedia[]`, not in the playlist `items[]` array. Visuals aren't "cues" — they have no playback timeline, no end behavior, no ducking. Extending BaseItem would force irrelevant fields and complicate playlist logic.

Alternative considered: Adding `type: 'visual'` to BaseItem. Rejected — too much coupling, playlist rendering would need to filter them out.

**2. Flat list with folder field (not nested tree)**

Each `VisualMediaItem` has an optional `folder` string. Folders are just tags, stored as `project.visualFolders: string[]`. No nested hierarchy — keeps data model simple, UI can display as tree later if needed.

Alternative: Nested folder objects with children arrays. Rejected — over-engineering for initial needs.

**3. Storage path convention**

Visual files stored at `media/visuals/<filename>` relative to project root. Keeps them separate from audio files in `media/`. Filenames get UUID prefix on import to avoid collisions (e.g., `a1b2c3d4_battle-map.jpg`).

**4. Linked cue is UUID reference**

`linkedCueUuid?: string` — nullable reference to an AudioItem's UUID. No bidirectional link. If the referenced cue is deleted, the link becomes stale (orphan cleanup on project load or lazy validation).

**5. Schema version bump**

Increment `schemaVersion`. Migration adds `visualMedia: []` and `visualFolders: []` to existing projects. Non-breaking — old data untouched.

## Risks / Trade-offs

- **Stale linkedCueUuid** → Mitigate with validation on project load (clear invalid refs, log warning)
- **Large images bloating .lpa exports** → Accept for now; could add compression or external storage later
- **No thumbnail cache** → First render may be slow for large image libraries; defer optimization to media-library-panel change
