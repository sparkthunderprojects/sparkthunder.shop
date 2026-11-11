#!/usr/bin/env bash
# Starts the built site with 100 demo stores and checks that no store can see another's data. Used by CI; run `npm run build` first.
set -euo pipefail
PORT="${1:-3460}"
SPARKTHUNDER_DEMO=1 SPARKTHUNDER_DEMO_STORES=100 npx next start -p "$PORT" >/tmp/isolation-server.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for i in $(seq 1 40); do curl -fs "http://127.0.0.1:$PORT/" -H "Host: s1.localhost:$PORT" >/dev/null 2>&1 && break; sleep 1; done
node scripts/isolation-test.mjs "$PORT" 100
