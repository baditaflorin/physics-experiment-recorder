# 0009 - Configuration And Secrets

## Status

Accepted

## Context

Mode A must not put secrets in the frontend. GitHub Pages provides only static
assets.

## Decision

Use build-time constants for app version, commit, and base path. Do not require
API keys, passwords, tokens, or secret runtime config. Keep `.env.example` as a
placeholder document only.

## Consequences

No secrets are committed or shipped. Users can inspect all deployed code.

## Alternatives Considered

BYO-key flows and server-side secrets were rejected as unnecessary for v1.
