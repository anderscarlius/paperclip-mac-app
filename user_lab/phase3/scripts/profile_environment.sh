#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
JSON_OUT="$REPO_ROOT/user_lab/phase3/profiles/environment_profile_${TIMESTAMP}.json"
REPORT_OUT="$REPO_ROOT/user_lab/phase3/reports/environment_baseline_${TIMESTAMP}.md"

mkdir -p "$(dirname "$JSON_OUT")" "$(dirname "$REPORT_OUT")"

python3 "$SCRIPT_DIR/profile_environment.py" \
  --repo-root "$REPO_ROOT" \
  --json-out "$JSON_OUT" \
  --report-out "$REPORT_OUT"

python3 -m json.tool "$JSON_OUT" >/dev/null

echo "Environment profile generated."
echo "JSON: $JSON_OUT"
echo "Report: $REPORT_OUT"
