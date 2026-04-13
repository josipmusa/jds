#!/usr/bin/env bash
# Start the jds-viz server in the background.
# Supports multiple concurrent sessions — each gets its own server and port.
# Idempotent: does nothing if already running for the same session.
# Prints the URL line on success.
#
# Usage: viz/start.sh --db PATH [--port N]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Extract --db value from args to derive per-session file names
REQUESTED_DB=""
EXTRA_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db) REQUESTED_DB="$2"; EXTRA_ARGS+=(--db "$2"); shift 2 ;;
    *) EXTRA_ARGS+=("$1"); shift ;;
  esac
done

# Derive a session key from the DB path (the session UUID directory name)
if [[ -n "$REQUESTED_DB" ]]; then
  SESSION_KEY="$(basename "$(dirname "$REQUESTED_DB")")"
else
  SESSION_KEY="default"
fi

PID_FILE="/tmp/jds-viz-${SESSION_KEY}.pid"
LOG_FILE="/tmp/jds-viz-${SESSION_KEY}.log"

# Return early if already running for this session
if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  grep "localhost" "$LOG_FILE" | tail -1
  exit 0
fi

rm -f "$PID_FILE" "$LOG_FILE"

nohup node "${SCRIPT_DIR}/dist/server.js" "${EXTRA_ARGS[@]}" > "$LOG_FILE" 2>&1 &
disown $! 2>/dev/null || true

# Wait for the URL line (up to 5 seconds)
for i in {1..50}; do
  grep -q "localhost" "$LOG_FILE" 2>/dev/null && { grep "localhost" "$LOG_FILE" | tail -1; exit 0; }
  sleep 0.1
done

echo "Error: viz server did not start — check $LOG_FILE" >&2
exit 1
