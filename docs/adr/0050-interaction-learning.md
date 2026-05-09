# 0050 - Interaction Learning

## Status

Accepted

## Context

If a user overrides the model once, similar tracks should not force the same
manual correction repeatedly.

## Decision

Remember the latest model choice within the session and keep it transparent in
the model selector. Do not persist opaque behavioral learning across devices.

## Consequences

The app feels less repetitive without surprising the user.

## Alternatives Considered

Hidden long-term personalization was rejected.
