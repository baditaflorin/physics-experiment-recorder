#!/usr/bin/env bash
set -euo pipefail

if [[ "${SKIP_SMOKE_BUILD:-0}" != "1" ]]; then
  npm run build
fi
node scripts/static-server.mjs docs 4175 > /tmp/physics-recorder-smoke.log 2>&1 &
server_pid=$!
trap 'kill "$server_pid" >/dev/null 2>&1 || true' EXIT

for _ in {1..30}; do
  if curl -fsS http://127.0.0.1:4175/physics-experiment-recorder/ >/dev/null; then
    break
  fi
  sleep 0.2
done

npx playwright test --config playwright.config.ts
