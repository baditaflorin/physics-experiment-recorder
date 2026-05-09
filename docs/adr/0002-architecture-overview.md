# 0002 - Architecture Overview

## Status

Accepted

## Context

The app needs a simple, auditable boundary between UI, motion extraction, model
fitting, exports, and local persistence.

## Decision

Use feature-first frontend modules under `src/features/`, shared domain logic
under `src/domain/`, browser workers under `src/workers/`, and browser services
under `src/services/`. The UI owns orchestration; workers own expensive frame
analysis; domain modules stay deterministic and testable.

## Consequences

Core physics and inference logic can be tested without a browser. Worker code is
isolated from React state. No backend or runtime API modules exist.

## Alternatives Considered

A single-page script was rejected because it would make fitting, provenance, and
Phase 2 robustness difficult to test.
