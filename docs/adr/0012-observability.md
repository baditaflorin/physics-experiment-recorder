# 0012 - Metrics And Observability

## Status

Accepted

## Context

The app is static and handles student/user files locally.

## Decision

Ship no analytics by default. Collect only local performance marks, warnings,
and activity history inside the current browser session and export records.

## Consequences

There is no PII collection and no external analytics dependency. Product insight
comes from explicit user-shared exports and local fixture tests.

## Alternatives Considered

Plausible and beacon analytics were considered but rejected for v1 privacy and
simplicity.
