# Local Fallback Candidate Payload

## Minimal payload contract

```ts
type LocalFallbackCandidatePayload = {
  schemaVersion: 1;
  candidateType: "local_fallback_offer";
  available: boolean;
  decision:
    | "eligible"
    | "diagnostic_only"
    | "not_eligible"
    | "not_available";
  source:
    | "explicit_task_metadata"
    | "operator_handshake"
    | "runtime_diagnostics"
    | "lab_fixture"
    | "not_available";
  taskClass?:
    | "local_short_summary"
    | "local_small_code_explanation"
    | "local_short_policy_text";
  confidence: "medium" | "low";
  model: "gemma4:e4b";
  runtime: "ollama";
  routingEnabled: false;
  automaticRoutingEnabled: false;
  privacyBenefit: boolean;
  qualityWarning: string;
  eligibleReasons: string[];
  ineligibleReasons: string[];
  recommendedFallback: "stronger_model";
  actions: Array<"run_locally" | "use_stronger_model" | "cancel">;
};
```

## Rules

- `available: true` does not mean routing is enabled.
- `decision: "eligible"` requires a known eligible `taskClass`.
- `decision: "diagnostic_only"` means local fallback exists but this run has no explicit eligible task class.
- `decision: "not_eligible"` means explicit metadata is present and a disqualifying rule fired.
- `decision: "not_available"` means no offer should be shown.
- UI may show `Run locally` only when `decision === "eligible"`.
- UI must not show `Run locally` for `diagnostic_only`, `not_eligible`, or `not_available`.
- The payload must not include prompt text, source contents, or private repo data.

## 4j backend strategy

Experiment 4j uses a conservative Option B:

- read explicit local-fallback metadata only from adapter `context`
- prefer a normalized payload if already supplied
- otherwise accept a 4e-style handshake request shape and derive the payload from that explicit metadata
- write the payload into `resultJson.runtimeContext.localFallbackCandidate`
- preserve a compact copy in heartbeat-visible runtime diagnostics when present

## Explicit sources supported in 4j

### Explicit payload

Accepted through:

- `context.localFallbackCandidate`
- `context.paperclipLocalFallbackCandidate`

### 4e-style handshake request

Accepted through:

- `context.localFallbackCandidateRequest`
- `context.paperclipLocalFallbackRequest`

Expected shape:

```json
{
  "requestType": "local_fallback_candidate",
  "taskClass": "local_short_summary",
  "privacyBenefit": true,
  "requiresStrictJson": false,
  "requiresCodeEdit": false,
  "requiresCommandExecution": false,
  "highStakesDomain": false,
  "userExplicitlyRequestedLocal": true
}
```

## 4j limitations

- No free-form prompt classification.
- No prompt-content inspection for task eligibility.
- No execution from UI.
- No automatic routing.
- No assumption that local fallback is available merely because Ollama exists.
