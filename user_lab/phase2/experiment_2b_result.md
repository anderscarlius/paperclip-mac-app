# Experiment 2b Result

Date:
- 2026-05-02

Goal:
- Surface `runtimeContext.modelInfo` and runtime warnings in heartbeat-visible diagnostics without broad navigation changes or large UI refactors.

Scope implemented:
- preserve a lightweight `runtimeDiagnostics` summary in heartbeat run summaries
- preserve top-level `warnings` in summarized `resultJson`
- surface model diagnostics and warnings in the run detail summary card
- remove the fallback that could display configured `adapterConfig.model` as if it were the resolved runtime model

Observed result:
- Heartbeat list/detail payloads now retain a compact model-diagnostics summary even when nested `runtimeContext` is trimmed.
- Run detail now shows safe wording such as `Requested/default model`, `Configured model`, `Model signal`, and `Resolved model: unknown` when the cloud-resolved model is not explicitly known.
- Warning surfacing and model diagnostics are now visible together in one place without requiring the raw JSON panel.

Constraints check:
- no new navigation
- no broad component refactor
- no claim that `requestedModel` is the actual/resolved model unless explicit evidence exists

Recommended next step:
- Experiment 3a if this run-detail surfacing is judged sufficient as the baseline user-facing diagnostics surface
- otherwise a narrower Experiment 2c follow-up can extend the same diagnostics language into higher-level run lists or telemetry summaries
