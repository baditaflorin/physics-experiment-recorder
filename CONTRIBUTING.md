# Contributing

Thanks for helping improve Physics Experiment Recorder.

## Local Setup

```sh
npm install
make install-hooks
make dev
```

## Checks

Run these before pushing:

```sh
make lint
make test
make build
make smoke
```

Commits use Conventional Commits, for example `feat: add csv inference`.

## Architecture

This is a Mode A static GitHub Pages app. Keep v1 changes browser-only unless an
ADR explicitly changes the deployment mode.
