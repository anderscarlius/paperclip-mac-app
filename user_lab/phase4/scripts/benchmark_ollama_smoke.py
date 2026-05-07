#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import statistics
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


API_BASE_URL = "http://127.0.0.1:11434"
MODEL_NAME = "gemma4:e4b"
RUNS_PER_TASK = 2
TOP_LEVEL_KEYS = [
    "schemaVersion",
    "privacyMode",
    "collectedAt",
    "model",
    "modelVerified",
    "runCountPerTask",
    "totalRuns",
    "runs",
    "aggregateMetrics",
    "taskResults",
    "suitabilityAssessment",
    "recommendedUseInPaperclip",
    "warnings",
]
TASKS = [
    {
        "taskId": "summary",
        "title": "Short Summary",
        "prompt": """Summarize this in exactly two bullet points:

Paperclip is a local AI desktop environment that can run coding agents, inspect repositories, execute tests, and help optimize the user's local AI setup. The system should be truthful about what it measured, avoid exposing secrets, and prefer small reversible changes.""",
    },
    {
        "taskId": "classification",
        "title": "Classification",
        "prompt": """Classify the following issue as one of: auth_problem, path_problem, model_observability_problem, local_model_problem, unknown.

Issue:
Ollama is installed and its API is reachable, but Paperclip has not yet measured local model latency.

Return only JSON:
{"classification":"...","reason":"..."}""",
    },
    {
        "taskId": "code_explanation",
        "title": "Small Code Explanation",
        "prompt": """Explain what this TypeScript function does in three concise sentences:

function classifyPath(path: string) {
  return {
    containsNonAscii: [...path].some((ch) => ch.charCodeAt(0) > 127),
    containsPercentEncoding: /%[0-9A-Fa-f]{2}/.test(path),
  };
}""",
    },
    {
        "taskId": "structured_extraction",
        "title": "Structured Extraction",
        "prompt": """Extract the model facts from this text and return JSON only.

Text:
The detected local Ollama model is gemma4:e4b. It belongs to the gemma4 family, has parameter size 8.0B, uses Q4_K_M quantization, and is about 9.6 GB.

JSON schema:
{
  "model": string,
  "family": string,
  "parameterSize": string,
  "quantization": string,
  "approxSizeGb": number
}""",
    },
    {
        "taskId": "fallback_policy",
        "title": "Local Fallback Policy",
        "prompt": """Write a concise recommendation for when Paperclip should use a local model instead of a cloud model. Mention privacy, latency, cost, and quality tradeoffs. Keep it under 120 words.""",
    },
]


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def median_or_none(values: list[float]) -> float | None:
    if not values:
        return None
    return float(statistics.median(values))


def mean_or_none(values: list[float]) -> float | None:
    if not values:
        return None
    return float(statistics.mean(values))


def format_ms(value: float | int | None) -> str:
    if value is None:
        return "n/a"
    return f"{int(round(float(value)))} ms"


def format_tps(value: float | None) -> str:
    if value is None:
        return "n/a"
    return f"{value:.2f}"


def http_json_request(url: str, payload: dict[str, Any], timeout: float) -> tuple[int | None, dict[str, Any] | None, str | None]:
    encoded = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=encoded,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return response.status, json.loads(body), None
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = None
        return exc.code, parsed, f"http_error_{exc.code}"
    except Exception as exc:
        return None, None, str(exc)


def http_get_json(url: str, timeout: float = 4.0) -> dict[str, Any]:
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8", errors="replace")
        return json.loads(body)


def verify_model() -> dict[str, Any]:
    payload = http_get_json(f"{API_BASE_URL}/api/tags")
    models = payload.get("models")
    if not isinstance(models, list):
        raise RuntimeError("Ollama /api/tags did not return a models list.")
    for item in models:
        if not isinstance(item, dict):
            continue
        if item.get("name") != MODEL_NAME:
            continue
        details = item.get("details") if isinstance(item.get("details"), dict) else {}
        return {
            "name": item.get("name"),
            "family": details.get("family"),
            "parameterSize": details.get("parameter_size"),
            "quantization": details.get("quantization_level"),
            "sizeBytes": item.get("size"),
            "modifiedAt": item.get("modified_at"),
            "digest": item.get("digest"),
        }
    raise RuntimeError(f"Model {MODEL_NAME} was not present in /api/tags.")


def split_non_empty_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def sentence_count(text: str) -> int:
    cleaned = text.replace("?", ".").replace("!", ".")
    parts = [part.strip() for part in cleaned.split(".") if part.strip()]
    return len(parts)


def quality_summary(output: str) -> dict[str, Any]:
    notes: list[str] = []
    lines = split_non_empty_lines(output)
    bullet_lines = [line for line in lines if line.startswith(("-", "*", "•"))]
    if len(bullet_lines) != 2 or len(lines) != 2:
        notes.append("Expected exactly two bullet-like lines.")
    return {"passed": not notes, "notes": notes}


def quality_classification(output: str) -> tuple[bool | None, dict[str, Any]]:
    notes: list[str] = []
    valid_json = None
    try:
        parsed = json.loads(output)
        valid_json = True
    except json.JSONDecodeError:
        parsed = None
        valid_json = False
        notes.append("Output was not valid JSON.")
    if isinstance(parsed, dict):
        classification = parsed.get("classification")
        if not isinstance(classification, str):
            notes.append("JSON did not contain a string classification field.")
        elif classification != "local_model_problem":
            notes.append(f"Classification was {classification!r} instead of 'local_model_problem'.")
    return valid_json, {"passed": valid_json is True and not notes, "notes": notes}


def quality_code_explanation(output: str) -> dict[str, Any]:
    notes: list[str] = []
    lowered = output.lower()
    sentences = sentence_count(output)
    if sentences < 2 or sentences > 4:
        notes.append("Expected roughly three concise sentences.")
    if "non-ascii" not in lowered and "non ascii" not in lowered and "containsnonascii" not in lowered:
        notes.append("Did not clearly mention non-ASCII detection.")
    if "percent" not in lowered:
        notes.append("Did not clearly mention percent-encoding detection.")
    if "filesystem" in lowered:
        notes.append("Mentioned filesystem behavior that was not present in the code.")
    return {"passed": not notes, "notes": notes}


def quality_structured_extraction(output: str) -> tuple[bool | None, dict[str, Any]]:
    notes: list[str] = []
    valid_json = None
    try:
        parsed = json.loads(output)
        valid_json = True
    except json.JSONDecodeError:
        parsed = None
        valid_json = False
        notes.append("Output was not valid JSON.")
    if isinstance(parsed, dict):
        if parsed.get("model") != MODEL_NAME:
            notes.append(f"Model field was {parsed.get('model')!r}.")
        if parsed.get("quantization") != "Q4_K_M":
            notes.append(f"Quantization field was {parsed.get('quantization')!r}.")
    return valid_json, {"passed": valid_json is True and not notes, "notes": notes}


def quality_fallback_policy(output: str) -> dict[str, Any]:
    notes: list[str] = []
    lowered = output.lower()
    words = [word for word in output.split() if word.strip()]
    if len(words) > 120:
        notes.append("Output exceeded 120 words.")
    for keyword in ["privacy", "cost", "latency"]:
        if keyword not in lowered:
            notes.append(f"Did not mention {keyword}.")
    if "quality" not in lowered:
        notes.append("Did not mention quality tradeoff.")
    return {"passed": not notes, "notes": notes}


def evaluate_quality(task_id: str, output: str) -> tuple[bool | None, dict[str, Any]]:
    if task_id == "summary":
        return None, quality_summary(output)
    if task_id == "classification":
        return quality_classification(output)
    if task_id == "code_explanation":
        return None, quality_code_explanation(output)
    if task_id == "structured_extraction":
        return quality_structured_extraction(output)
    if task_id == "fallback_policy":
        return None, quality_fallback_policy(output)
    return None, {"passed": False, "notes": ["Unknown task."]}


def run_single(task: dict[str, str], run_index: int) -> dict[str, Any]:
    start = datetime.now(timezone.utc)
    payload = {
        "model": MODEL_NAME,
        "prompt": task["prompt"],
        "stream": False,
        "think": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 160,
        },
    }
    attempts = 0
    last_status: int | None = None
    last_response: dict[str, Any] | None = None
    last_error: str | None = None
    while attempts < 2:
        attempts += 1
        status, response, error = http_json_request(f"{API_BASE_URL}/api/generate", payload, timeout=90.0)
        last_status = status
        last_response = response
        last_error = error
        if error is None or "timed out" not in (error or "").lower():
            break
    end = datetime.now(timezone.utc)
    duration_ms = int((end - start).total_seconds() * 1000)

    output = ""
    success = False
    eval_count = None
    eval_duration = None
    prompt_eval_count = None
    prompt_eval_duration = None
    prompt_tokens = None
    completion_tokens = None
    tokens_per_second = None
    valid_json, quality_check = (None, {"passed": False, "notes": ["No output received."]})

    if isinstance(last_response, dict):
        output = str(last_response.get("response") or "")
        eval_count = last_response.get("eval_count")
        eval_duration = last_response.get("eval_duration")
        prompt_eval_count = last_response.get("prompt_eval_count")
        prompt_eval_duration = last_response.get("prompt_eval_duration")
        prompt_tokens = prompt_eval_count if isinstance(prompt_eval_count, int) else None
        completion_tokens = eval_count if isinstance(eval_count, int) else None
        if isinstance(eval_count, int) and isinstance(eval_duration, int) and eval_duration > 0:
            tokens_per_second = float(eval_count) / (float(eval_duration) / 1_000_000_000)
        valid_json, quality_check = evaluate_quality(task["taskId"], output)
        success = last_error is None and last_status == 200 and bool(output.strip())
    else:
        quality_check = {"passed": False, "notes": [last_error or "No response payload received."]}

    return {
        "runId": f"{task['taskId']}-{run_index}",
        "taskId": task["taskId"],
        "model": MODEL_NAME,
        "startTime": start.replace(microsecond=0).isoformat(),
        "endTime": end.replace(microsecond=0).isoformat(),
        "durationMs": duration_ms,
        "success": success,
        "httpStatus": last_status,
        "promptTokens": prompt_tokens,
        "completionTokens": completion_tokens,
        "evalCount": eval_count if isinstance(eval_count, int) else None,
        "evalDurationNs": eval_duration if isinstance(eval_duration, int) else None,
        "promptEvalCount": prompt_eval_count if isinstance(prompt_eval_count, int) else None,
        "promptEvalDurationNs": prompt_eval_duration if isinstance(prompt_eval_duration, int) else None,
        "tokensPerSecond": tokens_per_second,
        "outputChars": len(output),
        "validJson": valid_json,
        "qualityCheck": quality_check,
        "error": last_error,
        "outputPreview": output[:300],
    }


def aggregate_runs(runs: list[dict[str, Any]]) -> dict[str, Any]:
    durations = [float(run["durationMs"]) for run in runs if isinstance(run.get("durationMs"), int)]
    tps_values = [float(run["tokensPerSecond"]) for run in runs if isinstance(run.get("tokensPerSecond"), (int, float))]
    output_chars = [float(run["outputChars"]) for run in runs if isinstance(run.get("outputChars"), int)]
    return {
        "successfulRuns": sum(1 for run in runs if run.get("success")),
        "qualityPasses": sum(1 for run in runs if run.get("qualityCheck", {}).get("passed")),
        "medianDurationMs": median_or_none(durations),
        "meanDurationMs": mean_or_none(durations),
        "medianTokensPerSecond": median_or_none(tps_values),
        "meanTokensPerSecond": mean_or_none(tps_values),
        "medianOutputChars": median_or_none(output_chars),
    }


def per_task_results(runs: list[dict[str, Any]]) -> dict[str, Any]:
    results: dict[str, Any] = {}
    for task in TASKS:
        task_runs = [run for run in runs if run["taskId"] == task["taskId"]]
        durations = [float(run["durationMs"]) for run in task_runs if isinstance(run.get("durationMs"), int)]
        tps_values = [float(run["tokensPerSecond"]) for run in task_runs if isinstance(run.get("tokensPerSecond"), (int, float))]
        results[task["taskId"]] = {
            "title": task["title"],
            "runs": len(task_runs),
            "successes": sum(1 for run in task_runs if run.get("success")),
            "medianDurationMs": median_or_none(durations),
            "medianTokensPerSecond": median_or_none(tps_values),
            "qualityPasses": sum(1 for run in task_runs if run.get("qualityCheck", {}).get("passed")),
        }
    return results


def suitability_for_task(summary: dict[str, Any]) -> str:
    runs = summary["runs"]
    successes = summary["successes"]
    quality_passes = summary["qualityPasses"]
    if runs == 0:
        return "inconclusive"
    if successes == runs and quality_passes == runs:
        return "suitable"
    if successes == runs and quality_passes == 0:
        return "not_suitable"
    if successes >= 1 and quality_passes >= 1:
        return "possibly_suitable"
    if successes == 0:
        return "not_suitable"
    return "inconclusive"


def recommended_use(assessment: dict[str, str]) -> list[str]:
    items: list[str] = []
    if assessment["summary"] in {"suitable", "possibly_suitable"}:
        items.append("Suitable for privacy-sensitive local summaries when the task is short and low risk.")
    if assessment["classification"] in {"suitable", "possibly_suitable"}:
        items.append("Suitable for simple local classification and structured triage tasks.")
    if assessment["structured_extraction"] in {"suitable", "possibly_suitable"}:
        items.append("Suitable for extracting small structured fact sets from synthetic or non-sensitive text.")
    if assessment["code_explanation"] == "suitable":
        items.append("Suitable for explaining very small code snippets when the task is narrow and low risk.")
    elif assessment["code_explanation"] == "possibly_suitable":
        items.append("Possibly suitable for explaining very small code snippets, but not yet proven for larger coding tasks.")
    if assessment["fallback_policy"] in {"suitable", "possibly_suitable"}:
        items.append("Suitable for drafting short local policy or recommendation text when privacy matters more than perfect formatting.")
    items.append("Not yet proven for complex coding changes, long-context repository work, or as a general Paperclip default.")
    return items


def build_markdown(payload: dict[str, Any]) -> str:
    task_results = payload["taskResults"]
    lines = [
        "# Ollama Smoke Benchmark",
        "",
        "## Summary",
        "",
        f"- Model tested: `{payload['model']}`",
        f"- Runs completed: `{payload['totalRuns']}`",
        f"- Successful runs: `{payload['aggregateMetrics']['successfulRuns']}`",
        f"- Quality passes: `{payload['aggregateMetrics']['qualityPasses']}`",
        f"- Median duration: `{format_ms(payload['aggregateMetrics']['medianDurationMs'])}`",
        f"- Median tokens/sec: `{format_tps(payload['aggregateMetrics']['medianTokensPerSecond'])}`",
        "",
        "## Model",
        "",
        f"- Name: `{payload['modelVerified']['name']}`",
        f"- Family: `{payload['modelVerified']['family'] or 'unknown'}`",
        f"- Parameter size: `{payload['modelVerified']['parameterSize'] or 'unknown'}`",
        f"- Quantization: `{payload['modelVerified']['quantization'] or 'unknown'}`",
        f"- Size bytes: `{payload['modelVerified']['sizeBytes'] if payload['modelVerified']['sizeBytes'] is not None else 'unknown'}`",
        "",
        "## Run Configuration",
        "",
        f"- API base URL: `{API_BASE_URL}`",
        f"- Runs per task: `{payload['runCountPerTask']}`",
        f"- Temperature: `0.1`",
        f"- Streaming: `false`",
        f"- Think disabled: `true`",
        "",
        "## Aggregate Metrics",
        "",
        "| Metric | Value |",
        "|---|---:|",
        f"| Successful runs | {payload['aggregateMetrics']['successfulRuns']} |",
        f"| Quality passes | {payload['aggregateMetrics']['qualityPasses']} |",
        f"| Median duration | {format_ms(payload['aggregateMetrics']['medianDurationMs'])} |",
        f"| Mean duration | {format_ms(payload['aggregateMetrics']['meanDurationMs'])} |",
        f"| Median tokens/sec | {format_tps(payload['aggregateMetrics']['medianTokensPerSecond'])} |",
        f"| Mean tokens/sec | {format_tps(payload['aggregateMetrics']['meanTokensPerSecond'])} |",
        f"| Median output chars | {int(round(payload['aggregateMetrics']['medianOutputChars'])) if payload['aggregateMetrics']['medianOutputChars'] is not None else 'n/a'} |",
        "",
        "## Task Results",
        "",
        "| Task | Runs | Successes | Median Duration | Median Tokens/sec | Quality Passes |",
        "|---|---:|---:|---:|---:|---:|",
    ]
    for task in TASKS:
        result = task_results[task["taskId"]]
        lines.append(
            f"| {task['title']} | {result['runs']} | {result['successes']} | {format_ms(result['medianDurationMs'])} | {format_tps(result['medianTokensPerSecond'])} | {result['qualityPasses']} |"
        )
    lines.extend(["", "## Suitability Assessment", ""])
    for task in TASKS:
        task_id = task["taskId"]
        lines.append(f"- {task['title']}: `{payload['suitabilityAssessment'][task_id]}`")
    lines.extend(["", "## Recommended Use In Paperclip", ""])
    for item in payload["recommendedUseInPaperclip"]:
        lines.append(f"- {item}")
    lines.extend(
        [
            "",
            "## Caveats",
            "",
            "- Small synthetic benchmark only.",
            "- No private repository code was tested.",
            "- No cloud-model comparison was run.",
            "- No long-context test was included.",
            "- No routing behavior was changed.",
        ]
    )
    if payload["warnings"]:
        lines.extend(["", "## Warnings", ""])
        for warning in payload["warnings"]:
            lines.append(f"- {warning}")
    return "\n".join(lines) + "\n"


def validate(payload: dict[str, Any], report_text: str) -> None:
    missing = [key for key in TOP_LEVEL_KEYS if key not in payload]
    if missing:
        raise RuntimeError(f"Missing top-level keys: {', '.join(missing)}")
    if "# Ollama Smoke Benchmark" not in report_text:
        raise RuntimeError("Markdown report header is missing.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Local Ollama smoke benchmark.")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--report-out", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    json_out = Path(args.json_out).resolve()
    report_out = Path(args.report_out).resolve()
    warnings: list[str] = []

    model_verified = verify_model()
    runs: list[dict[str, Any]] = []
    for task in TASKS:
        for run_index in range(1, RUNS_PER_TASK + 1):
            run = run_single(task, run_index)
            if run.get("error"):
                warnings.append(f"{run['runId']}: {run['error']}")
            runs.append(run)

    aggregate_metrics = aggregate_runs(runs)
    task_results = per_task_results(runs)
    suitability_assessment = {task_id: suitability_for_task(summary) for task_id, summary in task_results.items()}
    payload = {
        "schemaVersion": 1,
        "privacyMode": "local_only",
        "collectedAt": iso_now(),
        "model": MODEL_NAME,
        "modelVerified": model_verified,
        "runCountPerTask": RUNS_PER_TASK,
        "totalRuns": len(runs),
        "runs": runs,
        "aggregateMetrics": aggregate_metrics,
        "taskResults": task_results,
        "suitabilityAssessment": suitability_assessment,
        "recommendedUseInPaperclip": recommended_use(suitability_assessment),
        "warnings": warnings,
    }
    report_text = build_markdown(payload)
    validate(payload, report_text)
    json_out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_out.write_text(report_text, encoding="utf-8")
    print("Validation: OK")
    print(f"JSON written: {json_out}")
    print(f"Report written: {report_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
