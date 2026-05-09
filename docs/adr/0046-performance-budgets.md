# 0046 - Performance Budgets

## Status

Accepted

## Context

Fixture import and fitting should feel immediate for classroom-size tracks.

## Decision

Target median CSV import plus JavaScript fit below 300 ms and worst fixture below
1 s. Video work stays in the OpenCV worker with progress and cancellation.

## Consequences

Performance claims are measured in `docs/perf/phase2-fixtures.md`.

## Alternatives Considered

Optimizing visual polish before measuring fixture behavior was rejected.
