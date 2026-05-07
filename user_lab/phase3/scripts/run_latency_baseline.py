#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import math
import os
import re
import shutil
import statistics
import subprocess
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


CONTROLLED_PROMPT = """Please inspect the repository root and report:
1. current working directory
2. whether package files exist
3. whether runtime context is visible
Do not modify files."""
PERCENT_ENCODING_RE = re.compile(r"%[0-9A-Fa-f]{2}")
PRINTABLE_ASCII_RE = re.compile(r"^[\x20-\x7E]+$")
NON_ASCII_RE = re.compile(r"[^\x00-\x7F]")
SPACES_RE = re.compile(r"\s")
ENV_KEYS = [
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "ANTHROPIC_API_KEY",
    "GOOGLE_API_KEY",
    "MISTRAL_API_KEY",
    "TOGETHER_API_KEY",
]
EXCLUDES = [
    ".git",
    "node_modules",
    ".build",
    "dist",
    "DerivedData",
    "user_lab/phase3/benchmarks",
    "user_lab/phase3/reports",
    ".codex",
]
TOP_LEVEL_KEYS = [
    "schemaVersion",
    "privacyMode",
    "collectedAt",
    "experimentMode",
    "automationMode",
    "controlledPrompt",
    "runCountPerWorkspace",
    "workspaceOrder",
    "workspaces",
    "runs",
    "summary",
    "deltas",
    "interpretation",
    "decisionThresholdOutcome",
    "recommendation",
    "warnings",
]
NODE_RUNNER = r"""
import { execute } from '@paperclipai/adapter-codex-local/server';

const payload = JSON.parse(process.env.PAPERCLIP_LATENCY_PAYLOAD ?? '{}');
const startMs = Date.now();
const startIso = new Date(startMs).toISOString();
let timeToFirstOutputMs = null;
let timeToFirstUsefulOutputMs = null;
const stdoutChunks = [];
const stderrChunks = [];
const notes = [];

function markUsefulOutput(offsetMs, line) {
  if (timeToFirstUsefulOutputMs !== null) return;
  try {
    const event = JSON.parse(line);
    const type = typeof event?.type === 'string' ? event.type : null;
    if (type === 'item.completed' && event?.item?.type === 'agent_message') {
      timeToFirstUsefulOutputMs = offsetMs;
      return;
    }
    if (type === 'agent_message' && typeof event?.text === 'string' && event.text.trim()) {
      timeToFirstUsefulOutputMs = offsetMs;
      return;
    }
    if (type === 'turn.completed' && typeof event?.summary === 'string' && event.summary.trim()) {
      timeToFirstUsefulOutputMs = offsetMs;
    }
  } catch {
    return;
  }
}

try {
  const result = await execute({
    runId: payload.runId,
    agent: {
      id: 'latency-benchmark-agent',
      companyId: 'latency-benchmark-company',
      name: 'Latency Benchmark Agent',
      adapterType: 'codex_local',
      adapterConfig: {},
    },
    runtime: {
      sessionId: null,
      sessionParams: null,
      sessionDisplayId: null,
      taskKey: null,
    },
    config: {
      command: payload.command,
      cwd: payload.workspacePath,
      extraArgs: ['--skip-git-repo-check'],
      promptTemplate: payload.prompt,
      timeoutSec: 180,
    },
    context: {},
    authToken: 'latency-benchmark-token',
    onLog: async (stream, chunk) => {
      const now = Date.now();
      const offsetMs = now - startMs;
      if (timeToFirstOutputMs === null && typeof chunk === 'string' && chunk.trim()) {
        timeToFirstOutputMs = offsetMs;
      }
      if (stream === 'stdout') stdoutChunks.push(chunk);
      else stderrChunks.push(chunk);
      for (const rawLine of String(chunk).split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;
        markUsefulOutput(offsetMs, line);
      }
    },
  });

  const endMs = Date.now();
  const stdoutText = stdoutChunks.join('');
  const stderrText = stderrChunks.join('');
  const warningObjects = Array.isArray(result?.resultJson?.warnings) ? result.resultJson.warnings : [];
  const warningCodes = warningObjects
    .map((warning) => (warning && typeof warning === 'object' && typeof warning.code === 'string' ? warning.code : null))
    .filter(Boolean);
  const sawXCodexTurnMetadataError =
    /x-codex-turn-metadata/i.test(stderrText) || /x-codex-turn-metadata/i.test(stdoutText);
  const websocketMetadataErrorCount =
    (stderrText.match(/x-codex-turn-metadata/gi) ?? []).length +
    (stdoutText.match(/x-codex-turn-metadata/gi) ?? []).length;
  const sawHttpFallback =
    /falling back to HTTP/i.test(stderrText) || /falling back to HTTP/i.test(stdoutText);
  const hasWorkspacePathWarning = warningCodes.includes('cloud_codex_non_ascii_workspace_path');
  const success = (result?.exitCode ?? 1) === 0 && result?.timedOut !== true;
  const runtimeContext = result?.resultJson?.runtimeContext ?? null;
  const errorCode = result?.errorCode ?? null;
  const errorMessage = typeof result?.errorMessage === 'string' ? result.errorMessage : null;

  let classification = 'inconclusive';
  if (errorCode === 'missing_auth_preflight') {
    classification = 'auth_preflight_failure';
  } else if (success && sawHttpFallback) {
    classification = 'success_with_websocket_fallback';
  } else if (success && (hasWorkspacePathWarning || warningCodes.length > 0 || sawXCodexTurnMetadataError)) {
    classification = 'success_with_warning';
  } else if (success) {
    classification = 'clean_success';
  } else if (errorMessage) {
    classification = 'execution_failure';
  }

  if (timeToFirstUsefulOutputMs === null) {
    notes.push('No first useful output timestamp could be derived from stdout JSONL events.');
  }
  if (!runtimeContext) {
    notes.push('runtimeContext was not present in resultJson.');
  }

  console.log(JSON.stringify({
    runId: payload.runId,
    workspaceKind: payload.workspaceKind,
    startTime: startIso,
    endTime: new Date(endMs).toISOString(),
    durationMs: endMs - startMs,
    exitCode: result?.exitCode ?? null,
    success,
    timeToFirstOutputMs,
    timeToFirstUsefulOutputMs,
    warningCodes,
    hasWorkspacePathWarning,
    websocketMetadataErrorCount,
    sawXCodexTurnMetadataError,
    sawHttpFallback,
    runtimeContext,
    errorCode,
    errorMessage,
    classification,
    notes,
  }));
} catch (error) {
  const endMs = Date.now();
  const message = error instanceof Error ? error.message : String(error);
  console.log(JSON.stringify({
    runId: payload.runId,
    workspaceKind: payload.workspaceKind,
    startTime: startIso,
    endTime: new Date(endMs).toISOString(),
    durationMs: endMs - startMs,
    exitCode: null,
    success: false,
    timeToFirstOutputMs: null,
    timeToFirstUsefulOutputMs: null,
    warningCodes: [],
    hasWorkspacePathWarning: false,
    websocketMetadataErrorCount: 0,
    sawXCodexTurnMetadataError: false,
    sawHttpFallback: false,
    runtimeContext: null,
    errorCode: null,
    errorMessage: message,
    classification: 'execution_failure',
    notes: ['Runner threw before execute() completed.'],
  }));
}
"""


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def has_combining_marks(text: str) -> bool:
    return any(unicodedata.category(char).startswith("M") for char in text)


def sanitize_text(text: str | None) -> str | None:
    if text is None:
        return None
    sanitized = text
    home = str(Path.home())
    if home:
        sanitized = sanitized.replace(home, "$HOME")
    sanitized = re.sub(r"(?i)(authToken|api[_-]?key|token)\s*[:=]\s*([^\s,]+)", r"\1=[redacted]", sanitized)
    sanitized = re.sub(r"\s+", " ", sanitized).strip()
    if len(sanitized) > 400:
        sanitized = sanitized[:397] + "..."
    return sanitized


def classify_path(path_value: str) -> dict[str, Any]:
    contains_percent_encoding = bool(PERCENT_ENCODING_RE.search(path_value))
    contains_spaces = bool(SPACES_RE.search(path_value))
    contains_non_ascii = bool(NON_ASCII_RE.search(path_value))
    normalized_nfc = unicodedata.normalize("NFC", path_value) if path_value else path_value
    normalized_nfd = unicodedata.normalize("NFD", path_value) if path_value else path_value
    contains_decomposed_unicode = bool(
        path_value and (has_combining_marks(path_value) or normalized_nfc != path_value or normalized_nfd != path_value)
    )
    ascii_safe = bool(path_value) and bool(PRINTABLE_ASCII_RE.fullmatch(path_value)) and not contains_percent_encoding
    risk_level = (
        "medium"
        if contains_non_ascii or contains_decomposed_unicode or contains_percent_encoding
        else "low"
        if contains_spaces
        else "none"
    )
    reasons: list[str] = []
    if contains_spaces:
        reasons.append("contains_spaces")
    if contains_non_ascii:
        reasons.append("contains_non_ascii")
    if contains_decomposed_unicode:
        reasons.append("contains_decomposed_unicode")
    if contains_percent_encoding:
        reasons.append("contains_percent_encoding")
    return {
        "repoRoot": path_value,
        "asciiSafe": ascii_safe,
        "containsSpaces": contains_spaces,
        "containsNonAscii": contains_non_ascii,
        "containsDecomposedUnicode": contains_decomposed_unicode,
        "containsPercentEncoding": contains_percent_encoding,
        "riskLevel": risk_level,
        "reasons": reasons,
    }


def run_command(
    command: list[str],
    *,
    cwd: Path | None = None,
    env: dict[str, str] | None = None,
    timeout: float = 300.0,
    input_text: str | None = None,
) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        env=env,
        input=input_text,
        text=True,
        capture_output=True,
        timeout=timeout,
        check=False,
    )


def median_or_none(values: list[int]) -> float | None:
    if not values:
        return None
    return float(statistics.median(values))


def mean_or_none(values: list[int]) -> float | None:
    if not values:
        return None
    return float(statistics.mean(values))


def p75_or_none(values: list[int]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(0.75 * len(ordered)) - 1))
    return float(ordered[index])


def format_ms(value: float | int | None) -> str:
    if value is None:
        return "n/a"
    return f"{int(round(float(value)))} ms"


def relative_to_repo(path: Path, repo_root: Path) -> str:
    try:
        return str(path.relative_to(repo_root))
    except ValueError:
        return str(path)


def prepare_ascii_workspace(repo_root: Path, warnings: list[str]) -> Path:
    dest = Path("/private/tmp/paperclip_latency_baseline/PaperclipApp")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if shutil.which("rsync"):
        command = ["rsync", "-a"]
        for entry in EXCLUDES:
            command.append(f"--exclude={entry}")
        command.extend([f"{repo_root}/", str(dest)])
        result = run_command(command, timeout=600.0)
        if result.returncode != 0:
            raise RuntimeError(f"rsync failed preparing ASCII workspace: {result.stderr.strip() or result.stdout.strip()}")
    else:
        warnings.append("rsync was not available; used shutil.copytree fallback without delete synchronization.")
        ignore = shutil.ignore_patterns(*EXCLUDES)
        shutil.copytree(repo_root, dest, dirs_exist_ok=True, ignore=ignore)
    return dest


def build_workspace_metadata(repo_root: Path, workspace_path: Path) -> dict[str, Any]:
    realpath = workspace_path.resolve()
    package_files = [name for name in ["Package.swift", "README.md"] if (workspace_path / name).exists()]
    path_class = classify_path(str(workspace_path))
    realpath_class = classify_path(str(realpath))
    return {
        "path": str(workspace_path),
        "realpath": str(realpath),
        "workspacePathClass": path_class,
        "realpathPathClass": realpath_class,
        "pwdAsciiOnly": path_class["asciiSafe"] and not path_class["containsSpaces"],
        "realpathAsciiOnly": realpath_class["asciiSafe"] and not realpath_class["containsSpaces"],
        "packageFilesPresent": package_files,
        "sufficientForReadOnlyPrompt": bool(package_files),
    }


def build_workspace_order(run_count_per_workspace: int) -> list[str]:
    if run_count_per_workspace == 5:
        return [
            "current_non_ascii",
            "ascii_comparison",
            "ascii_comparison",
            "current_non_ascii",
            "current_non_ascii",
            "ascii_comparison",
            "ascii_comparison",
            "current_non_ascii",
            "current_non_ascii",
            "ascii_comparison",
        ]
    if run_count_per_workspace == 3:
        return [
            "current_non_ascii",
            "ascii_comparison",
            "ascii_comparison",
            "current_non_ascii",
            "current_non_ascii",
            "ascii_comparison",
        ]
    order: list[str] = []
    for index in range(run_count_per_workspace):
        if index % 2 == 0:
            order.extend(["current_non_ascii", "ascii_comparison"])
        else:
            order.extend(["ascii_comparison", "current_non_ascii"])
    return order


def run_single_measurement(
    *,
    run_id: str,
    workspace_kind: str,
    workspace_path: Path,
    command_path: str,
    vendor_root: Path,
    managed_paperclip_home: Path,
) -> dict[str, Any]:
    payload = {
        "runId": run_id,
        "workspaceKind": workspace_kind,
        "workspacePath": str(workspace_path),
        "command": command_path,
        "prompt": CONTROLLED_PROMPT,
    }
    env = os.environ.copy()
    env["PAPERCLIP_HOME"] = str(managed_paperclip_home)
    env["PAPERCLIP_LATENCY_PAYLOAD"] = json.dumps(payload)
    completed = run_command(
        ["pnpm", "--filter", "@paperclipai/server", "exec", "node", "--import", "tsx", "--input-type=module", "-"],
        cwd=vendor_root,
        env=env,
        timeout=300.0,
        input_text=NODE_RUNNER,
    )
    stdout = completed.stdout.strip()
    stderr = completed.stderr.strip()
    if completed.returncode != 0:
        return {
            "runId": run_id,
            "workspaceKind": workspace_kind,
            "startTime": None,
            "endTime": None,
            "durationMs": None,
            "exitCode": completed.returncode,
            "success": False,
            "timeToFirstOutputMs": None,
            "timeToFirstUsefulOutputMs": None,
            "warningCodes": [],
            "hasWorkspacePathWarning": False,
            "websocketMetadataErrorCount": 0,
            "sawXCodexTurnMetadataError": False,
            "sawHttpFallback": False,
            "runtimeContext": None,
            "errorCode": None,
            "errorMessage": sanitize_text(stderr or stdout or "Benchmark harness subprocess failed."),
            "classification": "execution_failure",
            "notes": ["Latency harness subprocess exited non-zero before structured result parsing."],
        }
    try:
        parsed = json.loads(stdout)
        parsed["errorMessage"] = sanitize_text(parsed.get("errorMessage"))
        parsed["notes"] = [sanitize_text(note) or "" for note in parsed.get("notes", []) if sanitize_text(note)]
        return parsed
    except json.JSONDecodeError:
        return {
            "runId": run_id,
            "workspaceKind": workspace_kind,
            "startTime": None,
            "endTime": None,
            "durationMs": None,
            "exitCode": None,
            "success": False,
            "timeToFirstOutputMs": None,
            "timeToFirstUsefulOutputMs": None,
            "warningCodes": [],
            "hasWorkspacePathWarning": False,
            "websocketMetadataErrorCount": 0,
            "sawXCodexTurnMetadataError": False,
            "sawHttpFallback": False,
            "runtimeContext": None,
            "errorCode": None,
            "errorMessage": "Could not parse structured JSON result from harness.",
            "classification": "inconclusive",
            "notes": [f"Raw stdout length={len(stdout)} stderr length={len(stderr)}"],
        }


def summarize_runs(runs: list[dict[str, Any]]) -> dict[str, Any]:
    summary: dict[str, Any] = {}
    for workspace_kind in ["current_non_ascii", "ascii_comparison"]:
        scoped = [run for run in runs if run["workspaceKind"] == workspace_kind]
        durations = [run["durationMs"] for run in scoped if isinstance(run.get("durationMs"), int)]
        ttf_outputs = [run["timeToFirstOutputMs"] for run in scoped if isinstance(run.get("timeToFirstOutputMs"), int)]
        summary[workspace_kind] = {
            "runs": len(scoped),
            "successRuns": sum(1 for run in scoped if run.get("success")),
            "medianDurationMs": median_or_none(durations),
            "meanDurationMs": mean_or_none(durations),
            "p75DurationMs": p75_or_none(durations),
            "fastestDurationMs": min(durations) if durations else None,
            "slowestDurationMs": max(durations) if durations else None,
            "minDurationMs": min(durations) if durations else None,
            "maxDurationMs": max(durations) if durations else None,
            "warningRuns": sum(1 for run in scoped if run.get("warningCodes")),
            "websocketMetadataErrors": sum(int(run.get("websocketMetadataErrorCount") or 0) for run in scoped),
            "httpFallbackRuns": sum(1 for run in scoped if run.get("sawHttpFallback")),
            "medianTimeToFirstOutputMs": median_or_none(ttf_outputs),
            "classifications": [run.get("classification") for run in scoped],
        }
    return summary


def build_deltas(summary: dict[str, Any]) -> dict[str, float | None]:
    current = summary["current_non_ascii"]
    ascii_workspace = summary["ascii_comparison"]
    current_median = current["medianDurationMs"]
    ascii_median = ascii_workspace["medianDurationMs"]
    current_mean = current["meanDurationMs"]
    ascii_mean = ascii_workspace["meanDurationMs"]
    return {
        "medianDeltaMs": None if current_median is None or ascii_median is None else float(current_median - ascii_median),
        "meanDeltaMs": None if current_mean is None or ascii_mean is None else float(current_mean - ascii_mean),
    }


def interpret_results(summary: dict[str, Any], runs: list[dict[str, Any]], deltas: dict[str, float | None]) -> dict[str, str]:
    current = summary["current_non_ascii"]
    ascii_workspace = summary["ascii_comparison"]
    median_delta = deltas["medianDeltaMs"]
    if median_delta is not None:
        if median_delta > 1000:
            overhead_answer = "Yes, the current path showed measurable overhead in this small sample."
        elif median_delta < -1000:
            overhead_answer = "No clear current-path overhead appeared; the ASCII workspace was not faster in this small sample."
        else:
            overhead_answer = "Duration differences were small enough that current-path overhead remains inconclusive from this sample."
    else:
        overhead_answer = "Not enough successful timing data was available to judge overhead confidently."

    ascii_cleaner = (
        "Yes, the ASCII comparison remained cleaner."
        if ascii_workspace["warningRuns"] < current["warningRuns"]
        or ascii_workspace["websocketMetadataErrors"] < current["websocketMetadataErrors"]
        or ascii_workspace["httpFallbackRuns"] < current["httpFallbackRuns"]
        else "The ASCII comparison was not clearly cleaner in this sample."
    )
    warning_answer = (
        "Yes, the workspace-path warning appeared on the current path runs."
        if any(run.get("hasWorkspacePathWarning") for run in runs if run["workspaceKind"] == "current_non_ascii")
        else "No current-path workspace warning was observed in this sample."
    )
    completion_answer = (
        "Yes, at least one task completed successfully."
        if any(run.get("success") for run in runs)
        else "No successful task completion was observed in this sample."
    )
    mitigation_answer = (
        "No stronger mitigation is justified yet; the sample is small and the experiment only supports cautious measurement."
    )
    return {
        "currentPathOverhead": overhead_answer,
        "asciiCleaner": ascii_cleaner,
        "warningBehavior": warning_answer,
        "taskCompletion": completion_answer,
        "mitigationJustification": mitigation_answer,
    }


def decide_threshold_outcome(summary: dict[str, Any], deltas: dict[str, float | None]) -> tuple[str, str]:
    current = summary["current_non_ascii"]
    ascii_workspace = summary["ascii_comparison"]
    median_delta = deltas["medianDeltaMs"]
    current_ttf = current["medianTimeToFirstOutputMs"]
    ascii_ttf = ascii_workspace["medianTimeToFirstOutputMs"]
    warnings_consistent = current["warningRuns"] == current["runs"] and ascii_workspace["warningRuns"] == 0
    ws_current_only = current["websocketMetadataErrors"] > 0 and ascii_workspace["websocketMetadataErrors"] == 0
    fallback_current_only = current["httpFallbackRuns"] > 0 and ascii_workspace["httpFallbackRuns"] == 0
    ttf_consistently_worse = (
        current_ttf is not None and ascii_ttf is not None and current_ttf > ascii_ttf + 1000
    )

    if ws_current_only or fallback_current_only or (median_delta is not None and median_delta > 10000):
        return (
            "strong_mitigation_candidate",
            "Design Experiment 3d for a stronger optional mitigation proposal.",
        )
    if (median_delta is not None and 5000 <= median_delta <= 10000) or ttf_consistently_worse:
        return (
            "possible_performance_concern",
            "Continue monitoring and consider user-facing path health recommendation, but no automatic workaround yet.",
        )
    if warnings_consistent and current["websocketMetadataErrors"] == 0 and ascii_workspace["websocketMetadataErrors"] == 0 and current["httpFallbackRuns"] == 0 and ascii_workspace["httpFallbackRuns"] == 0 and (median_delta is None or median_delta < 5000):
        return (
            "warning_only_outcome",
            "Keep warning-first only. No stronger mitigation justified.",
        )
    return (
        "inconclusive_outcome",
        "Keep warning-first only for now and continue monitoring before considering any stronger mitigation.",
    )


def validate_output(payload: dict[str, Any], report_text: str) -> None:
    missing = [key for key in TOP_LEVEL_KEYS if key not in payload]
    if missing:
        raise RuntimeError(f"Missing top-level JSON keys: {', '.join(missing)}")
    serialized = json.dumps(payload, sort_keys=True)
    for key in ENV_KEYS:
        secret = os.environ.get(key)
        if secret and secret in serialized:
            raise RuntimeError(f"Secret value for {key} leaked into JSON output.")
        if secret and secret in report_text:
            raise RuntimeError(f"Secret value for {key} leaked into markdown output.")
    if "# Controlled Latency Baseline" not in report_text and "# Latency Reliability Baseline" not in report_text:
        raise RuntimeError("Markdown report header is missing.")


def build_report(payload: dict[str, Any], repo_root: Path) -> str:
    summary = payload["summary"]
    runs = payload["runs"]
    interpretation = payload["interpretation"]
    workspaces = payload["workspaces"]
    deltas = payload["deltas"]
    title = "# Latency Reliability Baseline" if payload["experimentMode"] == "reliability" else "# Controlled Latency Baseline"

    lines = [
        title,
        "",
        "## Summary",
        "",
        f"- Collected at: `{payload['collectedAt']}`",
        f"- Experiment mode: `{payload['experimentMode']}`",
        f"- Automation mode: `{payload['automationMode']}`",
        f"- Run count per workspace: `{payload['runCountPerWorkspace']}`",
        f"- Workspace order: `{', '.join(payload['workspaceOrder'])}`",
        "",
        "## Run Configuration",
        "",
        f"- Current workspace: `{workspaces['current_non_ascii']['path']}`",
        f"- Current workspace `pwd` ASCII-only: `{workspaces['current_non_ascii']['pwdAsciiOnly']}`",
        f"- Current workspace `realpath` ASCII-only: `{workspaces['current_non_ascii']['realpathAsciiOnly']}`",
        f"- Current workspace path risk: `{workspaces['current_non_ascii']['workspacePathClass']['riskLevel']}`",
        f"- ASCII comparison workspace: `{workspaces['ascii_comparison']['path']}`",
        f"- ASCII comparison `pwd` ASCII-only: `{workspaces['ascii_comparison']['pwdAsciiOnly']}`",
        f"- ASCII comparison `realpath` ASCII-only: `{workspaces['ascii_comparison']['realpathAsciiOnly']}`",
        f"- ASCII comparison path risk: `{workspaces['ascii_comparison']['workspacePathClass']['riskLevel']}`",
        f"- ASCII comparison package files present: `{', '.join(workspaces['ascii_comparison']['packageFilesPresent']) if workspaces['ascii_comparison']['packageFilesPresent'] else 'none'}`",
        f"- ASCII comparison sufficient for read-only prompt: `{workspaces['ascii_comparison']['sufficientForReadOnlyPrompt']}`",
        "",
        "## Aggregate Results",
        "",
        "| Metric | Current Path | ASCII Path | Delta / Interpretation |",
        "|---|---:|---:|---|",
        f"| Runs | {summary['current_non_ascii']['runs']} | {summary['ascii_comparison']['runs']} | sample size |",
        f"| Successes | {summary['current_non_ascii']['successRuns']} | {summary['ascii_comparison']['successRuns']} | task completion |",
        f"| Warnings | {summary['current_non_ascii']['warningRuns']} | {summary['ascii_comparison']['warningRuns']} | current path warnings should only appear on medium-risk path |",
        f"| Websocket metadata errors | {summary['current_non_ascii']['websocketMetadataErrors']} | {summary['ascii_comparison']['websocketMetadataErrors']} | recurrence signal |",
        f"| HTTP fallbacks | {summary['current_non_ascii']['httpFallbackRuns']} | {summary['ascii_comparison']['httpFallbackRuns']} | recurrence signal |",
        f"| Min duration | {format_ms(summary['current_non_ascii']['minDurationMs'])} | {format_ms(summary['ascii_comparison']['minDurationMs'])} | floor |",
        f"| Max duration | {format_ms(summary['current_non_ascii']['maxDurationMs'])} | {format_ms(summary['ascii_comparison']['maxDurationMs'])} | ceiling |",
        f"| Median duration | {format_ms(summary['current_non_ascii']['medianDurationMs'])} | {format_ms(summary['ascii_comparison']['medianDurationMs'])} | delta `{format_ms(deltas['medianDeltaMs'])}` |",
        f"| Mean duration | {format_ms(summary['current_non_ascii']['meanDurationMs'])} | {format_ms(summary['ascii_comparison']['meanDurationMs'])} | delta `{format_ms(deltas['meanDeltaMs'])}` |",
        f"| P75 duration | {format_ms(summary['current_non_ascii']['p75DurationMs'])} | {format_ms(summary['ascii_comparison']['p75DurationMs'])} | tail latency |",
        f"| Median TTF output | {format_ms(summary['current_non_ascii']['medianTimeToFirstOutputMs'])} | {format_ms(summary['ascii_comparison']['medianTimeToFirstOutputMs'])} | first visible output |",
        "",
        "## Per-Run Results",
        "",
        "| Run | Workspace | Duration | TTF Output | Warning | WS Error | HTTP Fallback | Classification |",
        "|---|---|---:|---:|---|---|---|---|",
    ]

    for run in runs:
        duration = format_ms(run.get("durationMs"))
        ttf_output = format_ms(run.get("timeToFirstOutputMs"))
        warning = "yes" if run.get("hasWorkspacePathWarning") or run.get("warningCodes") else "no"
        ws_error = "yes" if run.get("sawXCodexTurnMetadataError") else "no"
        http_fallback = "yes" if run.get("sawHttpFallback") else "no"
        workspace_label = "current" if run["workspaceKind"] == "current_non_ascii" else "ascii"
        lines.append(f"| {run['runId']} | {workspace_label} | {duration} | {ttf_output} | {warning} | {ws_error} | {http_fallback} | {run.get('classification') or 'unknown'} |")

    lines.extend([
        "",
        "## Interpretation",
        "",
        f"1. Does current path still show measurable overhead? {interpretation['currentPathOverhead']}",
        f"2. Does ASCII comparison remain cleaner? {interpretation['asciiCleaner']}",
        f"3. Does warning appear correctly? {interpretation['warningBehavior']}",
        f"4. Does task still complete? {interpretation['taskCompletion']}",
        f"5. Is stronger mitigation justified now? {interpretation['mitigationJustification']}",
        "",
        "## Decision Threshold Outcome",
        "",
        f"- Outcome: `{payload['decisionThresholdOutcome']}`",
        "",
        "## Recommendation",
        "",
        f"- {payload['recommendation']}",
        "",
        "## Caveats",
        "",
        "- This sample is intentionally small and should be read as a controlled baseline rather than a broad benchmark.",
        "- Cloud variability can still move run-to-run timings even when the prompt and workspace contents are controlled.",
        "- Resolved model is still unknown; only requested/default model and runtime model signals are visible.",
        "- No local-model comparison was performed in this experiment.",
        "- No runtime behavior was changed; this experiment only measured the existing path behavior.",
        "- The harness used the real `codex_local` adapter path and the fixed controlled prompt with no file modifications requested.",
    ])

    notes = []
    for run in runs:
        for note in run.get("notes", []):
            notes.append(f"- {run['runId']}: {note}")
    if notes:
        lines.extend(["", "## Per-Run Notes", ""])
        lines.extend(notes)

    if payload["warnings"]:
        lines.extend(["", "## Harness Warnings", ""])
        for warning in payload["warnings"]:
            lines.append(f"- {warning}")

    failed_runs = [run for run in runs if run.get("errorMessage")]
    if failed_runs:
        lines.extend(["", "## Failure Signals", ""])
        for run in failed_runs:
            lines.append(f"- {run['runId']}: `{sanitize_text(run.get('errorMessage')) or 'unknown_error'}`")

    lines.extend([
        "",
        "## Privacy Notes",
        "",
        "- The report stores structured metrics and selected diagnostic flags rather than full raw logs.",
        "- No API key or token values are recorded.",
        "- The real repo path is included because path class is the subject of the measurement.",
    ])
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Controlled Paperclip latency baseline harness.")
    parser.add_argument("--mode", choices=["baseline", "reliability"], default="baseline")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--report-out", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    json_out = Path(args.json_out).resolve()
    report_out = Path(args.report_out).resolve()
    vendor_root = repo_root / "vendor" / "paperclip"
    benchmark_root = repo_root / "user_lab" / "phase3" / "benchmarks"
    benchmark_root.mkdir(parents=True, exist_ok=True)
    warnings: list[str] = []
    run_count_per_workspace = 5 if args.mode == "reliability" else 2
    workspace_order = build_workspace_order(run_count_per_workspace)
    codex_path = shutil.which("codex")
    if codex_path is None:
      raise RuntimeError("Could not find codex command in PATH.")

    ascii_workspace = prepare_ascii_workspace(repo_root, warnings)
    workspaces = {
        "current_non_ascii": build_workspace_metadata(repo_root, repo_root),
        "ascii_comparison": build_workspace_metadata(repo_root, ascii_workspace),
    }
    managed_paperclip_home = Path("/private/tmp/paperclip_latency_baseline/paperclip_home")
    managed_paperclip_home.mkdir(parents=True, exist_ok=True)

    runs: list[dict[str, Any]] = []
    counters = {"current_non_ascii": 0, "ascii_comparison": 0}
    for workspace_kind in workspace_order:
        counters[workspace_kind] += 1
        workspace_path = repo_root if workspace_kind == "current_non_ascii" else ascii_workspace
        run = run_single_measurement(
            run_id=f"{workspace_kind}-{counters[workspace_kind]}",
            workspace_kind=workspace_kind,
            workspace_path=workspace_path,
            command_path=codex_path,
            vendor_root=vendor_root,
            managed_paperclip_home=managed_paperclip_home,
        )
        run["workspacePathClass"] = workspaces[workspace_kind]["workspacePathClass"]
        runs.append(run)

    summary = summarize_runs(runs)
    deltas = build_deltas(summary)
    interpretation = interpret_results(summary, runs, deltas)
    decision_threshold_outcome, recommendation = decide_threshold_outcome(summary, deltas)
    payload = {
        "schemaVersion": 1,
        "privacyMode": "local_only",
        "collectedAt": iso_now(),
        "experimentMode": args.mode,
        "automationMode": "actual_measurement",
        "controlledPrompt": CONTROLLED_PROMPT,
        "runCountPerWorkspace": run_count_per_workspace,
        "workspaceOrder": workspace_order,
        "workspaces": workspaces,
        "runs": runs,
        "summary": summary,
        "deltas": deltas,
        "interpretation": interpretation,
        "decisionThresholdOutcome": decision_threshold_outcome,
        "recommendation": recommendation,
        "warnings": warnings,
    }
    report_text = build_report(payload, repo_root)
    validate_output(payload, report_text)
    json_out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_out.write_text(report_text, encoding="utf-8")
    print("Validation: OK")
    print(f"JSON written: {json_out}")
    print(f"Report written: {report_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
