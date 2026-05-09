# Architecture

Physics Experiment Recorder is a Mode A static GitHub Pages app.

```mermaid
C4Context
  title Physics Experiment Recorder context
  Person(student, "Student or educator")
  System_Boundary(pages, "GitHub Pages static site") {
    System(app, "Browser app", "React, TypeScript, Vite")
    SystemDb(indexeddb, "IndexedDB", "Local experiment records")
    System(worker, "OpenCV worker", "Marker tracking")
    System(pyodide, "Pyodide runtime", "SciPy and matplotlib fitting")
  }
  System_Ext(github, "GitHub repository", "Source, issues, stars")
  System_Ext(paypal, "PayPal", "Optional support link")
  Rel(student, app, "Uploads video or CSV")
  Rel(app, worker, "Sends sampled frames")
  Rel(app, pyodide, "Runs scientific fit on demand")
  Rel(app, indexeddb, "Saves local state")
  Rel(app, github, "Links to repository")
  Rel(app, paypal, "Links to support")
```

```mermaid
flowchart LR
  video["Video or CSV input"] --> normalize["Input normalization"]
  normalize --> track["OpenCV marker tracking"]
  normalize --> csv["CSV track parser"]
  track --> points["Position-vs-time points"]
  csv --> points
  points --> infer["Domain inference"]
  infer --> fit["JavaScript or SciPy fit"]
  fit --> export["CSV and JSON exports"]
  points --> storage["IndexedDB"]
  fit --> storage
```

The GitHub Pages boundary is explicit: no runtime server, database, auth service,
or secret-bearing API is called by the app.
