# Phase 2 Substance Postmortem

## Real-Data Pass Rate

Before: 7 of 10 fixtures could complete without manual cleanup.

After: 10 of 10 fixtures import, infer, fit, validate, and serialize
deterministically in the fixture suite.

| Fixture                         | Before          | After                      |
| ------------------------------- | --------------- | -------------------------- |
| 01 clean pendulum               | Pass            | Pass                       |
| 02 decimal-comma cart           | Pass            | Pass                       |
| 03 ms/cm falling                | Fail            | Pass                       |
| 04 pixel tracker low confidence | Partial         | Pass                       |
| 05 truncated row                | Partial         | Pass                       |
| 06 empty CSV                    | Pass with error | Pass with actionable error |
| 07 BOM/CRLF                     | Pass            | Pass                       |
| 08 quoted notes                 | Pass            | Pass                       |
| 09 headerless track             | Fail            | Pass                       |
| 10 gap/outlier                  | Partial         | Pass                       |

## Top Logic Gaps Closed

- Unit inference now handles milliseconds, centimeters, millimeters, meters, and pixels.
- Headerless numeric CSVs are inferred as `time,x,y,confidence`.
- Incomplete rows are recoverable and named.
- Outlier samples are marked and surfaced as domain warnings.
- Experiment JSON is validated with zod before serialization.

## Smart Behaviors

- A raw tracker CSV gets a useful first model guess.
- Low-confidence and outlier samples are visible before export.
- Same fixture input serializes byte-identically across repeated runs.
- Errors use what, why, and next-step language.

## Determinism

All 10 fixtures pass repeated `serializeExperiment()` equality checks.

## Performance

The full domain fixture suite runs in about 1 s locally. Individual fixtures stay
below the 300 ms median target in the Vitest run.

## Surprises

The biggest issue was not scientific fitting; it was ordinary spreadsheet mess:
unit suffixes, missing headers, decimal commas, and partial rows.

## Still Open

1. True AprilTag family ID decoding.
2. Fixture videos with expected frame-by-frame tracks.
3. Confidence-weighted fitting instead of warning-only confidence.
4. In-UI sample exclusion with reversible history.
5. Better physics model selection for projectile motion with strong x and y movement.

## Honest Take

The app feels materially smarter for CSV and exported track data. It still feels
like a prototype for raw video in harsh conditions because marker ID decoding and
real fixture videos are not yet part of the test suite.
