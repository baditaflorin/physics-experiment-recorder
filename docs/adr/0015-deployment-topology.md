# 0015 - Deployment Topology

## Status

Accepted

## Context

Mode C deployment artifacts are unnecessary for a static app.

## Decision

Use GitHub Pages only. No Dockerfile, Compose stack, nginx config, Prometheus, or
server runbook is included.

## Consequences

Deployment is a static Pages publish. Operational docs live in `docs/deploy.md`.

## Alternatives Considered

Docker backend deployment was rejected because there is no runtime backend.
