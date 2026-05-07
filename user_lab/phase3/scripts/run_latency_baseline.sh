#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
MODE="baseline"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)
      MODE="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

case "$MODE" in
  baseline)
    STEM="latency_baseline"
    ;;
  reliability)
    STEM="latency_reliability"
    ;;
  *)
    echo "Unsupported mode: $MODE" >&2
    exit 1
    ;;
esac

JSON_OUT="$REPO_ROOT/user_lab/phase3/benchmarks/${STEM}_${TIMESTAMP}.json"
REPORT_OUT="$REPO_ROOT/user_lab/phase3/reports/${STEM}_${TIMESTAMP}.md"

mkdir -p "$(dirname "$JSON_OUT")" "$(dirname "$REPORT_OUT")"

python3 "$SCRIPT_DIR/run_latency_baseline.py" \
  --mode "$MODE" \
  --repo-root "$REPO_ROOT" \
  --json-out "$JSON_OUT" \
  --report-out "$REPORT_OUT"

python3 -m json.tool "$JSON_OUT" >/dev/null

echo "Latency run generated."
echo "JSON: $JSON_OUT"
echo "Report: $REPORT_OUT"
