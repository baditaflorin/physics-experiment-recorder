# 0004 - Static Data Contract

## Status

Accepted

## Context

Mode A has no shared backend data. It still needs stable local import/export
formats for experiments and fixtures.

## Decision

Use versioned JSON for full experiment records and RFC 4180-style CSV for point
tracks. The JSON schema version is `experiment-record/v1`. Exports include
source metadata, app version, commit, model parameters, calibration, warnings,
and per-point confidence.

## Consequences

Experiments can be archived, inspected, re-imported, and used in deterministic
tests. Breaking export changes require a schema version bump.

## Alternatives Considered

SQLite and Parquet were rejected for v1 because files are local and modest in
size; JSON and CSV are easier for classrooms.
