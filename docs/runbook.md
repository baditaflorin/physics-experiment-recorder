# Runbook

This project has no runtime server.

## Local Debugging

```sh
npm install
make dev
```

Open:

http://localhost:5173/physics-experiment-recorder/

Use `?debug=1` to show the local debug overlay.

## Static Preview

```sh
make build
make pages-preview
```

Open:

http://127.0.0.1:4175/physics-experiment-recorder/

## Common Issues

- If Pyodide fitting fails, check network access to https://cdn.jsdelivr.net/.
- If video tracking returns few samples, use a larger printed marker, better
  lighting, lower sample rate, or less motion blur.
- If Pages shows stale assets, hard refresh once; the service worker then
  updates automatically.
