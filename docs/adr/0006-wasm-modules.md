# 0006 - WASM Modules

## Status

Accepted

## Context

Motion extraction and curve fitting need mature scientific libraries in a static
browser app.

## Decision

Use OpenCV.js for image processing and Pyodide for Python scientific fitting.
Pyodide loads SciPy and matplotlib only when the user runs a fit. OpenCV.js runs
inside a Web Worker during video analysis.

## Consequences

The initial app remains light. First analysis and first SciPy fit have visible
loading costs. GitHub Pages headers are sufficient because the app does not rely
on SharedArrayBuffer-only paths.

## Alternatives Considered

Custom computer vision and custom nonlinear fitting were rejected because proven
libraries exist. A server-side Python API was rejected because Mode A is feasible.
