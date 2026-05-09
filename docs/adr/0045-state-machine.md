# 0045 - State Taxonomy

## Status

Accepted

## Context

The app has loading, loaded, running, cancelled, and error states.

## Decision

Enumerate states in `docs/phase2-substance/states.md` and derive UI state from
record, busy flag, cancellation, and fatal errors.

## Consequences

Every reachable state has a label and an exit path.

## Alternatives Considered

Ad hoc booleans rendered directly in components were rejected.
