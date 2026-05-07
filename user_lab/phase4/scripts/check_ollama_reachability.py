#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


API_BASE_URL = "http://127.0.0.1:11434"
TOP_LEVEL_KEYS = [
    "schemaVersion",
    "privacyMode",
    "collectedAt",
    "ollama",
    "warnings",
    "recommendedNextMeasurements",
]


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def run_command(command: list[str], timeout: float = 4.0) -> dict[str, Any]:
    executable = shutil.which(command[0])
    if executable is None:
        return {
            "found": False,
            "ok": False,
            "exitCode": None,
            "stdout": "",
            "stderr": "command_not_found",
            "timedOut": False,
        }
    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            check=False,
        )
        return {
            "found": True,
            "ok": completed.returncode == 0,
            "exitCode": completed.returncode,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
            "timedOut": False,
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "found": True,
            "ok": False,
            "exitCode": None,
            "stdout": (exc.stdout or "").strip() if isinstance(exc.stdout, str) else "",
            "stderr": (exc.stderr or "").strip() if isinstance(exc.stderr, str) else "",
            "timedOut": True,
        }
    except Exception as exc:
        return {
            "found": True,
            "ok": False,
            "exitCode": None,
            "stdout": "",
            "stderr": str(exc),
            "timedOut": False,
        }


def first_non_empty_line(text: str) -> str | None:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped
    return None


def detect_ollama_version() -> tuple[str | None, dict[str, Any]]:
    result = run_command(["ollama", "--version"], timeout=4.0)
    combined = "\n".join(part for part in [result["stdout"], result["stderr"]] if part)
    for line in combined.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if "client version is " in stripped.lower():
            return stripped.split()[-1], result
        lowered = stripped.lower()
        if lowered.startswith("warning:"):
            continue
        return stripped, result
    return None, result


def http_get(url: str, timeout: float = 2.5) -> dict[str, Any]:
    request = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8", errors="replace")
            return {
                "ok": True,
                "status": response.status,
                "body": body,
                "error": None,
            }
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return {
            "ok": False,
            "status": exc.code,
            "body": body,
            "error": f"http_error_{exc.code}",
        }
    except urllib.error.URLError as exc:
        return {
            "ok": False,
            "status": None,
            "body": "",
            "error": str(exc.reason),
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": None,
            "body": "",
            "error": str(exc),
        }


def process_running(name: str) -> bool:
    result = run_command(["pgrep", "-x", name], timeout=2.0)
    return result["ok"] and bool(result["stdout"])


def detect_docker_container() -> bool | None:
    result = run_command(["docker", "ps", "--format", "{{.Image}} {{.Names}}"], timeout=4.0)
    if not result["found"]:
        return None
    if not result["ok"]:
        return False
    for line in result["stdout"].splitlines():
        lowered = line.lower()
        if "ollama" in lowered:
            return True
    return False


def sanitize_json_text(text: str) -> str:
    return text.strip() if text.strip() else "{}"


def parse_lsof_listener() -> dict[str, Any]:
    result = run_command(["lsof", "-nP", "-iTCP:11434", "-sTCP:LISTEN"], timeout=3.0)
    if not result["found"]:
        return {
            "available": False,
            "portListening": None,
            "listenerName": None,
            "portBindingClassification": "inconclusive",
        }
    if not result["ok"] or not result["stdout"]:
        return {
            "available": True,
            "portListening": False,
            "listenerName": None,
            "portBindingClassification": "port_not_bound",
        }
    lines = result["stdout"].splitlines()
    if len(lines) < 2:
        return {
            "available": True,
            "portListening": True,
            "listenerName": None,
            "portBindingClassification": "inconclusive",
        }
    first_data_line = lines[1].strip()
    listener_name = first_data_line.split()[0] if first_data_line else None
    lowered = (listener_name or "").lower()
    classification = "port_bound_by_ollama" if "ollama" in lowered else "port_bound_by_non_ollama"
    return {
        "available": True,
        "portListening": True,
        "listenerName": listener_name,
        "portBindingClassification": classification,
    }


def parse_models(tags_body: str, warnings: list[str]) -> list[dict[str, Any]]:
    try:
        payload = json.loads(sanitize_json_text(tags_body))
    except json.JSONDecodeError:
        warnings.append("Could not parse /api/tags JSON response.")
        return []
    models = payload.get("models")
    if not isinstance(models, list):
        return []
    normalized: list[dict[str, Any]] = []
    for item in models:
        if not isinstance(item, dict):
            continue
        details = item.get("details") if isinstance(item.get("details"), dict) else {}
        normalized.append(
            {
                "name": item.get("name"),
                "family": details.get("family"),
                "parameterSize": details.get("parameter_size"),
                "quantization": details.get("quantization_level"),
                "modifiedAt": item.get("modified_at"),
                "sizeBytes": item.get("size"),
                "digest": item.get("digest"),
            }
        )
    return normalized


def parse_ollama_list_models(stdout: str) -> list[dict[str, Any]]:
    models: list[dict[str, Any]] = []
    for line in stdout.splitlines():
        stripped = line.strip()
        if not stripped or stripped.lower().startswith("name"):
            continue
        parts = stripped.split()
        if not parts:
            continue
        models.append(
            {
                "name": parts[0],
                "family": None,
                "parameterSize": None,
                "quantization": None,
                "modifiedAt": None,
                "sizeBytes": None,
                "digest": None,
            }
        )
    return models


def classify_failure(
    *,
    command_detected: bool,
    api_tags_ok: bool,
    models_detected: list[dict[str, Any]],
    port_binding_classification: str,
) -> str:
    if not command_detected:
        return "not_installed"
    if api_tags_ok and models_detected:
        return "api_reachable_models_detected"
    if api_tags_ok and not models_detected:
        return "api_reachable_no_models"
    if port_binding_classification == "port_bound_by_ollama":
        return "port_bound_by_ollama"
    if port_binding_classification == "port_bound_by_non_ollama":
        return "port_bound_by_non_ollama"
    if port_binding_classification == "port_not_bound":
        return "client_installed_api_unreachable"
    return "inconclusive"


def recommended_manual_action(classification: str) -> str:
    if classification == "not_installed":
        return "Ollama does not appear to be installed. Install Ollama manually, then rerun this check."
    if classification == "client_installed_api_unreachable":
        return "Launch the Ollama app or run `ollama serve`, then rerun this check."
    if classification == "port_bound_by_ollama":
        return "Ollama appears to own port 11434. Rerun this check with direct local API access, or proceed once `/api/tags` is confirmed reachable."
    if classification == "port_bound_by_non_ollama":
        return "Port 11434 appears occupied by a non-Ollama process. Resolve that conflict manually, then rerun this check."
    if classification == "api_reachable_no_models":
        return "The Ollama API is reachable but no models were reported. Manually pull a model, then rerun this check."
    if classification == "api_reachable_models_detected":
        return "Ollama appears reachable with installed models. Proceed to Experiment 4b for lightweight local model inventory or benchmark planning."
    if classification == "api_error":
        return "The Ollama API responded unexpectedly. Inspect the local Ollama logs manually, then rerun this check."
    return "Rerun the check after confirming whether the Ollama app or `ollama serve` is running."


def build_recommended_next_measurements(classification: str) -> list[str]:
    if classification == "api_reachable_models_detected":
        return [
            "Run Experiment 4b for lightweight local model inventory and no-prompt capability checks.",
            "Compare whether Paperclip can surface local model names without changing model routing.",
        ]
    if classification == "port_bound_by_non_ollama":
        return [
            "Identify which local service owns port 11434, then rerun Experiment 4a.",
            "Only proceed to Experiment 4b after Ollama reaches a clean reachable state.",
        ]
    if classification == "api_reachable_no_models":
        return [
            "After a manual model pull, rerun Experiment 4a to confirm model discovery.",
            "Proceed to Experiment 4b only after at least one model is visible via /api/tags.",
        ]
    return [
        "Confirm whether the Ollama app or `ollama serve` is running, then rerun Experiment 4a.",
        "Only consider Experiment 4b after the local API becomes reachable.",
    ]


def build_markdown(payload: dict[str, Any]) -> str:
    ollama = payload["ollama"]
    models = ollama["modelsDetected"]
    lines = [
        "# Ollama Reachability Baseline",
        "",
        "## Summary",
        "",
        f"- Collected at: `{payload['collectedAt']}`",
        f"- Summary: `{ollama['summary']}`",
        f"- Ollama command detected: `{ollama['commandDetected']}`",
        f"- Ollama API reachable: `{ollama['apiReachable']}`",
        f"- Models detected: `{len(models)}`",
        f"- Failure classification: `{ollama['failureClassification']}`",
        "",
        "## Client Detection",
        "",
        f"- Command detected: `{ollama['commandDetected']}`",
        f"- Command path: `{ollama['commandPath'] or 'not_detected'}`",
        f"- Version: `{ollama['version'] or 'unknown'}`",
        f"- Version command success: `{ollama['versionCommandSuccess']}`",
        f"- Version command exit code: `{ollama['versionCommandExitCode'] if ollama['versionCommandExitCode'] is not None else 'n/a'}`",
        "",
        "## API Reachability",
        "",
        f"- API base URL: `{ollama['apiBaseUrl']}`",
        f"- `GET /` reachable: `{ollama['rootEndpointReachable']}`",
        f"- `GET /api/tags` reachable: `{ollama['apiReachable']}`",
        f"- Root status: `{ollama['rootEndpointStatus'] if ollama['rootEndpointStatus'] is not None else 'n/a'}`",
        f"- Tags status: `{ollama['tagsEndpointStatus'] if ollama['tagsEndpointStatus'] is not None else 'n/a'}`",
        "",
        "## Installed Models",
        "",
    ]
    if models:
        for model in models:
            lines.append(
                f"- `{model.get('name') or 'unknown'}` | family `{model.get('family') or 'unknown'}` | parameter size `{model.get('parameterSize') or 'unknown'}` | quantization `{model.get('quantization') or 'unknown'}` | size `{model.get('sizeBytes') if model.get('sizeBytes') is not None else 'unknown'}` | modified `{model.get('modifiedAt') or 'unknown'}` | digest `{model.get('digest') or 'unknown'}`"
            )
    else:
        lines.append("- No installed models were detected from `/api/tags`.")
    lines.extend(
        [
            "",
            "## Service Clues",
            "",
            f"- Port 11434 listening: `{ollama['serviceClues']['portListening']}`",
            f"- Port binding classification: `{ollama['serviceClues']['portBindingClassification']}`",
            f"- Port listener name: `{ollama['serviceClues']['listenerName'] or 'unknown'}`",
            f"- Ollama process running: `{ollama['serviceClues']['processRunning']}`",
            f"- Docker container detected: `{ollama['serviceClues']['dockerContainerDetected']}`",
            f"- `OLLAMA_HOST` present: `{ollama['serviceClues']['ollamaHostEnvPresent']}`",
            f"- `OLLAMA_HOST` value: `{ollama['serviceClues']['ollamaHostEnvValue'] or 'not_set'}`",
            f"- Manual app launch may be needed: `{ollama['serviceClues']['manualAppLaunchLikely']}`",
            "",
            "## Failure Classification",
            "",
            f"- `{ollama['failureClassification']}`",
            "",
            "## Recommended Manual Action",
            "",
            f"1. {ollama['recommendedManualAction']}",
            "",
            "## Recommended Next Measurements",
            "",
        ]
    )
    for item in payload["recommendedNextMeasurements"]:
        lines.append(f"- {item}")
    lines.extend(
        [
            "",
            "## Privacy Notes",
            "",
            "- No prompts or inference requests were sent.",
            "- No model files, source code, auth tokens, or API keys were collected.",
            "- Process checks were reduced to boolean presence rather than full command lines.",
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
    if "# Ollama Reachability Baseline" not in report_text:
        raise RuntimeError("Markdown report header is missing.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only Ollama reachability checker.")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--report-out", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    json_out = Path(args.json_out).resolve()
    report_out = Path(args.report_out).resolve()
    warnings: list[str] = []

    command_path = shutil.which("ollama")
    version, version_result = detect_ollama_version()
    tags_result = http_get(f"{API_BASE_URL}/api/tags")
    root_result = http_get(f"{API_BASE_URL}/") if not tags_result["ok"] else {"ok": True, "status": 200, "body": "", "error": None}
    models_detected = parse_models(tags_result["body"], warnings) if tags_result["ok"] else []
    lsof_info = parse_lsof_listener()
    process_running_flag = process_running("ollama") or process_running("Ollama")
    docker_container_detected = detect_docker_container()
    ollama_host = os.environ.get("OLLAMA_HOST")
    list_result = run_command(["ollama", "list"], timeout=6.0) if command_path is not None and not tags_result["ok"] else {
        "found": command_path is not None,
        "ok": False,
        "exitCode": None,
        "stdout": "",
        "stderr": "",
        "timedOut": False,
    }
    cli_models = parse_ollama_list_models(list_result["stdout"]) if list_result["ok"] else []
    if not models_detected and cli_models:
        models_detected = cli_models
    failure = classify_failure(
        command_detected=command_path is not None,
        api_tags_ok=tags_result["ok"] or bool(cli_models),
        models_detected=models_detected,
        port_binding_classification=lsof_info["portBindingClassification"],
    )
    if command_path and not tags_result["ok"] and not process_running_flag and lsof_info["portListening"] is False:
        warnings.append("Ollama client is present, but no local service process was detected during this check.")
    if command_path and not tags_result["ok"] and cli_models:
        warnings.append("Direct /api/tags reachability was inconclusive, but `ollama list` returned models.")

    if failure == "api_reachable_models_detected":
        summary = "Ollama is installed, reachable, and has at least one local model available."
    elif failure == "api_reachable_no_models":
        summary = "Ollama is installed and reachable, but no local models were reported."
    elif failure == "port_bound_by_ollama":
        summary = "Ollama appears to own port 11434, but direct API reachability was inconclusive in this environment."
    elif failure == "port_bound_by_non_ollama":
        summary = "Port 11434 is occupied, but the listener does not appear to be Ollama."
    elif failure == "client_installed_api_unreachable":
        summary = "Ollama is installed, but the local API was not reachable during this check."
    else:
        summary = "Ollama reachability remained inconclusive."

    payload = {
        "schemaVersion": 1,
        "privacyMode": "local_only",
        "collectedAt": iso_now(),
        "ollama": {
            "commandDetected": command_path is not None,
            "commandPath": command_path,
            "version": version,
            "versionCommandSuccess": version_result["ok"],
            "versionCommandExitCode": version_result["exitCode"],
            "apiReachable": tags_result["ok"] or bool(cli_models),
            "apiBaseUrl": API_BASE_URL,
            "rootEndpointReachable": root_result["ok"],
            "rootEndpointStatus": root_result["status"],
            "tagsEndpointStatus": tags_result["status"],
            "modelsDetected": models_detected,
            "paperclipLocalModelAvailabilityDetectable": bool(models_detected),
            "cliModelListReachable": list_result["ok"],
            "summary": summary,
            "serviceClues": {
                "portListening": lsof_info["portListening"],
                "portBindingClassification": lsof_info["portBindingClassification"],
                "listenerName": lsof_info["listenerName"],
                "processRunning": process_running_flag,
                "dockerContainerDetected": docker_container_detected,
                "ollamaHostEnvPresent": ollama_host is not None,
                "ollamaHostEnvValue": ollama_host,
                "manualAppLaunchLikely": command_path is not None and not tags_result["ok"] and not process_running_flag and lsof_info["portListening"] is False,
            },
            "failureClassification": failure,
            "recommendedManualAction": recommended_manual_action(failure),
        },
        "warnings": warnings,
        "recommendedNextMeasurements": build_recommended_next_measurements(failure),
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
