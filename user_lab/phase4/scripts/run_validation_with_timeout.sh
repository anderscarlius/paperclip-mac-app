#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
REPO_ROOT="$(CDPATH= cd -- "$SCRIPT_DIR/../../.." && pwd)"
TIMEOUT_SECONDS=180
COMMAND_SET="standard"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout)
      TIMEOUT_SECONDS="$2"
      shift 2
      ;;
    --commands)
      COMMAND_SET="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
done

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
JSON_OUT="$REPO_ROOT/user_lab/phase4/validation/validation_run_${TIMESTAMP}.json"
REPORT_OUT="$REPO_ROOT/user_lab/phase4/reports/validation_run_${TIMESTAMP}.md"

mkdir -p "$(dirname "$JSON_OUT")" "$(dirname "$REPORT_OUT")"

python3 - "$REPO_ROOT" "$JSON_OUT" "$REPORT_OUT" "$TIMEOUT_SECONDS" "$COMMAND_SET" <<'PY'
from __future__ import annotations

import json
import os
import signal
import shlex
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def tail_text(text: str, max_lines: int = 100) -> str:
    lines = text.splitlines()
    return "\n".join(lines[-max_lines:])


def classify(exit_code: int | None, timed_out: bool) -> str:
    if timed_out:
        return "timed_out"
    if exit_code == 0:
        return "passed"
    return "failed"


def resolve_command(base_command: str) -> str | None:
    probe = subprocess.run(
        ["/bin/bash", "-lc", f"command -v {shlex.quote(base_command)}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    value = probe.stdout.strip()
    return value or None


def first_relevant_error(stdout_text: str, stderr_text: str) -> str | None:
    for source in (stderr_text, stdout_text):
        for line in source.splitlines():
            stripped = line.strip()
            lowered = stripped.lower()
            if not stripped:
                continue
            if lowered.startswith("warning:"):
                continue
            return stripped
    return None


def recommendation_for_result(item: dict[str, Any]) -> str:
    if item.get("classification") == "timed_out":
        return "Timed out. Prefer a narrower validation set or investigate why the command stays silent."
    if item.get("baseCommandAvailable") is False:
        return "Base command was not available in the non-interactive shell PATH. Fix PATH or use an absolute binary path."
    first_error = str(item.get("firstRelevantError") or "")
    if "ModuleCache" in first_error or "Operation not permitted" in first_error:
        return "Failure looks environment- or sandbox-related rather than a local fallback regression."
    if item.get("classification") == "passed":
        return "Passed."
    return "Failed. Review the captured error tail."


def run_command(repo_root: Path, command: str, timeout_seconds: int) -> dict[str, Any]:
    start_wall = iso_now()
    start_monotonic = time.monotonic()
    parts = shlex.split(command)
    base_command = parts[0] if parts else command
    resolved_path = resolve_command(base_command)
    base_available = resolved_path is not None
    print(f"[validation] start: {command}", flush=True)
    if not base_available:
        end_wall = iso_now()
        duration_ms = int((time.monotonic() - start_monotonic) * 1000)
        result = {
            "command": command,
            "cwd": str(repo_root),
            "runnerShell": "/bin/bash -lc",
            "baseCommand": base_command,
            "baseCommandAvailable": False,
            "baseCommandPath": None,
            "startTime": start_wall,
            "endTime": end_wall,
            "durationMs": duration_ms,
            "exitCode": 127,
            "timedOut": False,
            "classification": "failed",
            "stdoutTail": "",
            "stderrTail": f"{base_command}: command not found",
            "firstRelevantError": f"{base_command}: command not found",
        }
        result["recommendation"] = recommendation_for_result(result)
        print(f"[validation] end: {command} -> failed (command not found)", flush=True)
        return result

    process = subprocess.Popen(
        ["/bin/bash", "-lc", command],
        cwd=str(repo_root),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        start_new_session=True,
    )

    timed_out = False
    stdout_text = ""
    stderr_text = ""
    exit_code: int | None = None
    try:
        stdout_text, stderr_text = process.communicate(timeout=timeout_seconds)
        exit_code = process.returncode
    except subprocess.TimeoutExpired:
        timed_out = True
        try:
            os.killpg(process.pid, signal.SIGTERM)
        except ProcessLookupError:
            pass
        try:
            stdout_text, stderr_text = process.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            try:
                os.killpg(process.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            stdout_text, stderr_text = process.communicate()
        exit_code = process.returncode

    end_wall = iso_now()
    duration_ms = int((time.monotonic() - start_monotonic) * 1000)
    stdout_tail = tail_text(stdout_text)
    stderr_tail = tail_text(stderr_text)
    result = {
        "command": command,
        "cwd": str(repo_root),
        "runnerShell": "/bin/bash -lc",
        "baseCommand": base_command,
        "baseCommandAvailable": base_available,
        "baseCommandPath": resolved_path,
        "startTime": start_wall,
        "endTime": end_wall,
        "durationMs": duration_ms,
        "exitCode": exit_code,
        "timedOut": timed_out,
        "classification": classify(exit_code, timed_out),
        "stdoutTail": stdout_tail,
        "stderrTail": stderr_tail,
        "firstRelevantError": first_relevant_error(stdout_text, stderr_text),
    }
    result["recommendation"] = recommendation_for_result(result)
    print(f"[validation] end: {command} -> {result['classification']}", flush=True)
    return result


def command_list(command_set: str) -> list[str]:
    if command_set == "minimal":
        return [
            "swift build",
            "bash user_lab/phase4/scripts/local_fallback_prototype.sh --demo",
            "bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo",
        ]
    if command_set == "standard":
        return [
            "swift build",
            "pnpm --filter @paperclipai/server typecheck",
            "pnpm --filter @paperclipai/ui typecheck",
        ]
    if command_set == "full":
        return [
            "swift build",
            "pnpm --filter @paperclipai/server typecheck",
            "pnpm --filter @paperclipai/ui typecheck",
        ]
    raise SystemExit(f"Unknown command set: {command_set}")


def build_report(payload: dict[str, Any]) -> str:
    lines = [
        "# Validation Run",
        "",
        "## Summary",
        "",
        f"- Command set: `{payload['commandSet']}`",
        f"- Working directory: `{payload['cwd']}`",
        f"- Runner shell: `{payload['runnerShell']}`",
        f"- Timeout per command: `{payload['timeoutSeconds']} seconds`",
        f"- Commands run: `{len(payload['commands'])}`",
        f"- Passed: `{sum(1 for item in payload['commands'] if item['classification'] == 'passed')}`",
        f"- Failed: `{sum(1 for item in payload['commands'] if item['classification'] == 'failed')}`",
        f"- Timed out: `{sum(1 for item in payload['commands'] if item['classification'] == 'timed_out')}`",
        "",
        "## Results",
        "",
        "| Command | Classification | Duration | Exit | Timeout |",
        "|---|---|---:|---:|---|",
    ]
    for item in payload["commands"]:
        lines.append(
            f"| `{item['command']}` | `{item['classification']}` | `{item['durationMs']} ms` | `{item['exitCode']}` | `{item['timedOut']}` |"
        )
    lines.extend(
        [
            "",
            "## Output Tails",
            "",
        ]
    )
    for item in payload["commands"]:
        lines.extend(
            [
                f"### `{item['command']}`",
                "",
                f"- Classification: `{item['classification']}`",
                f"- Timeout: `{item['timedOut']}`",
                f"- Base command available: `{item['baseCommandAvailable']}`",
                f"- Base command path: `{item['baseCommandPath']}`",
                f"- First relevant error: `{item.get('firstRelevantError')}`",
                f"- Recommendation: {item['recommendation']}",
                "",
                "#### Stdout Tail",
                "",
                "```text",
                item["stdoutTail"] or "(no stdout)",
                "```",
                "",
                "#### Stderr Tail",
                "",
                "```text",
                item["stderrTail"] or "(no stderr)",
                "```",
                "",
            ]
        )
    return "\n".join(lines)


def main() -> int:
    repo_root = Path(sys.argv[1]).resolve()
    json_out = Path(sys.argv[2]).resolve()
    report_out = Path(sys.argv[3]).resolve()
    timeout_seconds = int(sys.argv[4])
    command_set = sys.argv[5]

    commands = command_list(command_set)
    results = [run_command(repo_root, command, timeout_seconds) for command in commands]
    payload = {
        "schemaVersion": 1,
        "generatedAt": iso_now(),
        "cwd": str(repo_root),
        "runnerShell": "/bin/bash -lc",
        "commandSet": command_set,
        "timeoutSeconds": timeout_seconds,
        "commands": results,
    }
    json_out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_out.write_text(build_report(payload) + "\n", encoding="utf-8")
    print("Validation: OK")
    print(f"JSON written: {json_out}")
    print(f"Report written: {report_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
PY

python3 -m json.tool "$JSON_OUT" >/dev/null

echo "Validation run generated."
echo "JSON: $JSON_OUT"
echo "Report: $REPORT_OUT"
