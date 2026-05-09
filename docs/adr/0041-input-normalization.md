# 0041 - Input Robustness And Normalization

## Status

Accepted

## Context

Real CSV exports vary by delimiter, encoding, line endings, headers, and units.

## Decision

Normalize BOM, CRLF, NBSP, smart quotes, decimal commas, semicolon/tab delimiters,
headerless numeric rows, milliseconds, centimeters, millimeters, meters, and
pixels at the import boundary.

## Consequences

Fixture imports become deterministic and recoverable. Parser failures are domain
issues instead of raw exceptions.

## Alternatives Considered

Asking users to clean spreadsheets manually was rejected.
