#!/usr/bin/env bash
# Poll backend health endpoint until it responds 200 or timeout.
set -euo pipefail
URL="${1:-http://localhost:4000/api/health/live}"
TRIES="${2:-30}"
for i in $(seq 1 "$TRIES"); do
  if curl -sf "$URL" > /dev/null; then
    echo "Healthy after ${i} attempt(s)"
    exit 0
  fi
  sleep 2
done
echo "Timed out waiting for $URL"
exit 1
