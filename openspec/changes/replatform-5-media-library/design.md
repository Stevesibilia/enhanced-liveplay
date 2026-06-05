## Context

Upstream exposes file operations via REST (verified routes): `/api/fs/list`, `/api/fs/mkdir`, `/api/upload`, `/api/copy_to_media`, `/api/metadata`, plus `/api/file/download`. It also ships `ServerFileBrowser` and `ServerFilePickerModal` components. The server resolves media via a relative `mediaPath` (relative to the project folder) with an absolute `mediaServerPath` fallback that is dropped on save (`relativize_media_paths`), keeping projects portable.

## Goals / Non-Goals

**Goals:**

- Media library browse/import/organize works against the server.
- Media references stay portable (relative paths) for the shared-folder workflow.
- Reuse upstream file-picker components instead of duplicating.

**Non-Goals:**

- New media types beyond what the fork already supports.
- Visual media management (owned by Phase 4 sidecar).

## Decisions

1. **Server endpoints, not IPC** — all file access goes through `/api/fs/*`, `/api/upload`, `/api/copy_to_media`. Works regardless of topology.
2. **Reuse `ServerFileBrowser`/`ServerFilePickerModal`** — wrap or compose them in the media library rather than porting the old picker.
3. **Relative `mediaPath`** — rely on the server's relativize-on-save; the panel displays/imports using relative references.
4. **Metadata via `/api/metadata`** — use server TagLib metadata instead of renderer-side probing.

## Risks / Trade-offs

- [Old panel assumed synchronous IPC fs] → adapt to async REST; add loading states.
- [Overlap with upstream file UI] → reconcile UX to avoid two competing browsers.
- [Large media import performance] → use `/api/upload` streaming + progress (upstream `AudioLoadProgress`).
