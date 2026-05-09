# Postmortem

## What Was Built

V1 is a static browser app that imports demo, CSV, or video input; tracks
high-contrast AprilTag-style square markers with OpenCV.js; converts detections
to position-vs-time samples; infers a first physics model; fits motion with
JavaScript or Pyodide/SciPy; plots results; stores local state; and exports CSV
or JSON.

## Mode Check

Mode A was correct. The app needs no auth, secrets, shared database, runtime API,
or server-side mutation. OpenCV.js and Pyodide are heavy, but lazy loading keeps
the public surface static.

## What Worked

The Pages deployment worked from `/docs`, the initial gzipped JS payload stayed
below 200 KB, and the happy-path demo is covered by Playwright.

## What Did Not

Building directly into `docs/` initially wiped ADR files. The build now cleans
only generated Pages files and preserves documentation.

## Accepted Tech Debt

AprilTag identity decoding is not implemented in v1. The tracker detects the
high-contrast square marker geometry and center, which is enough for motion data
but not tag-family ID validation.

## Next Improvements

1. Add real fixture videos and expected tracks.
2. Improve marker detection under blur, occlusion, and low light.
3. Add confidence-aware sample repair and outlier removal.
