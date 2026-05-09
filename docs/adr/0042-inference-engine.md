# 0042 - Inference Engine

## Status

Accepted

## Context

The app should produce a useful first physics guess immediately after input.

## Decision

Infer experiment shape from dominant axis, monotonicity, direction changes, time
gaps, confidence distribution, and unit metadata. Keep the guess visible and
overridable.

## Consequences

Users correct the app instead of configuring from zero. Low confidence remains
visible.

## Alternatives Considered

Forcing a model choice before preview was rejected.
