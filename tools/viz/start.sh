#!/usr/bin/env bash
# Start the jds-viz server in the background.
# Idempotent: does nothing if already running.
# Prints the URL line on success.
#
# Usage: viz/start.sh [--port N] [--db PATH]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="/tmp/jds-viz.log"
PID_FILE="/tmp/jds-viz.pid"

# Return early if already running
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  grep "localhost" "$LOG_FILE" | tail -1
  exit 0
fi

rm -f "$PID_FILE" "$LOG_FILE"

nohup node "${SCRIPT_DIR}/dist/server.js" "$@" > "$LOG_FILE" 2>&1 &
disown $! 2>/dev/null || true

# Wait for the URL line (up to 5 seconds)
for i in {1..50}; do
  grep -q "localhost" "$LOG_FILE" 2>/dev/null && { grep "localhost" "$LOG_FILE" | tail -1; exit 0; }
  sleep 0.1
done

echo "Error: viz server did not start — check $LOG_FILE" >&2
exit 1
