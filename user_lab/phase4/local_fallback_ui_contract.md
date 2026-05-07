# Local Fallback UI Contract

## Purpose

Define the minimal contract between runtime/operator tooling and a future UI surface for the local fallback offer.

Automatic routing remains disabled.

## Candidate Offer Contract

```json
{
  "schemaVersion": 1,
  "candidateType": "local_fallback_offer",
  "taskClass": "local_short_summary",
  "confidence": "medium",
  "model": "gemma4:e4b",
  "runtime": "ollama",
  "privacyBenefit": true,
  "qualityWarning": "Local result may be less capable than cloud.",
  "routingEnabled": false,
  "actions": [
    "run_locally",
    "use_stronger_model",
    "cancel"
  ]
}
```

## Local Result Contract

```json
{
  "schemaVersion": 1,
  "localFallbackResult": {
    "ok": true,
    "model": "gemma4:e4b",
    "durationMs": 2364,
    "qualityCheckPassed": true,
    "confidence": "medium",
    "actions": [
      "use_stronger_model",
      "retry_locally",
      "accept_result"
    ]
  }
}
```

## Rejected Offer Contract

```json
{
  "schemaVersion": 1,
  "candidateType": "local_fallback_offer",
  "decision": "not_offered",
  "reason": "Task requires strict JSON output.",
  "recommendedFallback": "stronger_model"
}
```

## Contract Rules

- `requestedModel` or any local candidate model must not be confused with a cloud resolved model
- UI must show this as a local candidate, not as the default model
- UI must never imply the local model is equally capable
- stronger-model fallback must always remain available
- `routingEnabled: false` must be preserved in any surfaced contract

## Minimal UI Surface

Recommended first surface:

- operator/run detail or task composer
- one small candidate badge or offer card
- explicit CTA for local run
- explicit CTA for stronger model
- muted not-offered explanation when needed
