#!/usr/bin/env bash
# Stop the jds-viz server.

PID_FILE="/tmp/jds-viz.pid"

[[ -f "$PID_FILE" ]] || { echo "not running"; exit 0; }

kill "$(cat "$PID_FILE")" 2>/dev/null || true
rm -f "$PID_FILE" "/tmp/jds-viz.log"
echo "stopped"
