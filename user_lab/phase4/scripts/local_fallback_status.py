#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
POLICY_PATH = "user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json"


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def newest_file(repo_root: Path, pattern: str) -> Path | None:
    matches = sorted(repo_root.glob(pattern))
    return matches[-1] if matches else None


def newest_json(repo_root: Path, pattern: str) -> tuple[Path | None, dict[str, Any] | None]:
    path = newest_file(repo_root, pattern)
    if path is None:
        return None, None
    return path, load_json(path)


def newest_matching_json(repo_root: Path, pattern: str, predicate) -> tuple[Path | None, dict[str, Any] | None]:
    matches = sorted(repo_root.glob(pattern), reverse=True)
    for path in matches:
        payload = load_json(path)
        if predicate(payload):
            return path, payload
    return None, None


def classify_status(
    *,
    ollama_reachable: bool,
    model_detected: bool,
    policy_exists: bool,
    policy_candidate: bool,
    routing_enabled: bool | None,
    evidence_present: bool,
) -> str:
    if (
        ollama_reachable
        and model_detected
        and policy_exists
        and policy_candidate
        and routing_enabled is False
        and evidence_present
    ):
        return "available_candidate"
    if not ollama_reachable and not evidence_present:
        return "unavailable"
    if policy_exists and (not ollama_reachable or not model_detected):
        return "degraded"
    return "incomplete"


def build_report(payload: dict[str, Any]) -> str:
    policy = payload["policy"]
    ollama = payload["ollama"]
    evidence = payload["evidence"]
    recommendation = payload["operatorRecommendation"]
    lines = [
        "# Local Fallback Operator Status",
        "",
        "## Summary",
        "",
        f"- Local fallback status: `{payload['localFallbackStatus']}`",
        f"- Safe to offer manually: `{recommendation['safeToOfferManually']}`",
        f"- Safe for automatic routing: `{recommendation['safeForAutomaticRouting']}`",
        "",
        "## Routing Status",
        "",
        "Automatic routing remains disabled.",
        "",
        "## Ollama Status",
        "",
        f"- Reachable: `{ollama['reachable']}`",
        f"- Model detected: `{ollama['modelDetected']}`",
        f"- Model: `{ollama['model']}`",
        "",
        "## Policy Status",
        "",
        f"- Status: `{policy['status']}`",
        f"- Routing enabled: `{policy['routingEnabled']}`",
        "",
        "## Eligible Task Classes",
        "",
    ]
    eligible = policy.get("eligibleTaskClasses") or []
    if eligible:
        for item in eligible:
            lines.append(f"- `{item}`")
    else:
        lines.append("- None detected")
    lines.extend(
        [
            "",
            "## Ineligible Task Classes",
            "",
        ]
    )
    ineligible = policy.get("ineligibleTaskClasses") or []
    if ineligible:
        for item in ineligible:
            lines.append(f"- `{item}`")
    else:
        lines.append("- None detected")
    lines.extend(
        [
            "",
            "## Evidence",
            "",
            f"- Smoke benchmark found: `{evidence['smokeBenchmarkFound']}`",
            f"- Smoke quality pass rate: `{evidence['smokeQualityPassRate']}`",
            f"- Smoke median duration: `{evidence['medianDurationMs']}`",
            f"- Handshake demo found: `{evidence['handshakeDemoFound']}`",
            f"- Last handshake eligible cases: `{evidence['lastHandshakeEligibleCases']}`",
            f"- Last handshake rejected cases: `{evidence['lastHandshakeRejectedCases']}`",
            "",
            "## Warnings",
            "",
        ]
    )
    warnings = payload.get("warnings") or []
    if warnings:
        for warning in warnings:
            lines.append(f"- {warning}")
    else:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Operator Recommendation",
            "",
            f"- {recommendation['summary']}",
            "",
            "## Next Safe Step",
            "",
            f"- {recommendation['recommendedNextStep']}",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summarize local fallback operator status.")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--report-out", required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    json_out = Path(args.json_out).resolve()
    report_out = Path(args.report_out).resolve()

    warnings: list[str] = []

    policy_path = repo_root / POLICY_PATH
    policy_exists = policy_path.exists()
    policy = load_json(policy_path) if policy_exists else {}
    policy_status = policy.get("status") if isinstance(policy, dict) else None
    routing_enabled = policy.get("routingEnabled") if isinstance(policy, dict) else None

    reachability_path, reachability = newest_json(repo_root, "user_lab/phase4/profiles/ollama_reachability_*.json")
    smoke_path, smoke = newest_json(repo_root, "user_lab/phase4/benchmarks/ollama_smoke_*.json")
    prototype_path, prototype = newest_matching_json(
        repo_root,
        "user_lab/phase4/prototype_runs/local_fallback_*.json",
        lambda payload: payload.get("mode") == "demo",
    )
    handshake_demo_path, handshake_demo = newest_matching_json(
        repo_root,
        "user_lab/phase4/handshake_runs/local_fallback_handshake_*.json",
        lambda payload: payload.get("mode") == "demo",
    )

    ollama_payload = reachability.get("ollama") if isinstance(reachability, dict) else {}
    models = ollama_payload.get("modelsDetected") if isinstance(ollama_payload, dict) else []
    model_name = None
    if isinstance(models, list) and models:
        first = models[0]
        if isinstance(first, dict):
            model_name = first.get("name")
    ollama_reachable = bool(ollama_payload.get("apiReachable")) if isinstance(ollama_payload, dict) else False
    model_detected = bool(model_name)

    if reachability_path is None:
        warnings.append("No Ollama reachability artifact was found.")
    if smoke_path is None:
        warnings.append("No local smoke benchmark artifact was found.")
    if handshake_demo_path is None:
        warnings.append("No handshake demo artifact was found.")
    if prototype_path is None:
        warnings.append("No local fallback prototype demo artifact was found.")
    if not policy_exists:
        warnings.append("No local fallback policy file was found.")

    eligible_classes: list[str] = []
    raw_eligible = policy.get("eligibleTaskClasses") if isinstance(policy, dict) else None
    if isinstance(raw_eligible, list):
        for item in raw_eligible:
            if isinstance(item, dict) and isinstance(item.get("id"), str):
                eligible_classes.append(item["id"])

    ineligible_classes = [
        item for item in (policy.get("ineligibleTaskClasses") if isinstance(policy, dict) else []) if isinstance(item, str)
    ]

    smoke_pass_rate = None
    smoke_median_duration = None
    if isinstance(smoke, dict):
        total_runs = smoke.get("totalRuns")
        quality_passes = (smoke.get("aggregateMetrics") or {}).get("qualityPasses")
        smoke_median_duration = (smoke.get("aggregateMetrics") or {}).get("medianDurationMs")
        if isinstance(total_runs, int) and total_runs > 0 and isinstance(quality_passes, int):
            smoke_pass_rate = quality_passes / total_runs

    handshake_eligible = None
    handshake_rejected = None
    if isinstance(handshake_demo, dict):
        summary = handshake_demo.get("summary") or {}
        handshake_eligible = summary.get("eligible")
        handshake_rejected = summary.get("rejected")

    evidence_present = any(path is not None for path in (smoke_path, prototype_path, handshake_demo_path))
    local_status = classify_status(
        ollama_reachable=ollama_reachable,
        model_detected=model_detected,
        policy_exists=policy_exists,
        policy_candidate=policy_status == "candidate",
        routing_enabled=routing_enabled if isinstance(routing_enabled, bool) else None,
        evidence_present=evidence_present,
    )

    safe_to_offer_manually = local_status == "available_candidate"
    safe_for_automatic_routing = False
    if local_status != "available_candidate":
        recommendation_summary = "Local fallback is not fully ready for manual operator offering yet. Review missing or degraded artifacts before using it."
        next_step = "Refresh the missing or degraded Phase 4 artifacts before offering the local fallback path manually."
    else:
        recommendation_summary = (
            "Local fallback is available as a manual candidate for short summaries, small code explanations, and short policy text. "
            "It is not safe for automatic routing yet."
        )
        next_step = (
            "Use the local fallback path only as an explicit manual option, and keep automatic routing disabled until a later operator-facing "
            "or diagnostics-facing experiment validates a stronger-model fallback handoff."
        )

    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": iso_now(),
        "routingEnabled": False,
        "localFallbackStatus": local_status,
        "ollama": {
            "reachable": ollama_reachable,
            "modelDetected": model_detected,
            "model": model_name,
            "artifact": str(reachability_path.relative_to(repo_root)) if reachability_path else None,
        },
        "policy": {
            "status": policy_status,
            "eligibleTaskClasses": eligible_classes,
            "ineligibleTaskClasses": ineligible_classes,
            "routingEnabled": routing_enabled,
            "artifact": POLICY_PATH if policy_exists else None,
        },
        "evidence": {
            "smokeBenchmarkFound": smoke_path is not None,
            "smokeQualityPassRate": smoke_pass_rate,
            "medianDurationMs": smoke_median_duration,
            "smokeArtifact": str(smoke_path.relative_to(repo_root)) if smoke_path else None,
            "prototypeDemoFound": prototype_path is not None,
            "prototypeArtifact": str(prototype_path.relative_to(repo_root)) if prototype_path else None,
            "handshakeDemoFound": handshake_demo_path is not None,
            "lastHandshakeEligibleCases": handshake_eligible,
            "lastHandshakeRejectedCases": handshake_rejected,
            "handshakeArtifact": str(handshake_demo_path.relative_to(repo_root)) if handshake_demo_path else None,
        },
        "operatorRecommendation": {
            "summary": recommendation_summary,
            "safeToOfferManually": safe_to_offer_manually,
            "safeForAutomaticRouting": safe_for_automatic_routing,
            "recommendedNextStep": next_step,
        },
        "warnings": warnings,
    }

    report = build_report(payload)
    json_out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_out.write_text(report, encoding="utf-8")
    print("Validation: OK")
    print(f"JSON written: {json_out}")
    print(f"Report written: {report_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
