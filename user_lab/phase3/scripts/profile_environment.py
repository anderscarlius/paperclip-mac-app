#!/usr/bin/env python3
from __future__ import annotations

import argparse
import importlib.metadata
import json
import os
import platform
import re
import shutil
import subprocess
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


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
BASE_URL_ENV_KEYS = [
    "OPENAI_BASE_URL",
    "OPENROUTER_BASE_URL",
    "ANTHROPIC_BASE_URL",
    "GOOGLE_BASE_URL",
    "GOOGLE_GENAI_BASE_URL",
    "MISTRAL_BASE_URL",
    "TOGETHER_BASE_URL",
    "OLLAMA_HOST",
]
TOP_LEVEL_KEYS = [
    "schemaVersion",
    "privacyMode",
    "collectedAt",
    "system",
    "pathClass",
    "aiStack",
    "devStack",
    "externalLlmPresence",
    "paperclipSignals",
    "warnings",
    "recommendedNextMeasurements",
]
KNOWN_APP_PATHS = {
    "lmStudio": [
        Path("/Applications/LM Studio.app"),
        Path.home() / "Applications" / "LM Studio.app",
    ],
    "vscode": [
        Path("/Applications/Visual Studio Code.app"),
        Path.home() / "Applications" / "Visual Studio Code.app",
    ],
    "cursor": [
        Path("/Applications/Cursor.app"),
        Path.home() / "Applications" / "Cursor.app",
    ],
}


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def relative_to_repo(path: Path, repo_root: Path) -> str:
    try:
        return str(path.relative_to(repo_root))
    except ValueError:
        return str(path)


def human_bytes(num_bytes: int | None) -> str:
    if num_bytes is None:
        return "unknown"
    value = float(num_bytes)
    units = ["B", "KB", "MB", "GB", "TB"]
    unit = units[0]
    for candidate in units:
        unit = candidate
        if value < 1024 or candidate == units[-1]:
            break
        value /= 1024
    if unit == "B":
        return f"{int(value)} {unit}"
    return f"{value:.1f} {unit}"


def has_combining_marks(text: str) -> bool:
    return any(unicodedata.category(char).startswith("M") for char in text)


def classify_path(path_value: str) -> dict[str, Any]:
    contains_percent_encoding = bool(PERCENT_ENCODING_RE.search(path_value))
    contains_spaces = bool(SPACES_RE.search(path_value))
    contains_non_ascii = bool(NON_ASCII_RE.search(path_value))
    normalized_nfc = unicodedata.normalize("NFC", path_value) if path_value else path_value
    normalized_nfd = unicodedata.normalize("NFD", path_value) if path_value else path_value
    contains_decomposed_unicode = bool(
        path_value
        and (has_combining_marks(path_value) or normalized_nfc != path_value or normalized_nfd != path_value)
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


def run_command(command: list[str], timeout: float = 4.0) -> dict[str, Any]:
    executable = shutil.which(command[0])
    if executable is None:
        return {
            "ok": False,
            "found": False,
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
            "ok": completed.returncode == 0,
            "found": True,
            "exitCode": completed.returncode,
            "stdout": completed.stdout.strip(),
            "stderr": completed.stderr.strip(),
            "timedOut": False,
        }
    except subprocess.TimeoutExpired as exc:
        return {
            "ok": False,
            "found": True,
            "exitCode": None,
            "stdout": (exc.stdout or "").strip() if isinstance(exc.stdout, str) else "",
            "stderr": (exc.stderr or "").strip() if isinstance(exc.stderr, str) else "",
            "timedOut": True,
        }
    except Exception as exc:  # pragma: no cover - defensive fallback
        return {
            "ok": False,
            "found": True,
            "exitCode": None,
            "stdout": "",
            "stderr": str(exc),
            "timedOut": False,
        }


def first_line(text: str) -> str | None:
    for line in text.splitlines():
        trimmed = line.strip()
        if trimmed:
            return trimmed
    return None


def command_version(command: list[str], timeout: float = 4.0) -> dict[str, Any]:
    result = run_command(command, timeout=timeout)
    return {
        "installed": result["found"],
        "version": first_line(result["stdout"]) if result["ok"] else None,
        "timedOut": result["timedOut"],
    }


def command_presence(command_name: str) -> bool:
    return shutil.which(command_name) is not None


def detect_app_presence(app_key: str) -> bool:
    return any(path.exists() for path in KNOWN_APP_PATHS[app_key])


def parse_sysctl_value(name: str) -> str | None:
    result = run_command(["sysctl", "-n", name], timeout=3.0)
    if result["ok"] and result["stdout"]:
        return result["stdout"].strip()
    return None


def parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def parse_memory_string(value: str | None) -> int | None:
    if not value:
        return None
    match = re.match(r"^\s*([0-9]+(?:\.[0-9]+)?)\s*([KMGTP]?B)\s*$", value.strip(), re.IGNORECASE)
    if not match:
        return None
    amount = float(match.group(1))
    unit = match.group(2).upper()
    unit_scale = {
        "KB": 1024,
        "MB": 1024**2,
        "GB": 1024**3,
        "TB": 1024**4,
        "PB": 1024**5,
    }.get(unit)
    if unit_scale is None:
        return None
    return int(amount * unit_scale)


def parse_processor_counts(value: str | None) -> tuple[int | None, int | None]:
    if not value:
        return (None, None)
    match = re.match(r"^proc\s+(\d+):(\d+):(\d+):(\d+)$", value.strip())
    if not match:
        return (None, None)
    total = int(match.group(1))
    return (total, total)


def load_hardware_profile() -> dict[str, Any]:
    result = run_command(["system_profiler", "SPHardwareDataType", "-json"], timeout=10.0)
    if not result["ok"] or not result["stdout"]:
        return {}
    try:
        payload = json.loads(result["stdout"])
    except json.JSONDecodeError:
        return {}
    items = payload.get("SPHardwareDataType")
    if not isinstance(items, list) or not items:
        return {}
    first = items[0] if isinstance(items[0], dict) else {}
    return first if isinstance(first, dict) else {}


def load_display_profile() -> dict[str, Any]:
    result = run_command(["system_profiler", "SPDisplaysDataType", "-json"], timeout=10.0)
    if not result["ok"] or not result["stdout"]:
        return {}
    try:
        payload = json.loads(result["stdout"])
    except json.JSONDecodeError:
        return {}
    return payload if isinstance(payload, dict) else {}


def detect_metal(display_profile: dict[str, Any], architecture: str) -> dict[str, Any]:
    items = display_profile.get("SPDisplaysDataType")
    if isinstance(items, list):
        metal_strings: list[str] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            for value in item.values():
                if isinstance(value, str) and "metal" in value.lower():
                    metal_strings.append(value.strip())
        if metal_strings:
            return {
                "available": True,
                "detection": "system_profiler",
                "detail": metal_strings[0],
            }
    if architecture in {"arm64", "arm64e"}:
        return {
            "available": True,
            "detection": "arm64_inference",
            "detail": "Apple Silicon Macs generally support Metal.",
        }
    return {
        "available": None,
        "detection": "not_detected",
        "detail": None,
    }


def detect_ollama(warnings: list[str]) -> dict[str, Any]:
    version_result = run_command(["ollama", "--version"], timeout=4.0)
    installed = version_result["found"]
    version = None
    combined_version_text = "\n".join(part for part in [version_result["stdout"], version_result["stderr"]] if part)
    for line in combined_version_text.splitlines():
        trimmed = line.strip()
        if not trimmed:
            continue
        match = re.search(r"(?:client version is|version)\s+([0-9][A-Za-z0-9._-]*)", trimmed, re.IGNORECASE)
        if match:
            version = match.group(1)
            break
        if "warning:" not in trimmed.lower():
            version = trimmed
            break
    models: list[str] | None = None
    running: bool | None = None
    if installed:
        list_result = run_command(["ollama", "list"], timeout=6.0)
        if list_result["ok"]:
            running = True
            parsed_models: list[str] = []
            for line in list_result["stdout"].splitlines():
                trimmed = line.strip()
                if not trimmed or trimmed.lower().startswith("name"):
                    continue
                parsed_models.append(trimmed.split()[0])
            models = parsed_models
        else:
            running = False if list_result["found"] else None
            if list_result["timedOut"]:
                warnings.append("Timed out while listing Ollama models.")
            elif list_result["stderr"]:
                warnings.append("Ollama is installed but model listing was unavailable.")
    return {
        "installed": installed,
        "version": version,
        "running": running,
        "modelNames": models,
    }


def detect_python_transformers() -> dict[str, Any]:
    try:
        version = importlib.metadata.version("transformers")
        return {
            "detected": True,
            "version": version,
        }
    except importlib.metadata.PackageNotFoundError:
        return {
            "detected": False,
            "version": None,
        }


def detect_open_webui() -> dict[str, Any]:
    command_detected = command_presence("open-webui")
    process_detected = run_command(["pgrep", "-if", "open[ -]?webui"], timeout=2.0)["ok"]
    return {
        "detected": command_detected or process_detected,
        "commandDetected": command_detected,
        "processDetected": process_detected,
    }


def detect_llama_cpp() -> dict[str, Any]:
    executables = [name for name in ["llama-server", "llama-cli", "llama-bench"] if command_presence(name)]
    return {
        "detected": bool(executables),
        "executables": executables,
    }


def detect_docker() -> dict[str, Any]:
    version = command_version(["docker", "--version"])
    server_version = None
    daemon_running: bool | None = None
    if version["installed"]:
        info = run_command(["docker", "info", "--format", "{{.ServerVersion}}"], timeout=6.0)
        if info["ok"]:
            daemon_running = True
            server_version = first_line(info["stdout"])
        else:
            daemon_running = False
    return {
        "installed": version["installed"],
        "version": version["version"],
        "daemonRunning": daemon_running,
        "serverVersion": server_version,
    }


def detect_dev_stack() -> dict[str, Any]:
    python_version = command_version(["python3", "--version"])
    pip_version = None
    if python_version["installed"]:
        pip_result = run_command(["python3", "-m", "pip", "--version"], timeout=4.0)
        pip_version = first_line(pip_result["stdout"]) if pip_result["ok"] else None

    xcode_path = run_command(["xcode-select", "-p"], timeout=3.0)
    xcode_dir_label = None
    if xcode_path["ok"] and xcode_path["stdout"]:
        xcode_dir_label = Path(xcode_path["stdout"]).name

    return {
        "git": command_version(["git", "--version"]),
        "xcodeTools": {
            "installed": xcode_path["found"] and xcode_path["ok"],
            "selectedDeveloperDirLabel": xcode_dir_label,
            "swiftVersion": command_version(["swift", "--version"], timeout=4.0)["version"],
        },
        "node": command_version(["node", "--version"]),
        "packageManagers": {
            "pnpm": command_version(["pnpm", "--version"]),
            "npm": command_version(["npm", "--version"]),
            "yarn": command_version(["yarn", "--version"]),
        },
        "python": {
            "installed": python_version["installed"],
            "version": python_version["version"],
        },
        "pythonTools": {
            "uv": command_version(["uv", "--version"]),
            "poetry": command_version(["poetry", "--version"]),
            "pip": {
                "installed": python_version["installed"],
                "version": pip_version,
            },
        },
        "rust": {
            "cargo": command_version(["cargo", "--version"]),
            "rustc": command_version(["rustc", "--version"]),
        },
        "go": command_version(["go", "version"]),
        "docker": detect_docker(),
        "editors": {
            "vscodeDetected": detect_app_presence("vscode") or command_presence("code"),
            "cursorDetected": detect_app_presence("cursor") or command_presence("cursor"),
        },
    }


def detect_ai_stack(architecture: str, warnings: list[str]) -> dict[str, Any]:
    display_profile = load_display_profile()
    ollama = detect_ollama(warnings)
    lm_studio_detected = detect_app_presence("lmStudio") or command_presence("lms")
    return {
        "ollama": ollama,
        "lmStudio": {
            "detected": lm_studio_detected,
        },
        "openWebUi": detect_open_webui(),
        "llamaCpp": detect_llama_cpp(),
        "pythonTransformers": detect_python_transformers(),
        "metal": detect_metal(display_profile, architecture),
    }


def detect_external_llm_presence() -> dict[str, Any]:
    base_url_vars = [name for name in BASE_URL_ENV_KEYS if bool(os.environ.get(name))]
    data: dict[str, Any] = {key: bool(os.environ.get(key)) for key in ENV_KEYS}
    data["presentBaseUrlEnvVars"] = base_url_vars
    data["anyBaseUrlEnvVarPresent"] = bool(base_url_vars)
    return data


def scan_paperclip_signals(repo_root: Path) -> dict[str, Any]:
    scan_roots = [repo_root / "user_lab" / "phase1", repo_root / "user_lab" / "phase2"]
    artifact_files: list[Path] = []
    for root in scan_roots:
        if not root.exists():
            continue
        artifact_files.extend(sorted(root.glob("*.md")))
    artifact_files = [path for path in artifact_files if path.is_file()]
    artifact_files_sorted = sorted(artifact_files, key=lambda item: item.stat().st_mtime, reverse=True)
    latest_path = artifact_files_sorted[0] if artifact_files_sorted else None
    provider = None
    model_hosting = None
    model_info_mentioned = False
    warnings_mentioned = False

    provider_patterns = [
        re.compile(r"provider:\s*`?([A-Za-z0-9._-]+)`?", re.IGNORECASE),
        re.compile(r"provider:\s*([A-Za-z0-9._-]+)", re.IGNORECASE),
    ]
    model_hosting_patterns = [
        re.compile(r"model[_ ]hosting:\s*`?([A-Za-z0-9._-]+)`?", re.IGNORECASE),
        re.compile(r"modelHosting:\s*([A-Za-z0-9._-]+)", re.IGNORECASE),
    ]

    for path in artifact_files_sorted:
        try:
            text = path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        if "modelInfo" in text:
            model_info_mentioned = True
        if "warnings" in text or "warning" in text:
            warnings_mentioned = True
        if provider is None:
            for pattern in provider_patterns:
                match = pattern.search(text)
                if match:
                    provider = match.group(1)
                    break
        if model_hosting is None:
            for pattern in model_hosting_patterns:
                match = pattern.search(text)
                if match:
                    model_hosting = match.group(1)
                    break
        if provider and model_hosting and model_info_mentioned and warnings_mentioned:
            break

    return {
        "artifactScanScope": [relative_to_repo(path, repo_root) for path in scan_roots if path.exists()],
        "artifactFilesScanned": len(artifact_files_sorted),
        "latestArtifactPath": relative_to_repo(latest_path, repo_root) if latest_path else None,
        "lastKnownProvider": provider,
        "lastKnownModelHosting": model_hosting,
        "modelInfoMentioned": model_info_mentioned,
        "warningsMentioned": warnings_mentioned,
    }


def collect_system(repo_root: Path, warnings: list[str]) -> dict[str, Any]:
    hardware = load_hardware_profile()
    sw_vers = run_command(["sw_vers"], timeout=4.0)
    sw_data: dict[str, str] = {}
    if sw_vers["ok"]:
        for line in sw_vers["stdout"].splitlines():
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            sw_data[key.strip()] = value.strip()

    cpu_brand = parse_sysctl_value("machdep.cpu.brand_string")
    if cpu_brand is None:
        cpu_brand = hardware.get("chip_type") if isinstance(hardware.get("chip_type"), str) else None
    machine_model = parse_sysctl_value("hw.model")
    if machine_model is None:
        machine_model = hardware.get("machine_model") if isinstance(hardware.get("machine_model"), str) else None
    physical_cpu_from_hardware, logical_cpu_from_hardware = parse_processor_counts(
        hardware.get("number_processors") if isinstance(hardware.get("number_processors"), str) else None
    )
    logical_cpu = (
        parse_int(parse_sysctl_value("hw.logicalcpu_max"))
        or parse_int(parse_sysctl_value("hw.logicalcpu"))
        or os.cpu_count()
        or logical_cpu_from_hardware
    )
    physical_cpu = (
        parse_int(parse_sysctl_value("hw.physicalcpu_max"))
        or parse_int(parse_sysctl_value("hw.physicalcpu"))
        or physical_cpu_from_hardware
    )
    total_memory_bytes = (
        parse_int(parse_sysctl_value("hw.memsize"))
        or parse_memory_string(hardware.get("physical_memory") if isinstance(hardware.get("physical_memory"), str) else None)
    )

    disk_usage = shutil.disk_usage(repo_root)
    architecture = platform.machine()
    if hardware and not cpu_brand:
        warnings.append("Hardware profile was available but CPU brand was not explicit.")

    return {
        "macOSVersion": sw_data.get("ProductVersion"),
        "macOSBuildVersion": sw_data.get("BuildVersion"),
        "architecture": architecture,
        "machineModel": machine_model,
        "cpuBrand": cpu_brand,
        "physicalCpuCores": physical_cpu,
        "logicalCpuCores": logical_cpu,
        "totalMemoryBytes": total_memory_bytes,
        "diskFreeBytes": disk_usage.free,
        "diskTotalBytes": disk_usage.total,
        "shell": os.environ.get("SHELL"),
        "repoRoot": str(repo_root),
    }


def observed_risks(profile: dict[str, Any]) -> list[str]:
    risks: list[str] = []
    path_class = profile["pathClass"]
    system = profile["system"]
    ai_stack = profile["aiStack"]
    dev_stack = profile["devStack"]
    paperclip_signals = profile["paperclipSignals"]

    if path_class["riskLevel"] == "medium":
        risks.append("Current repo path is medium-risk for cloud Codex websocket metadata behavior due to non-ASCII, decomposed Unicode, or percent-encoding characteristics.")
    elif path_class["riskLevel"] == "low":
        risks.append("Current repo path contains spaces, which is usually workable but still worth noting for shell-sensitive tooling.")

    disk_free = system.get("diskFreeBytes")
    disk_total = system.get("diskTotalBytes")
    if isinstance(disk_free, int) and isinstance(disk_total, int) and disk_total > 0:
        free_ratio = disk_free / disk_total
        if free_ratio < 0.10:
            risks.append("Free disk space on the current repo volume is below 10%, which can amplify Docker, build, or model-cache friction.")

    total_memory = system.get("totalMemoryBytes")
    if isinstance(total_memory, int) and total_memory < 16 * 1024**3:
        risks.append("System memory is below 16 GB, which may constrain heavier local model workflows.")

    docker = dev_stack["docker"]
    if docker["installed"] and docker["daemonRunning"] is False:
        risks.append("Docker is installed but the daemon is not currently running, so container-backed workflows may incur startup latency or fail until Docker is started.")

    if ai_stack["ollama"]["installed"] and ai_stack["ollama"]["running"] is False:
        risks.append("Ollama is installed but was not reachable during profiling, so local model workflows may need service startup before measurement.")

    if paperclip_signals.get("warningsMentioned"):
        risks.append("Recent Paperclip lab artifacts mention runtime warnings, which suggests environment-sensitive diagnostics are still relevant for this machine.")

    if not risks:
        risks.append("No obvious hard blocker was detected from this read-only baseline; deeper latency measurements are the next step.")

    return risks


def recommended_next_measurements(profile: dict[str, Any]) -> list[str]:
    recommendations: list[str] = []
    path_class = profile["pathClass"]
    ai_stack = profile["aiStack"]
    paperclip_signals = profile["paperclipSignals"]
    docker = profile["devStack"]["docker"]

    recommendations.append("Capture one controlled Paperclip cloud `codex_local` startup latency baseline on the current repo path, including time to first useful model output.")

    if path_class["riskLevel"] == "medium":
        recommendations.append("Repeat the same Paperclip cloud baseline from an ASCII-only mirror workspace to quantify the current path-class penalty on this machine.")

    if ai_stack["ollama"]["installed"]:
        recommendations.append("Measure local Ollama cold-start and warm-start latency for one representative model already present on this machine.")
    else:
        recommendations.append("If local-model work is a goal, measure the cost of introducing a minimal local stack before optimizing Paperclip around it.")

    if docker["installed"]:
        recommendations.append("Measure Docker-backed workflow startup time separately from Paperclip to distinguish container friction from model-provider friction.")

    if paperclip_signals.get("lastKnownProvider") == "openai":
        recommendations.append("Capture a fresh Paperclip run artifact and compare resolved model diagnostics, warnings, and startup timing against the new environment baseline.")

    return recommendations


def build_profile(repo_root: Path) -> dict[str, Any]:
    warnings: list[str] = []
    system = collect_system(repo_root, warnings)
    path_class = classify_path(str(repo_root))
    ai_stack = detect_ai_stack(system["architecture"], warnings)
    dev_stack = detect_dev_stack()
    external_llm_presence = detect_external_llm_presence()
    paperclip_signals = scan_paperclip_signals(repo_root)

    profile = {
        "schemaVersion": 1,
        "privacyMode": "local_only",
        "collectedAt": iso_now(),
        "system": system,
        "pathClass": path_class,
        "aiStack": ai_stack,
        "devStack": dev_stack,
        "externalLlmPresence": external_llm_presence,
        "paperclipSignals": paperclip_signals,
        "warnings": warnings,
        "recommendedNextMeasurements": [],
    }
    profile["recommendedNextMeasurements"] = recommended_next_measurements(profile)
    return profile


def markdown_bool(value: bool | None) -> str:
    if value is True:
        return "yes"
    if value is False:
        return "no"
    return "unknown"


def tool_display(entry: dict[str, Any]) -> str:
    version = entry.get("version")
    installed = entry.get("installed")
    if version:
        return str(version)
    if installed:
        return "present (version unavailable)"
    return "not_detected"


def build_report(profile: dict[str, Any]) -> str:
    system = profile["system"]
    path_class = profile["pathClass"]
    ai_stack = profile["aiStack"]
    dev_stack = profile["devStack"]
    paperclip_signals = profile["paperclipSignals"]
    risks = observed_risks(profile)

    lines = [
        "# User Environment Baseline",
        "",
        "## Summary",
        "",
        f"- Collected at: `{profile['collectedAt']}`",
        f"- Repo path risk level: `{path_class['riskLevel']}`",
        f"- Last known Paperclip provider signal: `{paperclip_signals['lastKnownProvider'] or 'unknown'}`",
        f"- Last known Paperclip model hosting signal: `{paperclip_signals['lastKnownModelHosting'] or 'unknown'}`",
        "",
        "## System",
        "",
        f"- macOS: `{system['macOSVersion'] or 'unknown'}` (build `{system['macOSBuildVersion'] or 'unknown'}`)",
        f"- Architecture: `{system['architecture'] or 'unknown'}`",
        f"- Machine model: `{system['machineModel'] or 'unknown'}`",
        f"- CPU: `{system['cpuBrand'] or 'unknown'}`",
        f"- Physical CPU cores: `{system['physicalCpuCores'] or 'unknown'}`",
        f"- Logical CPU cores: `{system['logicalCpuCores'] or 'unknown'}`",
        f"- Memory: `{human_bytes(system['totalMemoryBytes'])}`",
        f"- Free disk on repo volume: `{human_bytes(system['diskFreeBytes'])}` of `{human_bytes(system['diskTotalBytes'])}`",
        f"- Shell: `{system['shell'] or 'unknown'}`",
        "",
        "## Path Class",
        "",
        f"- Repo root: `{system['repoRoot']}`",
        f"- ASCII safe: `{markdown_bool(path_class['asciiSafe'])}`",
        f"- Contains spaces: `{markdown_bool(path_class['containsSpaces'])}`",
        f"- Contains non-ASCII: `{markdown_bool(path_class['containsNonAscii'])}`",
        f"- Contains decomposed Unicode: `{markdown_bool(path_class['containsDecomposedUnicode'])}`",
        f"- Contains percent encoding: `{markdown_bool(path_class['containsPercentEncoding'])}`",
        f"- Risk level: `{path_class['riskLevel']}`",
        f"- Reasons: `{', '.join(path_class['reasons']) if path_class['reasons'] else 'none'}`",
        "",
        "## AI Stack",
        "",
        f"- Ollama installed: `{markdown_bool(ai_stack['ollama']['installed'])}`",
        f"- Ollama version: `{ai_stack['ollama']['version'] or 'unknown'}`",
        f"- Ollama running: `{markdown_bool(ai_stack['ollama']['running'])}`",
        f"- Ollama models: `{', '.join(ai_stack['ollama']['modelNames']) if ai_stack['ollama']['modelNames'] else 'none detected'}`",
        f"- LM Studio detected: `{markdown_bool(ai_stack['lmStudio']['detected'])}`",
        f"- Open WebUI detected: `{markdown_bool(ai_stack['openWebUi']['detected'])}`",
        f"- llama.cpp detected: `{markdown_bool(ai_stack['llamaCpp']['detected'])}`",
        f"- Python transformers detected: `{markdown_bool(ai_stack['pythonTransformers']['detected'])}`",
        f"- Python transformers version: `{ai_stack['pythonTransformers']['version'] or 'not_detected'}`",
        f"- Metal available: `{markdown_bool(ai_stack['metal']['available'])}`",
        f"- Metal detection: `{ai_stack['metal']['detection']}`",
        "",
        "## Dev Stack",
        "",
        f"- git: `{tool_display(dev_stack['git'])}`",
        f"- Swift: `{dev_stack['xcodeTools']['swiftVersion'] or 'not_detected'}`",
        f"- Xcode tools selected dir label: `{dev_stack['xcodeTools']['selectedDeveloperDirLabel'] or 'unknown'}`",
        f"- node: `{tool_display(dev_stack['node'])}`",
        f"- pnpm: `{tool_display(dev_stack['packageManagers']['pnpm'])}`",
        f"- npm: `{tool_display(dev_stack['packageManagers']['npm'])}`",
        f"- yarn: `{tool_display(dev_stack['packageManagers']['yarn'])}`",
        f"- python3: `{dev_stack['python']['version'] or 'not_detected'}`",
        f"- uv: `{tool_display(dev_stack['pythonTools']['uv'])}`",
        f"- poetry: `{tool_display(dev_stack['pythonTools']['poetry'])}`",
        f"- pip: `{dev_stack['pythonTools']['pip']['version'] or 'not_detected'}`",
        f"- cargo: `{tool_display(dev_stack['rust']['cargo'])}`",
        f"- rustc: `{tool_display(dev_stack['rust']['rustc'])}`",
        f"- go: `{tool_display(dev_stack['go'])}`",
        f"- VS Code detected: `{markdown_bool(dev_stack['editors']['vscodeDetected'])}`",
        f"- Cursor detected: `{markdown_bool(dev_stack['editors']['cursorDetected'])}`",
        "",
        "## Docker",
        "",
        f"- Docker installed: `{markdown_bool(dev_stack['docker']['installed'])}`",
        f"- Docker version: `{tool_display(dev_stack['docker'])}`",
        f"- Docker daemon running: `{markdown_bool(dev_stack['docker']['daemonRunning'])}`",
        f"- Docker server version: `{dev_stack['docker']['serverVersion'] or 'unknown'}`",
        "",
        "## External LLM Presence",
        "",
    ]

    for key in ENV_KEYS:
        lines.append(f"- {key}: `{markdown_bool(profile['externalLlmPresence'][key])}`")
    lines.extend(
        [
            f"- Base URL env vars present: `{', '.join(profile['externalLlmPresence']['presentBaseUrlEnvVars']) if profile['externalLlmPresence']['presentBaseUrlEnvVars'] else 'none'}`",
            "",
            "## Paperclip Runtime Signals",
            "",
            f"- Artifact scan scope: `{', '.join(paperclip_signals['artifactScanScope']) if paperclip_signals['artifactScanScope'] else 'none'}`",
            f"- Artifact files scanned: `{paperclip_signals['artifactFilesScanned']}`",
            f"- Latest artifact path: `{paperclip_signals['latestArtifactPath'] or 'unknown'}`",
            f"- Last known provider: `{paperclip_signals['lastKnownProvider'] or 'unknown'}`",
            f"- Last known modelHosting: `{paperclip_signals['lastKnownModelHosting'] or 'unknown'}`",
            f"- `modelInfo` appears in recent artifacts: `{markdown_bool(paperclip_signals['modelInfoMentioned'])}`",
            f"- warnings appear in recent artifacts: `{markdown_bool(paperclip_signals['warningsMentioned'])}`",
            "",
            "## Observed Risks / Bottlenecks",
            "",
        ]
    )
    for risk in risks:
        lines.append(f"- {risk}")
    lines.extend(["", "## Recommended Next Measurements", ""])
    for item in profile["recommendedNextMeasurements"]:
        lines.append(f"- {item}")
    lines.extend(["", "## Privacy Notes", ""])
    lines.extend(
        [
            "- This profile is local-only and avoids collecting API key values or token contents.",
            "- Only the current repo path is recorded verbatim because it is directly relevant to known workspace path behavior.",
            "- Paths outside the repo are avoided or reduced to booleans / sanitized labels.",
        ]
    )
    if profile["warnings"]:
        lines.extend(["", "## Collection Warnings", ""])
        for warning in profile["warnings"]:
            lines.append(f"- {warning}")
    return "\n".join(lines) + "\n"


def validate_outputs(profile: dict[str, Any], report_text: str) -> None:
    missing_keys = [key for key in TOP_LEVEL_KEYS if key not in profile]
    if missing_keys:
        raise RuntimeError(f"Missing top-level JSON keys: {', '.join(missing_keys)}")

    serialized = json.dumps(profile, indent=2, sort_keys=True)
    if "# User Environment Baseline" not in report_text:
        raise RuntimeError("Markdown report header is missing.")

    for key in ENV_KEYS:
        secret_value = os.environ.get(key)
        if secret_value and secret_value in serialized:
            raise RuntimeError(f"Secret value for {key} leaked into JSON output.")
        if secret_value and secret_value in report_text:
            raise RuntimeError(f"Secret value for {key} leaked into markdown output.")


def write_outputs(profile: dict[str, Any], json_out: Path, report_out: Path) -> None:
    report_text = build_report(profile)
    validate_outputs(profile, report_text)
    json_out.write_text(json.dumps(profile, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_out.write_text(report_text, encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Read-only local environment profiler for User Environment Optimization Lab Phase 3.")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--report-out", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    json_out = Path(args.json_out).resolve()
    report_out = Path(args.report_out).resolve()

    profile = build_profile(repo_root)
    write_outputs(profile, json_out, report_out)

    print("Validation: OK")
    print(f"JSON written: {json_out}")
    print(f"Report written: {report_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
