#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TASK_PROMPTS = {
    "local_short_summary": "Summarize the following text in 2-3 concise bullet points. Do not add facts not present in the text.",
    "local_small_code_explanation": "Explain the following small code snippet clearly and briefly. Do not suggest code changes unless asked. Do not invent surrounding files or behavior.",
    "local_short_policy_text": "Write a concise local-only recommendation based only on the input. Mention uncertainty if evidence is limited. Keep it under the requested word limit.",
}
DEMO_INPUTS = {
    "local_short_summary": "Paperclip is a local AI desktop environment that can inspect repositories, run tests, and help optimize the user's AI workflows while preferring truthful observations and reversible changes.",
    "local_small_code_explanation": "function classifyPath(path: string) {\n  return {\n    containsNonAscii: [...path].some((ch) => ch.charCodeAt(0) > 127),\n    containsPercentEncoding: /%[0-9A-Fa-f]{2}/.test(path),\n  };\n}",
    "local_short_policy_text": "We have a small synthetic benchmark showing the local model handles short summaries and tiny code explanations reasonably well, but exact JSON tasks failed.",
}
POLICY_SOURCE = "user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json"
SCHEMA_VERSION = 1


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def http_get_json(url: str, timeout: float = 4.0) -> dict[str, Any]:
    request = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8", errors="replace"))


def http_post_json(url: str, payload: dict[str, Any], timeout: float = 60.0) -> tuple[int | None, dict[str, Any] | None, str | None]:
    encoded = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        url,
        data=encoded,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, json.loads(response.read().decode("utf-8", errors="replace")), None
    except urllib.error.HTTPError as exc:
        try:
            parsed = json.loads(exc.read().decode("utf-8", errors="replace"))
        except json.JSONDecodeError:
            parsed = None
        return exc.code, parsed, f"http_error_{exc.code}"
    except Exception as exc:
        return None, None, str(exc)


def count_words(text: str) -> int:
    return len([word for word in text.split() if word.strip()])


def bullet_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip() and line.strip().startswith(("-", "*", "•"))]


def load_policy(repo_root: Path) -> dict[str, Any]:
    policy_path = repo_root / POLICY_SOURCE
    policy = load_json(policy_path)
    if policy.get("status") != "candidate":
        raise RuntimeError("Policy status was not 'candidate'.")
    if policy.get("routingEnabled") is not False:
        raise RuntimeError("Policy routingEnabled must remain false for the lab prototype.")
    model = policy.get("model") if isinstance(policy.get("model"), dict) else {}
    if model.get("name") != "gemma4:e4b":
        raise RuntimeError("Policy model name did not match gemma4:e4b.")
    if model.get("runtime") != "ollama":
        raise RuntimeError("Policy runtime did not match ollama.")
    return policy


def eligible_map(policy: dict[str, Any]) -> dict[str, dict[str, Any]]:
    items = policy.get("eligibleTaskClasses")
    if not isinstance(items, list):
        return {}
    mapping: dict[str, dict[str, Any]] = {}
    for item in items:
        if not isinstance(item, dict):
            continue
        task_id = item.get("id")
        if isinstance(task_id, str):
            mapping[task_id] = item
    return mapping


def verify_ollama_model(policy: dict[str, Any]) -> tuple[bool, str | None]:
    model = policy["model"]["name"]
    endpoint = policy["model"]["endpoint"]
    try:
        payload = http_get_json(f"{endpoint}/api/tags")
    except Exception as exc:
        return False, f"Ollama API was not reachable: {exc}"
    models = payload.get("models")
    if not isinstance(models, list):
        return False, "Ollama /api/tags did not return a models list."
    for item in models:
        if isinstance(item, dict) and item.get("name") == model:
            return True, None
    return False, f"Model {model} was not present in /api/tags."


def build_prompt(task_class: str, input_text: str, max_output_words: int, requested_word_limit: int | None) -> str:
    instruction = TASK_PROMPTS[task_class]
    if task_class == "local_short_policy_text":
        word_limit = requested_word_limit if requested_word_limit is not None else max_output_words
        instruction = f"{instruction} Keep it under {word_limit} words."
    return f"{instruction}\n\nInput:\n{input_text}"


def quality_check(task_class: str, output: str, max_output_words: int) -> dict[str, Any]:
    notes: list[str] = []
    output_words = count_words(output)
    lowered = output.lower()
    if output_words > max_output_words:
        notes.append(f"Output exceeded maxOutputWords ({max_output_words}).")

    if task_class == "local_short_summary":
        bullets = bullet_lines(output)
        if len(bullets) < 2 or len(bullets) > 3:
            notes.append("Expected 2-3 bullet-like lines.")
    elif task_class == "local_small_code_explanation":
        if not any(token in lowered for token in ["function", "string", "boolean", "object", "path", "snippet"]):
            notes.append("Did not mention a relevant code concept.")
        if "file" in lowered or "files" in lowered:
            notes.append("Claimed to inspect files or surrounding file state.")
        if "should change" in lowered or "you should change" in lowered or "refactor" in lowered:
            notes.append("Suggested edits even though edits were not requested.")
    elif task_class == "local_short_policy_text":
        if not any(token in lowered for token in ["uncertain", "limited", "evidence", "based on"]):
            notes.append("Did not mention uncertainty or evidence limits.")

    return {"passed": not notes, "notes": notes}


def single_error_result(policy: dict[str, Any], task_class: str | None, error_type: str, message: str, **extra: Any) -> dict[str, Any]:
    result: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "prototype": "local_fallback",
        "routingEnabled": False,
        "ok": False,
        "taskClass": task_class,
        "model": policy["model"]["name"],
        "runtime": policy["model"]["runtime"],
        "policySource": POLICY_SOURCE,
        "warnings": [],
        "errorType": error_type,
        "message": message,
        "error": message,
    }
    result.update(extra)
    return result


def run_task(policy: dict[str, Any], task_class: str, input_text: str, requested_word_limit: int | None = None) -> dict[str, Any]:
    eligible = eligible_map(policy)
    if task_class not in eligible:
        return single_error_result(
            policy,
            task_class,
            "task_class_not_eligible",
            f"Task class {task_class!r} is not eligible for local fallback.",
            eligibleTaskClasses=sorted(eligible.keys()),
        )

    task_policy = eligible[task_class]
    max_input_chars = int(task_policy["maxInputChars"])
    max_output_words = int(task_policy["maxOutputWords"])
    input_chars = len(input_text)
    if input_chars > max_input_chars:
        return single_error_result(
            policy,
            task_class,
            "input_too_large",
            f"Input exceeded the policy limit for {task_class}.",
            inputChars=input_chars,
            maxInputChars=max_input_chars,
        )

    available, availability_error = verify_ollama_model(policy)
    if not available:
        return single_error_result(
            policy,
            task_class,
            "local_model_unavailable",
            availability_error or "Local model was unavailable.",
            model=policy["model"]["name"],
        )

    prompt = build_prompt(task_class, input_text, max_output_words, requested_word_limit)
    payload = {
        "model": policy["model"]["name"],
        "prompt": prompt,
        "stream": False,
        "think": False,
        "options": {
            "temperature": float(policy["recommendedOptions"]["temperature"]),
        },
    }
    attempts = 0
    status: int | None = None
    response: dict[str, Any] | None = None
    error: str | None = None
    start = datetime.now(timezone.utc)
    while attempts < 2:
        attempts += 1
        status, response, error = http_post_json(f"{policy['model']['endpoint']}/api/generate", payload, timeout=60.0)
        if error is None or "timed out" not in (error or "").lower():
            break
    end = datetime.now(timezone.utc)
    duration_ms = int((end - start).total_seconds() * 1000)

    output = ""
    eval_count = None
    eval_duration_ns = None
    tokens_per_second = None
    warnings: list[str] = []
    if isinstance(response, dict):
        output = str(response.get("response") or "")
        eval_count = response.get("eval_count") if isinstance(response.get("eval_count"), int) else None
        eval_duration_ns = response.get("eval_duration") if isinstance(response.get("eval_duration"), int) else None
        if isinstance(eval_count, int) and isinstance(eval_duration_ns, int) and eval_duration_ns > 0:
            tokens_per_second = float(eval_count) / (float(eval_duration_ns) / 1_000_000_000)
        if response.get("done_reason") == "length":
            warnings.append("Generation ended because the model hit its length limit.")
    else:
        warnings.append("No structured Ollama response payload was returned.")

    quality = quality_check(task_class, output, max_output_words)
    return {
        "schemaVersion": SCHEMA_VERSION,
        "prototype": "local_fallback",
        "routingEnabled": False,
        "ok": error is None and status == 200 and bool(output.strip()),
        "taskClass": task_class,
        "model": policy["model"]["name"],
        "runtime": policy["model"]["runtime"],
        "policySource": POLICY_SOURCE,
        "inputChars": input_chars,
        "maxInputChars": max_input_chars,
        "durationMs": duration_ms,
        "tokensPerSecond": tokens_per_second,
        "evalCount": eval_count,
        "evalDurationNs": eval_duration_ns,
        "outputWords": count_words(output),
        "maxOutputWords": max_output_words,
        "output": output,
        "qualityCheck": quality,
        "warnings": warnings,
        "error": error,
    }


def build_single_report(result: dict[str, Any], policy: dict[str, Any]) -> str:
    lines = [
        "# Local Fallback Prototype Run",
        "",
        "## Summary",
        "",
        f"- Prototype: `{result['prototype']}`",
        f"- Success: `{result['ok']}`",
        f"- Task class: `{result['taskClass']}`",
        "",
        "## Policy",
        "",
        f"- Policy source: `{result['policySource']}`",
        f"- Policy status: `{policy['status']}`",
        "",
        "## Model",
        "",
        f"- Model: `{result['model']}`",
        f"- Runtime: `{result['runtime']}`",
        f"- Endpoint: `{policy['model']['endpoint']}`",
        "",
        "## Task Class",
        "",
        f"- `{result['taskClass']}`",
        "",
        "## Input Limits",
        "",
        f"- Input chars: `{result.get('inputChars', 'n/a')}`",
        f"- Max input chars: `{result.get('maxInputChars', 'n/a')}`",
        f"- Output words: `{result.get('outputWords', 'n/a')}`",
        f"- Max output words: `{result.get('maxOutputWords', 'n/a')}`",
        "",
        "## Result",
        "",
        f"- Error: `{result.get('error') or 'none'}`",
        "",
        "## Performance",
        "",
        f"- Duration: `{result.get('durationMs', 'n/a')} ms`",
        f"- Tokens/sec: `{result.get('tokensPerSecond') if result.get('tokensPerSecond') is not None else 'n/a'}`",
        f"- Eval count: `{result.get('evalCount', 'n/a')}`",
        "",
        "## Quality Check",
        "",
        f"- Passed: `{result.get('qualityCheck', {}).get('passed')}`",
    ]
    for note in result.get("qualityCheck", {}).get("notes", []):
        lines.append(f"- Note: {note}")
    lines.extend(
        [
            "",
            "## Warnings",
            "",
        ]
    )
    if result.get("warnings"):
        for warning in result["warnings"]:
            lines.append(f"- {warning}")
    else:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Routing Status",
            "",
            "Routing remains disabled. This was a manual lab prototype run only.",
            "",
            "## Recommendation",
            "",
            "- Use this prototype only for manual lab validation of eligible task classes.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_demo_report(payload: dict[str, Any], policy: dict[str, Any]) -> str:
    lines = [
        "# Local Fallback Prototype Run",
        "",
        "## Summary",
        "",
        f"- Prototype: `{payload['prototype']}`",
        f"- Mode: `demo`",
        f"- Successful runs: `{sum(1 for run in payload['runs'] if run.get('ok'))} / {len(payload['runs'])}`",
        "",
        "## Policy",
        "",
        f"- Policy source: `{payload['policySource']}`",
        f"- Policy status: `{policy['status']}`",
        "",
        "## Model",
        "",
        f"- Model: `{policy['model']['name']}`",
        f"- Runtime: `{policy['model']['runtime']}`",
        f"- Endpoint: `{policy['model']['endpoint']}`",
        "",
        "## Task Class",
        "",
        "- `local_short_summary`",
        "- `local_small_code_explanation`",
        "- `local_short_policy_text`",
        "",
        "## Input Limits",
        "",
        "| Task Class | Max Input Chars | Max Output Words |",
        "|---|---:|---:|",
    ]
    for run in payload["runs"]:
        lines.append(
            f"| {run['taskClass']} | {run.get('maxInputChars', 'n/a')} | {run.get('maxOutputWords', 'n/a')} |"
        )
    lines.extend(
        [
            "",
            "## Result",
            "",
            f"- All runs successful: `{all(run.get('ok') for run in payload['runs'])}`",
            "",
            "## Performance",
            "",
            "| Task Class | Duration | Tokens/sec | Output Words |",
            "|---|---:|---:|---:|",
        ]
    )
    for run in payload["runs"]:
        lines.append(
            f"| {run['taskClass']} | {run.get('durationMs', 'n/a')} ms | {run.get('tokensPerSecond') if run.get('tokensPerSecond') is not None else 'n/a'} | {run.get('outputWords', 'n/a')} |"
        )
    lines.extend(
        [
            "",
            "## Quality Check",
            "",
            "| Task Class | Passed | Notes |",
            "|---|---|---|",
        ]
    )
    for run in payload["runs"]:
        notes = "; ".join(run.get("qualityCheck", {}).get("notes", [])) or "none"
        lines.append(f"| {run['taskClass']} | {run.get('qualityCheck', {}).get('passed')} | {notes} |")
    lines.extend(
        [
            "",
            "## Warnings",
            "",
        ]
    )
    if payload.get("warnings"):
        for warning in payload["warnings"]:
            lines.append(f"- {warning}")
    else:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Demo Results",
        "",
        "| Task Class | OK | Duration | Output Words | Quality |",
        "|---|---|---:|---:|---|",
        ]
    )
    for run in payload["runs"]:
        lines.append(
            f"| {run['taskClass']} | {run['ok']} | {run.get('durationMs', 'n/a')} ms | {run.get('outputWords', 'n/a')} | {run.get('qualityCheck', {}).get('passed')} |"
        )
    lines.extend(
        [
            "",
            "## Routing Status",
            "",
            "Routing remains disabled. This was a manual lab prototype run only.",
            "",
            "## Recommendation",
            "",
            "- The prototype is viable only for the narrow eligible classes that pass the policy and return acceptable local outputs.",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manual local fallback lab prototype.")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--report-out", required=True)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--task-class")
    parser.add_argument("--input")
    parser.add_argument("--word-limit", type=int)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    json_out = Path(args.json_out).resolve()
    report_out = Path(args.report_out).resolve()
    policy = load_policy(repo_root)

    if args.demo:
        runs = [run_task(policy, task_class, DEMO_INPUTS[task_class]) for task_class in DEMO_INPUTS]
        payload = {
            "schemaVersion": SCHEMA_VERSION,
            "prototype": "local_fallback",
            "routingEnabled": False,
            "ok": all(run.get("ok") for run in runs),
            "mode": "demo",
            "policySource": POLICY_SOURCE,
            "runs": runs,
            "warnings": [],
        }
        report = build_demo_report(payload, policy)
    else:
        if not args.task_class or args.input is None:
            raise RuntimeError("Manual mode requires both --task-class and --input.")
        payload = run_task(policy, args.task_class, args.input, args.word_limit)
        report = build_single_report(payload, policy)

    json_out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_out.write_text(report, encoding="utf-8")
    print("Validation: OK")
    print(f"JSON written: {json_out}")
    print(f"Report written: {report_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
