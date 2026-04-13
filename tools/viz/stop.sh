#!/usr/bin/env bash
# Stop a jds-viz server. Pass --db PATH to stop a specific session's server,
# or --all to stop every running instance.
#
# Usage: viz/stop.sh --db PATH
#        viz/stop.sh --all

stop_one() {
  local pid_file="$1"
  local log_file="${pid_file%.pid}.log"
  [[ -f "$pid_file" ]] || return 0
  kill "$(cat "$pid_file")" 2>/dev/null || true
  rm -f "$pid_file" "$log_file"
}

if [[ "${1:-}" == "--all" ]]; then
  for pf in /tmp/jds-viz-*.pid; do
    [[ -f "$pf" ]] && stop_one "$pf"
  done
  echo "stopped all"
  exit 0
fi

# Derive session key from --db arg
REQUESTED_DB=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --db) REQUESTED_DB="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [[ -n "$REQUESTED_DB" ]]; then
  SESSION_KEY="$(basename "$(dirname "$REQUESTED_DB")")"
else
  SESSION_KEY="default"
fi

PID_FILE="/tmp/jds-viz-${SESSION_KEY}.pid"
[[ -f "$PID_FILE" ]] || { echo "not running"; exit 0; }
stop_one "$PID_FILE"
echo "stopped"
