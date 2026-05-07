#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
JSON_OUT="$REPO_ROOT/user_lab/phase4/prototype_runs/local_fallback_${TIMESTAMP}.json"
REPORT_OUT="$REPO_ROOT/user_lab/phase4/reports/local_fallback_${TIMESTAMP}.md"

mkdir -p "$(dirname "$JSON_OUT")" "$(dirname "$REPORT_OUT")"

python3 "$SCRIPT_DIR/local_fallback_prototype.py" \
  --repo-root "$REPO_ROOT" \
  --json-out "$JSON_OUT" \
  --report-out "$REPORT_OUT" \
  "$@"

python3 -m json.tool "$JSON_OUT" >/dev/null

echo "Local fallback prototype run generated."
echo "JSON: $JSON_OUT"
echo "Report: $REPORT_OUT"
