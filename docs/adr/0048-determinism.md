# 0048 - Determinism And Reproducibility

## Status

Accepted

## Context

Same fixture input should produce byte-identical export output.

## Decision

Use stable IDs from content, deterministic sorting, rounded numeric output,
schema validation, and fixed fixture timestamps.

## Consequences

Fixture tests can compare repeated serializations and detect accidental
nondeterminism.

## Alternatives Considered

Using fresh random IDs and export timestamps was rejected.
