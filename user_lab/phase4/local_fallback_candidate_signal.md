# Local Fallback Candidate Signal

## Minimal Signal Shape

```ts
type LocalFallbackCandidateSignal = {
  candidateType: "local_fallback_offer";
  available: boolean;
  source:
    | "operator_status"
    | "runtime_diagnostics"
    | "lab_fixture"
    | "not_available";
  taskClass?: "local_short_summary" | "local_small_code_explanation" | "local_short_policy_text";
  confidence: "medium" | "low";
  model: "gemma4:e4b";
  runtime: "ollama";
  routingEnabled: false;
  automaticRoutingEnabled: false;
  privacyBenefit: boolean;
  qualityWarning: string;
  eligibleReasons: string[];
  ineligibleReasons: string[];
  actions: ["run_locally", "use_stronger_model", "cancel"];
};
```

## Rules

- `available: true` does not mean automatic route
- `routingEnabled` must remain `false`
- `automaticRoutingEnabled` must remain `false`
- if task class is unknown, UI may show a diagnostic-only card instead of a direct local-run offer
- the local candidate model must never be shown as a default model
- the UI must never imply the local model is equivalent to the cloud model

## Current 4i Use

- Source used in 4i: `lab_fixture`
- Gating condition used in 4i: real runtime diagnostics presence in `RunDetail`
- Normal runtime state in 4i: available signal with unknown task class, which renders a diagnostic-only card
- Eligible-offer state remains supported by the contract for future narrow wiring when a real task-class signal exists
