# 0001 - Deployment Mode

## Status

Accepted

## Context

The app records or uploads experiment video, detects a tagged object, extracts
position-vs-time data, fits physics models, and exports local artifacts. V1 does
not require accounts, shared writes, private APIs, or server-held secrets.

## Decision

Use Mode A: Pure GitHub Pages. The app is a static Vite/React build served from
`main` branch `/docs`. Video processing, storage, fitting, plotting, and export
run in the browser using Web APIs, Web Workers, OpenCV.js, Pyodide, SciPy, and
matplotlib.

## Consequences

The public deployment surface is static and cheap to host. Heavy WASM modules
must be lazy-loaded, and all persistence is device-local. GitHub Pages cannot set
COOP/COEP headers, so Pyodide and OpenCV usage must avoid requiring shared array
buffer isolation.

## Alternatives Considered

Mode B was unnecessary because there is no shared static data pipeline. Mode C
was rejected because no runtime API, auth, database, or secret is needed.
