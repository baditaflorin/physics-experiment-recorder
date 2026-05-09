# 0014 - Error Handling Conventions

## Status

Accepted

## Context

Bad experiment inputs should not become cryptic JavaScript errors or silent
wrong output.

## Decision

Represent user-facing failures as domain errors with `what`, `why`, `nextStep`,
and severity. Recoverable errors keep the experiment state intact. Low-confidence
inferences produce warnings and confidence metadata instead of confident output.

## Consequences

The UI can show actionable messages and exports can carry warnings. Tests assert
domain error contents for known bad fixtures.

## Alternatives Considered

Throwing raw exceptions to a global boundary was rejected because it does not
help students recover.
