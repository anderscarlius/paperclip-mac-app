# Experiment 4i Signal Trace

## 1. What `AgentDetail.tsx` Receives

- `RunDetail` receives:
- `run`
- `agentRouteId`
- `adapterType`
- `adapterConfig`

## 2. Whether Run Detail Has Runtime Diagnostics

- Yes.
- `RunDetail` computes `runtimeDiagnostics` from `run.resultJson` using `readRunRuntimeDiagnostics(...)`.
- Evidence: `vendor/paperclip/ui/src/pages/AgentDetail.tsx`

## 3. Whether Warnings / modelInfo Are Available There

- Yes.
- `readRunRuntimeDiagnostics(...)` reads:
- runtime diagnostics
- runtime context
- modelInfo
- warnings
- resolved/requested/reported model signals

## 4. Whether Local Fallback Status Is Available There

- No direct local fallback status payload is currently present in the run detail data.
- No existing `localFallbackStatus` field is passed into `RunDetail`.
- No existing task-class eligibility field is passed into `RunDetail`.

## 5. Whether Task Class Is Available

- No.
- The current run-detail UI does not receive a task class such as `local_short_summary`.

## 6. Existing Payload Suitable For Additive Candidate Info

- The safest real signal already present is runtime diagnostics visibility itself.
- That is enough to gate a diagnostic-only prototype state, but not enough to safely show a true eligible local-run offer without a separate task-class signal.

## 7. Safest Insertion Point

- Keep the insertion point from 4h:
- `RunDetail`
- directly below `RunRuntimeDiagnosticsCard`
- use a candidate signal object derived from:
- real runtime diagnostics presence
- explicit lab fixture availability metadata
- no runtime execution wiring

## Decision

- Chosen option: small explicit `C`, gated by real runtime diagnostics presence.
- The UI no longer renders from unconditional demo data.
- It now renders only when a candidate signal exists.
- Because task class is still unknown in the real UI data, the normal runtime state is diagnostic-only, not a direct local-run offer.
