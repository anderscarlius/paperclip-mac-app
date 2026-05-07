#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import local_fallback_prototype as prototype


SCHEMA_VERSION = 1
EXPERIMENT = "4e"
POLICY_SOURCE = prototype.POLICY_SOURCE


DEMO_CASES = [
    {
        "caseId": "eligible_summary",
        "requestType": "local_fallback_candidate",
        "taskClass": "local_short_summary",
        "input": "Paperclip can inspect repositories, run tests, and help optimize local AI workflows while preferring truthful measurement and reversible changes.",
        "inputKind": "synthetic_text",
        "privacyBenefit": True,
        "requiresStrictJson": False,
        "requiresCodeEdit": False,
        "requiresCommandExecution": False,
        "maxOutputWords": 160,
        "userExplicitlyRequestedLocal": True,
    },
    {
        "caseId": "eligible_code_explanation",
        "requestType": "local_fallback_candidate",
        "taskClass": "local_small_code_explanation",
        "input": "function isAsciiSafe(path: string) {\n  return [...path].every((ch) => ch.charCodeAt(0) <= 127);\n}",
        "inputKind": "code_snippet",
        "privacyBenefit": True,
        "requiresStrictJson": False,
        "requiresCodeEdit": False,
        "requiresCommandExecution": False,
        "maxOutputWords": 180,
        "userExplicitlyRequestedLocal": True,
    },
    {
        "caseId": "ineligible_strict_json_extraction",
        "requestType": "local_fallback_candidate",
        "taskClass": "strict_json_extraction",
        "input": "Extract JSON from this short note and return exact schema output only.",
        "inputKind": "synthetic_text",
        "privacyBenefit": True,
        "requiresStrictJson": True,
        "requiresCodeEdit": False,
        "requiresCommandExecution": False,
        "maxOutputWords": 80,
        "userExplicitlyRequestedLocal": True,
    },
    {
        "caseId": "ineligible_code_edit",
        "requestType": "local_fallback_candidate",
        "taskClass": "local_small_code_explanation",
        "input": "Please change this helper so it rewrites files automatically.",
        "inputKind": "synthetic_text",
        "privacyBenefit": True,
        "requiresStrictJson": False,
        "requiresCodeEdit": True,
        "requiresCommandExecution": False,
        "maxOutputWords": 120,
        "userExplicitlyRequestedLocal": True,
    },
    {
        "caseId": "oversized_input",
        "requestType": "local_fallback_candidate",
        "taskClass": "local_short_summary",
        "input": "A" * 4001,
        "inputKind": "synthetic_text",
        "privacyBenefit": True,
        "requiresStrictJson": False,
        "requiresCodeEdit": False,
        "requiresCommandExecution": False,
        "maxOutputWords": 120,
        "userExplicitlyRequestedLocal": True,
    },
]


def iso_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_request(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def rejection_response(
    policy: dict[str, Any],
    request: dict[str, Any],
    error_type: str,
    reason: str,
    *,
    case_id: str | None = None,
    warnings: list[str] | None = None,
    **extra: Any,
) -> dict[str, Any]:
    response: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "experiment": EXPERIMENT,
        "routingEnabled": False,
        "caseId": case_id or request.get("caseId"),
        "ok": False,
        "decision": "rejected",
        "executionMode": "manual_local_fallback",
        "taskClass": request.get("taskClass"),
        "model": policy["model"]["name"],
        "confidence": None,
        "reason": reason,
        "warnings": warnings or [],
        "errorType": error_type,
        "recommendedFallback": "stronger_model",
        "inferenceCalled": False,
        "policySource": POLICY_SOURCE,
    }
    response.update(extra)
    return response


def eligible_response(
    policy: dict[str, Any],
    request: dict[str, Any],
    result: dict[str, Any],
    *,
    confidence: str | None,
    case_id: str | None = None,
) -> dict[str, Any]:
    reason = "Task class matches eligible local fallback policy."
    if not result.get("ok"):
        reason = "Task class matched the eligible policy, but the manual local fallback result was not acceptable."

    response: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "experiment": EXPERIMENT,
        "routingEnabled": False,
        "caseId": case_id or request.get("caseId"),
        "ok": bool(result.get("ok")),
        "decision": "eligible",
        "executionMode": "manual_local_fallback",
        "taskClass": request.get("taskClass"),
        "model": policy["model"]["name"],
        "confidence": confidence,
        "reason": reason,
        "warnings": list(result.get("warnings") or []),
        "inferenceCalled": True,
        "policySource": POLICY_SOURCE,
        "resultRef": "inline:prototypeResult",
        "durationMs": result.get("durationMs"),
        "tokensPerSecond": result.get("tokensPerSecond"),
        "qualityCheck": result.get("qualityCheck"),
        "prototypeResult": result,
    }
    if not result.get("ok"):
        response["recommendedFallback"] = "stronger_model"
    return response


def evaluate_request(policy: dict[str, Any], request: dict[str, Any], *, case_id: str | None = None) -> dict[str, Any]:
    eligible = prototype.eligible_map(policy)
    ineligible = {
        item for item in policy.get("ineligibleTaskClasses", []) if isinstance(item, str)
    }

    if request.get("requestType") != "local_fallback_candidate":
        return rejection_response(
            policy,
            request,
            "invalid_request_type",
            "The requestType must be 'local_fallback_candidate'.",
            case_id=case_id,
        )

    task_class = request.get("taskClass")
    if not isinstance(task_class, str) or not task_class:
        return rejection_response(
            policy,
            request,
            "unknown_task_class",
            "A known taskClass is required before local fallback can be considered.",
            case_id=case_id,
        )

    if task_class in ineligible:
        return rejection_response(
            policy,
            request,
            "task_class_not_eligible",
            f"{task_class} is not eligible for gemma4:e4b based on Experiment 4b and the 4c candidate policy.",
            case_id=case_id,
            eligibleTaskClasses=sorted(eligible.keys()),
        )

    if task_class not in eligible:
        return rejection_response(
            policy,
            request,
            "unknown_task_class",
            f"{task_class} is not a recognized eligible local task class.",
            case_id=case_id,
            eligibleTaskClasses=sorted(eligible.keys()),
        )

    if bool(request.get("requiresStrictJson")):
        return rejection_response(
            policy,
            request,
            "strict_json_not_supported",
            "Strict JSON or exact schema requirements are not suitable for the current local model.",
            case_id=case_id,
        )

    if bool(request.get("requiresCodeEdit")):
        return rejection_response(
            policy,
            request,
            "code_edit_not_supported",
            "Tasks requiring code edits must stay on a stronger model path.",
            case_id=case_id,
        )

    if bool(request.get("requiresCommandExecution")):
        return rejection_response(
            policy,
            request,
            "command_execution_not_supported",
            "Tasks requiring command execution planning are not eligible for local fallback.",
            case_id=case_id,
        )

    if bool(request.get("highStakesDomain")):
        return rejection_response(
            policy,
            request,
            "high_stakes_domain",
            "High-stakes domains must not be offered to the current local fallback path.",
            case_id=case_id,
        )

    if not bool(request.get("userExplicitlyRequestedLocal")):
        return rejection_response(
            policy,
            request,
            "explicit_local_request_required",
            "Local fallback may only be offered after an explicit local request or confirmation.",
            case_id=case_id,
        )

    if not bool(request.get("privacyBenefit")):
        return rejection_response(
            policy,
            request,
            "privacy_benefit_required",
            "This handshake only offers local fallback when a meaningful privacy or local-only benefit is present.",
            case_id=case_id,
        )

    task_policy = eligible[task_class]
    max_input_chars = int(task_policy["maxInputChars"])
    max_output_words = int(task_policy["maxOutputWords"])
    input_text = str(request.get("input") or "")
    input_chars = len(input_text)
    if input_chars > max_input_chars:
        return rejection_response(
            policy,
            request,
            "input_too_large",
            f"Input exceeded the policy limit for {task_class}.",
            case_id=case_id,
            inputChars=input_chars,
            maxInputChars=max_input_chars,
        )

    requested_max_output = request.get("maxOutputWords")
    if isinstance(requested_max_output, int) and requested_max_output > max_output_words:
        return rejection_response(
            policy,
            request,
            "output_budget_too_large",
            f"Requested output budget exceeded the policy limit for {task_class}.",
            case_id=case_id,
            requestedMaxOutputWords=requested_max_output,
            maxOutputWords=max_output_words,
        )

    available, availability_error = prototype.verify_ollama_model(policy)
    if not available:
        return rejection_response(
            policy,
            request,
            "local_model_unavailable",
            availability_error or "The configured local model was unavailable.",
            case_id=case_id,
        )

    result = prototype.run_task(
        policy,
        task_class,
        input_text,
        requested_word_limit=requested_max_output if isinstance(requested_max_output, int) else None,
    )
    return eligible_response(
        policy,
        request,
        result,
        confidence=str(task_policy.get("confidence")) if task_policy.get("confidence") is not None else None,
        case_id=case_id,
    )


def build_demo_payload(policy: dict[str, Any]) -> dict[str, Any]:
    cases = [evaluate_request(policy, request, case_id=str(request["caseId"])) for request in DEMO_CASES]
    eligible_count = sum(1 for case in cases if case.get("decision") == "eligible")
    rejected_count = sum(1 for case in cases if case.get("decision") == "rejected")
    inference_calls = sum(1 for case in cases if case.get("inferenceCalled"))
    return {
        "schemaVersion": SCHEMA_VERSION,
        "experiment": EXPERIMENT,
        "routingEnabled": False,
        "mode": "demo",
        "generatedAt": iso_now(),
        "policySource": POLICY_SOURCE,
        "cases": cases,
        "summary": {
            "cases": len(cases),
            "eligible": eligible_count,
            "rejected": rejected_count,
            "inferenceCalls": inference_calls,
        },
    }


def build_request_payload(policy: dict[str, Any], request: dict[str, Any]) -> dict[str, Any]:
    response = evaluate_request(policy, request)
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "experiment": EXPERIMENT,
        "routingEnabled": False,
        "mode": "request",
        "generatedAt": iso_now(),
        "policySource": POLICY_SOURCE,
        "request": request,
    }
    payload.update(response)
    return payload


def build_demo_report(payload: dict[str, Any], policy: dict[str, Any]) -> str:
    cases = payload["cases"]
    lines = [
        "# Local Fallback Integration Handshake",
        "",
        "## Summary",
        "",
        f"- Cases: `{payload['summary']['cases']}`",
        f"- Eligible: `{payload['summary']['eligible']}`",
        f"- Rejected: `{payload['summary']['rejected']}`",
        f"- Inference calls: `{payload['summary']['inferenceCalls']}`",
        "",
        "## Routing Status",
        "",
        "Automatic routing remains disabled.",
        "",
        "## Policy Source",
        "",
        f"- `{payload['policySource']}`",
        f"- Policy status: `{policy['status']}`",
        f"- Model: `{policy['model']['name']}` via `{policy['model']['runtime']}`",
        "",
        "## Demo Cases",
        "",
        "| Case | Decision | Inference Called | Reason |",
        "|---|---|---:|---|",
    ]
    for case in cases:
        lines.append(
            f"| {case.get('caseId')} | {case.get('decision')} | {str(bool(case.get('inferenceCalled'))).lower()} | {case.get('reason')} |"
        )
    lines.extend(
        [
            "",
            "## Eligible Results",
            "",
        ]
    )
    eligible_cases = [case for case in cases if case.get("decision") == "eligible"]
    if eligible_cases:
        for case in eligible_cases:
            lines.append(
                f"- `{case['caseId']}` ran local fallback in `{case.get('durationMs', 'n/a')} ms` with confidence `{case.get('confidence')}` and quality pass `{case.get('qualityCheck', {}).get('passed')}`."
            )
    else:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Rejected Results",
            "",
        ]
    )
    rejected_cases = [case for case in cases if case.get("decision") == "rejected"]
    if rejected_cases:
        for case in rejected_cases:
            lines.append(
                f"- `{case['caseId']}` was rejected with `{case.get('errorType')}` and recommended fallback `{case.get('recommendedFallback')}`."
            )
    else:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Safety Checks",
            "",
            "- Reject before inference for ineligible task classes, code edits, command planning, strict JSON, high-stakes tasks, and oversize inputs.",
            "- Require explicit local request plus a privacy or local-only benefit before offering local fallback.",
            "- Verify Ollama reachability and the exact `gemma4:e4b` model before manual local execution.",
            "",
            "## Recommendation",
            "",
            "- Keep this as a manual opt-in handshake only. It is suitable for controlled lab offers, not for automatic routing.",
            "",
            "## Next Decision Gate",
            "",
            "- Decide whether a future experiment should surface this explicit local option in diagnostics or operator tooling without changing the default route.",
        ]
    )
    return "\n".join(lines) + "\n"


def build_request_report(payload: dict[str, Any], policy: dict[str, Any]) -> str:
    lines = [
        "# Local Fallback Integration Handshake",
        "",
        "## Summary",
        "",
        f"- Decision: `{payload.get('decision')}`",
        f"- OK: `{payload.get('ok')}`",
        f"- Task class: `{payload.get('taskClass')}`",
        "",
        "## Routing Status",
        "",
        "Automatic routing remains disabled.",
        "",
        "## Policy Source",
        "",
        f"- `{payload['policySource']}`",
        f"- Policy status: `{policy['status']}`",
        f"- Model: `{policy['model']['name']}` via `{policy['model']['runtime']}`",
        "",
        "## Demo Cases",
        "",
        "| Case | Decision | Inference Called | Reason |",
        "|---|---|---:|---|",
        f"| {payload.get('caseId') or 'request_case'} | {payload.get('decision')} | {str(bool(payload.get('inferenceCalled'))).lower()} | {payload.get('reason')} |",
        "",
        "## Eligible Results",
        "",
    ]
    if payload.get("decision") == "eligible":
        lines.append(
            f"- Manual local fallback executed in `{payload.get('durationMs', 'n/a')} ms` with confidence `{payload.get('confidence')}` and quality pass `{payload.get('qualityCheck', {}).get('passed')}`."
        )
    else:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Rejected Results",
            "",
        ]
    )
    if payload.get("decision") == "rejected":
        lines.append(
            f"- Request was rejected with `{payload.get('errorType')}` and recommended fallback `{payload.get('recommendedFallback')}`."
        )
    else:
        lines.append("- None")
    lines.extend(
        [
            "",
            "## Safety Checks",
            "",
            "- Routing stayed disabled and the request was evaluated against the 4c candidate policy before any local inference.",
            "- Ineligible cases are rejected before inference and directed to a stronger model path.",
            "",
            "## Recommendation",
            "",
        ]
    )
    if payload.get("decision") == "eligible":
        lines.append("- This request is a valid manual local fallback candidate, but it should remain opt-in only.")
    else:
        lines.append("- Use a stronger model for this request rather than the current local fallback path.")
    lines.extend(
        [
            "",
            "## Next Decision Gate",
            "",
            "- Decide whether future integration should surface this handshake through diagnostics or operator prompts while keeping default routing unchanged.",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manual local fallback integration handshake prototype.")
    parser.add_argument("--repo-root", required=True)
    parser.add_argument("--json-out", required=True)
    parser.add_argument("--report-out", required=True)
    parser.add_argument("--demo", action="store_true")
    parser.add_argument("--request")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.demo == bool(args.request):
        raise RuntimeError("Use exactly one of --demo or --request.")

    repo_root = Path(args.repo_root).resolve()
    json_out = Path(args.json_out).resolve()
    report_out = Path(args.report_out).resolve()
    policy = prototype.load_policy(repo_root)

    if args.demo:
        payload = build_demo_payload(policy)
        report = build_demo_report(payload, policy)
    else:
        request_path = Path(args.request).resolve()
        request = load_request(request_path)
        payload = build_request_payload(policy, request)
        report = build_request_report(payload, policy)

    json_out.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    report_out.write_text(report, encoding="utf-8")
    print("Validation: OK")
    print(f"JSON written: {json_out}")
    print(f"Report written: {report_out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
