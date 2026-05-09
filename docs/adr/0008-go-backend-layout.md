# 0008 - Go Backend Layout

## Status

Accepted

## Context

The bootstrap prompt defines Go backend requirements for Modes B and C.

## Decision

Skip Go backend layout in Mode A. There is no `cmd/`, `internal/`, runtime API,
or data-generation backend.

## Consequences

The repository stays frontend-only. If a future phase requires Mode B or C, a new
ADR must justify the mode change first.

## Alternatives Considered

Adding placeholder Go directories was rejected because empty backend scaffolding
would imply a server that does not exist.
