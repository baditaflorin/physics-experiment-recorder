# 0017 - Dependency Policy

## Status

Accepted

## Context

The app depends on scientific and frontend libraries that affect correctness.

## Decision

Use production-ready dependencies with active package distribution and lock them
through `package-lock.json`. Prefer proven libraries for vision, fitting, worker
messaging, validation, and storage. Run `npm audit` before release and avoid
high/critical vulnerabilities.

## Consequences

Dependency updates are deliberate and reviewable. Custom implementations are
limited to product-specific inference and physics glue.

## Alternatives Considered

Vendoring scientific code or custom fitting was rejected as fragile.
