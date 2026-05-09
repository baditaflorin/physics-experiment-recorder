# 0049 - Inspectability And Debug Surface

## Status

Accepted

## Context

Power users need to understand why the app guessed a model.

## Decision

Keep `?debug=1` for internal state, inferred model, confidence, issue counts,
and inference reasons.

## Consequences

Support and fixture debugging are possible without adding analytics.

## Alternatives Considered

Remote telemetry was rejected.
