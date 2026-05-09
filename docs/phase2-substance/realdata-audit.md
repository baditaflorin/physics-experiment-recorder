# Phase 2 Substance Real-Data Audit

## Fixture Walkthrough

| Fixture                                    | What v1 did                                                                    | What it should do                                                   | Failure mode                                                         | Manual work pushed to user              |
| ------------------------------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------- |
| 01 clean pendulum CSV                      | Imported and inferred pendulum.                                                | Keep high-confidence pendulum fit.                                  | None.                                                                | None.                                   |
| 02 semicolon decimal-comma cart            | Imported after delimiter sniffing.                                             | Treat comma decimals as numbers and infer cart.                     | None.                                                                | None.                                   |
| 03 falling in milliseconds and centimeters | V1 did not understand `time_ms` or `y_cm`.                                     | Convert ms to seconds and cm to meters.                             | Wrong-but-confident: unit columns looked like missing position/time. | Rename columns manually.                |
| 04 phone tracker pixels with weak samples  | Imported pixels with default scale, but weak frames were not prominent enough. | Keep the track, surface low-confidence samples, warn before export. | Silent-ish: low-confidence points could affect fit.                  | Inspect rows manually.                  |
| 05 truncated CSV row                       | Rows with missing coordinates were inconsistently explained.                   | Keep usable rows and explain incomplete rows.                       | Recoverable but vague.                                               | Hunt for the bad row manually.          |
| 06 empty CSV                               | Reported too few samples.                                                      | Say the file is empty and no fit can run.                           | Obvious recoverable failure.                                         | Load another file.                      |
| 07 BOM/CRLF tracker export                 | Imported after text normalization.                                             | Normalize BOM and CRLF automatically.                               | None.                                                                | None.                                   |
| 08 quoted notes with commas                | Imported, ignoring the note column.                                            | Preserve robust CSV parsing without confusing quoted commas.        | None.                                                                | None.                                   |
| 09 headerless tracker export               | V1 treated first numeric row as headers and lost the schema.                   | Infer `time,x,y,confidence` from numeric columns.                   | Wrong-but-confident: zero usable rows or strange fields.             | Add headers manually.                   |
| 10 time gap and outlier                    | V1 warned about gap but not the physical outlier.                              | Surface both gap and position outlier.                              | Silent wrongness risk.                                               | Plot and notice the bad point manually. |

## Top 5 Logic Gaps

1. Unit inference stops at meters and pixels; real tracker exports often use milliseconds, centimeters, or millimeters.
2. Headerless CSV files are common from simple trackers and spreadsheets, but v1 assumes headers.
3. Incomplete rows are recoverable, but v1 does not consistently tell the user which domain field is incomplete.
4. Outliers are not explicit enough; one bad marker jump can quietly bias acceleration or friction.
5. Boundary validation is too loose; exports are structured but not schema-validated before save/import paths trust them.

## Top 3 Intuition Failures

1. A column called `time_ms` feels obvious to a student, but v1 treats it as unknown.
2. A numeric CSV without headers looks like data to a human, but v1 treats the first row as field names.
3. A single wild point is visible in the plot, but v1 does not say whether the fit used it or why it matters.

## Top 3 Feels-Stupid Moments

1. The user has to rename `y_cm` to `y_m` instead of the app inferring the unit.
2. The user has to add headers to a four-column tracker export.
3. The user has to decide whether low-confidence or outlier samples are trustworthy without a domain warning.

## What Smart Means

- The app recognizes time and position units from common lab/export column names.
- The app turns a raw tracker CSV into a useful model guess without setup.
- The app marks weak, incomplete, gapped, or outlier samples before the fit looks authoritative.
- The export carries confidence, warnings, schema version, app version, commit, and parameters.
- Re-running the same fixture gives byte-identical scientific output.

## Phase 2 Substance Success Metrics

- At least 7 of 10 real-data fixtures complete import, inference, and fit without manual intervention.
- All 10 fixtures produce deterministic serialized records across two runs.
- Headerless, semicolon decimal-comma, BOM/CRLF, centimeter, millimeter, and millisecond variants are normalized.
- Every failed fixture has a domain error with what, why, and next step.
- Median fixture import plus JavaScript fit time stays below 300 ms; worst case stays below 1 s.

## Out Of Scope

- No backend, auth, sync, or architecture mode change.
- No new visual polish phase.
- No native mobile app.
- No certified metrology claims.
- No true AprilTag ID decoding in Phase 2; tracking remains center-of-marker geometry.
