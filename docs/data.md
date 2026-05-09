# Data Contract

Mode A has no shared static data pipeline.

## CSV Track

CSV imports recognize these columns:

- `t`, `time`, `seconds`, `sec`, `timestamp`
- `x`, `x_m`, `x_meters`, `position_m`, `position`
- `y`, `y_m`, `y_meters`, `height_m`
- `x_px`, `x_pixel`, `x_pixels`, `center_x`, `cx`
- `y_px`, `y_pixel`, `y_pixels`, `center_y`, `cy`
- `confidence`, `score`, `quality`

The parser normalizes UTF-8 BOM, CRLF, NBSP, smart quotes, decimal commas, and
semicolon/tab delimiters.

It also infers:

- `time_ms`, `timestamp_ms`, `milliseconds` as seconds
- `x_cm`, `y_cm`, `x_mm`, `y_mm` as meters
- headerless four-column tracks as `time,x,y,confidence`

## JSON Experiment Record

Schema version: `experiment-record/v1`

Records include app version, commit, source checksum, calibration, points,
inference, fit results, issues, and activity.
