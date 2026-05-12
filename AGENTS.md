# E-LivePlay — Agent Instructions

## Repository

| | |
|---|---|
| **Upstream (origin)** | `git@github.com:tdoukinitsas/liveplay.git` — forked from, **do not push here** |
| **Fork (fork)** | `git@github.com:Stevesibilia/liveplay.git` → GitHub: `Stevesibilia/enhanced-liveplay` |
| **Default working branch** | `dev` |

The upstream (`origin`) is not kept up to date and should be treated as read-only. All pushes and PRs go to the fork (`fork` remote / `Stevesibilia/enhanced-liveplay`).

## Branch & PR workflow

For every change:

1. **Branch from `dev`** on the fork — never work directly on `dev`
   ```bash
   git fetch fork
   git checkout -b <branch-name> fork/dev
   ```
2. **Commit** changes on the new branch
3. **Push to fork** (not upstream)
   ```bash
   git push fork <branch-name>
   ```
4. **Open a PR** against `dev` on `Stevesibilia/enhanced-liveplay`
   ```bash
   gh pr create --repo Stevesibilia/enhanced-liveplay --base dev --head <branch-name>
   ```

Typical branch naming: `feat/<name>`, `fix/<name>`, `release/v<version>`, `chore/<name>`.

## Release workflow

Releases are **fully automated** via `.github/workflows/build-release.yml`.

The workflow triggers on any push to `dev` that modifies `package.json`. It:
1. Detects the version bump
2. Builds on Windows, Linux, and macOS in parallel
3. Creates and publishes the GitHub release with all binaries attached

To cut a release:
1. Create a `release/v<X.Y.Z>` branch from `dev`
2. Bump `"version"` in `package.json`
3. Commit, push to fork, open a PR against `dev`
4. Merge — CI handles the rest

Do **not** create GitHub releases manually.
