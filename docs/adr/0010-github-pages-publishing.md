# 0010 - GitHub Pages Publishing

## Status

Accepted

## Context

The live Pages URL is a first-class deliverable. The app is static and can be
served directly from the repository.

## Decision

Publish from `main` branch `/docs`. Vite builds to `docs/`, uses
`/physics-experiment-recorder/` as the base path, emits hashed assets, and copies
`index.html` to `404.html` for SPA fallback. `docs/` is intentionally committed.

## Consequences

Every Pages deploy is a normal git diff. Rollback is a revert. The `.gitignore`
must ignore `dist/` but not `docs/`.

## Alternatives Considered

`gh-pages` branch was rejected because committing `docs/` on `main` keeps local
hooks and deploy artifacts visible together.
