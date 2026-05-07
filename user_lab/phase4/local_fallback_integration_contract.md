# Local Fallback Integration Contract

## 1. Purpose

The local fallback handshake allows Paperclip to evaluate whether a task can be offered as an explicit local-only option.

It does not route automatically.

## 2. Request Shape

```json
{
  "schemaVersion": 1,
  "requestType": "local_fallback_candidate",
  "taskClass": "local_short_summary",
  "input": "Text to summarize...",
  "inputKind": "synthetic_text",
  "privacyBenefit": true,
  "requiresStrictJson": false,
  "requiresCodeEdit": false,
  "requiresCommandExecution": false,
  "maxOutputWords": 200,
  "userExplicitlyRequestedLocal": true
}
```

Optional safety flags:

- `highStakesDomain`
- `caseId`

## 3. Response Shape

Example success:

```json
{
  "schemaVersion": 1,
  "ok": true,
  "decision": "eligible",
  "executionMode": "manual_local_fallback",
  "routingEnabled": false,
  "model": "gemma4:e4b",
  "confidence": "medium",
  "reason": "Task class matches eligible local fallback policy.",
  "warnings": [],
  "resultRef": "inline:prototypeResult"
}
```

Example rejection:

```json
{
  "schemaVersion": 1,
  "ok": false,
  "decision": "rejected",
  "errorType": "task_class_not_eligible",
  "reason": "Strict JSON extraction is not eligible for gemma4:e4b based on Experiment 4b.",
  "recommendedFallback": "stronger_model"
}
```

## 4. Eligible Offer Conditions

Paperclip may offer local fallback only when:

- task class is in the 4c eligible list
- input is below the policy limit
- output budget is below the policy limit
- Ollama API is reachable
- `gemma4:e4b` is installed
- the user explicitly requests local execution or confirms a local option
- the task does not require strict JSON or exact schema compliance
- the task does not require code edits
- the task does not require command execution planning
- the task is not high-stakes
- the task has a meaningful privacy or local-only benefit

## 5. Must Not Offer Conditions

Paperclip must not offer local fallback for:

- exact JSON or exact schema tasks
- structured extraction
- multi-file coding
- autonomous code edits
- repo-wide debugging
- security-sensitive analysis
- legal, medical, or financial advice
- command execution planning
- long-context tasks
- anything requiring high factual precision

## 6. User-Facing Language

Suggested wording:

> This looks suitable for a small local-only model. It may be faster, private, and free to run locally, but quality may be lower than the cloud model. Use local fallback for this task?

If confidence is medium:

> Local fallback candidate: medium confidence.

If rejected:

> This task is not suitable for the current local model. Use a stronger model instead.

## 7. Routing Status

Automatic routing remains disabled.

This contract only defines an explicit opt-in handoff.
