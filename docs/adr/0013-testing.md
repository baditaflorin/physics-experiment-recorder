# 0013 - Testing Strategy

## Status

Accepted

## Context

The critical risks are deterministic physics math, robust imports, UI flow, and
static deployment correctness.

## Decision

Use Vitest for domain and component tests, Playwright for one happy-path smoke
test, and fixture tests for real-data substance work. `make test`, `make build`,
and `make smoke` are the pre-push gate.

## Consequences

Core logic remains fast to test. Browser-only video APIs are covered by smoke and
fixture-adjacent tests rather than exhaustive media automation.

## Alternatives Considered

GitHub Actions were rejected because the prompt requires local hooks instead.
