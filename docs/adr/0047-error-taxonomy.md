# 0047 - Error Taxonomy

## Status

Accepted

## Context

Failures must be actionable.

## Decision

Every user-facing issue has severity, what, why, next step, and optional field.
Recoverable errors preserve the current record; fatal errors are reserved for
storage/runtime failures.

## Consequences

Tests can assert message quality, and exports explain low-confidence results.

## Alternatives Considered

Raw exception messages were rejected.
