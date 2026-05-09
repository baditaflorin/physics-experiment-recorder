# 0044 - Confidence Model

## Status

Accepted

## Context

No silent wrongness is a Phase 2 bar.

## Decision

Every imported or tracked sample has confidence. Inference and fits aggregate
confidence into warnings. Exports carry confidence and issues.

## Consequences

Low-quality data can still be useful, but it is never presented as equally
trustworthy.

## Alternatives Considered

Dropping low-confidence samples automatically was rejected because students need
to see what happened.
