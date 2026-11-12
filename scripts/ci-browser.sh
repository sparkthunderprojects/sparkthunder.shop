#!/usr/bin/env bash
# Starts the built demo site and runs the real-browser checks: accessibility (axe) and the buying journey. Run `npm run build` first.
set -euo pipefail
PORT="${1:-3490}"
SPARKTHUNDER_DEMO=1 npx next start -p "$PORT" >/tmp/browser-server.log 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null || true' EXIT
for i in $(seq 1 40); do curl -fs "http://127.0.0.1:$PORT/" >/dev/null 2>&1 && break; sleep 1; done
node scripts/a11y-test.mjs "$PORT"
node scripts/checkout-test.mjs "$PORT"
node scripts/seo-check.mjs "$PORT"
node scripts/perf-budget.mjs "$PORT"
node scripts/weight-test.mjs "$PORT"
node scripts/currency-test.mjs "$PORT"
node scripts/schedule-test.mjs "$PORT"
node scripts/customers-test.mjs "$PORT"
node scripts/orders-test.mjs "$PORT"
node scripts/analytics-test.mjs "$PORT"
node scripts/theme-test.mjs "$PORT"
node scripts/cache-check.mjs "$PORT"
