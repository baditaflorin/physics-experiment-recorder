# 0005 - Client-Side Storage

## Status

Accepted

## Context

Users need their latest experiment state preserved without accounts or servers.

## Decision

Store experiment records, user corrections, and recent activity in IndexedDB via
`idb`. Use `localStorage` only for tiny preferences such as debug mode.

## Consequences

Large records do not block the main thread as much as localStorage would. State
is local to the device and browser profile.

## Alternatives Considered

Server sync was rejected as out of scope. OPFS was deferred because IndexedDB is
more widely understood and enough for v1 records.
