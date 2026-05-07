# Experiment 2a — Model Observability Semantics

## Chosen semantic model

```ts
type RuntimeModelInfo = {
  requestedModel: string | null;
  resolvedModel: string | null;
  reportedModel: string | null;
  modelSource:
    | "adapter_request"
    | "codex_home_config"
    | "codex_cli_output"
    | "provider_response"
    | "not_available";
  confidence: "high" | "medium" | "low" | "unknown";
  unknownReason?: string;
};
```

## Meaning of fields

- `requestedModel`
  Best known requested/default model signal seen by Paperclip.

- `resolvedModel`
  Model identity Paperclip considers authoritative enough to surface as the main runtime model.

- `reportedModel`
  Model identity directly reported by runtime/provider output if such a signal exists in the future.

- `modelSource`
  Where the best current model signal came from.

- `confidence`
  Confidence that Paperclip understands the actual effective runtime model, not just a request/default.

- `unknownReason`
  Why `runtimeContext.model` is still unknown when Paperclip lacks a resolved model.

## Runtime context rule

`runtimeContext.model` should mean:

- the resolved/reported model when Paperclip has a strong enough signal
- otherwise `unknown`

This keeps backward compatibility for the scalar field while making it more truthful.

## Specific rules used in Experiment 2a

### Local-hosted explicit model

If `codex_local` is running a local provider and Paperclip explicitly requested a model:

- `runtimeContext.model = requestedModel`
- `modelInfo.requestedModel = requestedModel`
- `modelInfo.resolvedModel = requestedModel`
- `modelSource = "adapter_request"`
- `confidence = "high"`

Reason:

- the adapter directly controls the provider/model tuple for the local run

### Cloud-hosted explicit adapter model

If `config.model` exists for a cloud-hosted run:

- `runtimeContext.model = "unknown"`
- `modelInfo.requestedModel = config.model`
- `modelSource = "adapter_request"`
- `confidence = "medium"`
- `unknownReason = "codex_cloud_resolved_model_not_reported"`

Reason:

- Paperclip knows what it asked Codex for
- Paperclip does not currently know the actual resolved runtime model from runtime output

### Cloud-hosted default from `CODEX_HOME/config.toml`

If no explicit adapter model exists but top-level `model` is present in effective `CODEX_HOME/config.toml`:

- `runtimeContext.model = "unknown"`
- `modelInfo.requestedModel = config.toml model`
- `modelSource = "codex_home_config"`
- `confidence = "low"`
- `unknownReason = "codex_cloud_resolved_model_not_reported"`

Reason:

- this is a default request-like signal, not proof of the actual resolved model used by the run

### No model signal available

If no adapter-requested model and no `CODEX_HOME/config.toml` model exist:

- `runtimeContext.model = "unknown"`
- `modelSource = "not_available"`
- `confidence = "unknown"`
- `unknownReason = "codex_model_signal_not_available"`

## Backward compatibility

Existing fields remain:

- `executionRuntime`
- `modelHosting`
- `provider`
- `model`
- `biller`
- `billingType`

New structured detail is additive via:

- `runtimeContext.modelInfo`

## Non-goals

This semantic model does not:

- guess exact cloud model from `provider=openai`
- treat a default request as a proven resolved model
- change routing or billing
