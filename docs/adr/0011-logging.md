# 0011 - Logging Strategy

## Status

Accepted

## Context

Mode A has no server logs. Browser console noise should not be required for
normal use.

## Decision

Keep production console output minimal. User-relevant operational details appear
in the activity log and optional debug overlay, not as console chatter.

## Consequences

Users can understand failures without opening devtools. Debug data remains
available when `?debug=1` is present.

## Alternatives Considered

Remote log collection was rejected because it would add privacy and operational
burden without v1 need.
