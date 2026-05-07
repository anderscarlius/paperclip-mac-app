# Experiment 2a Result

## 1. Objective

Trace why cloud-hosted `codex_local` runs surface `runtimeContext.model = unknown`, then either resolve the model safely or replace silent unknowns with explicit structured diagnostics.

## 2. Model trace summary

- Desktop only sends an explicit `adapterConfig.model` in the local Codex + Ollama path.
- Generic cloud-hosted `codex_local` does not get an explicit model from Desktop.
- The adapter can see two request-like model signals:
  - explicit `config.model`
  - top-level `model` in effective `CODEX_HOME/config.toml`
- The current Codex JSONL parser does not extract an actual resolved model from CLI output.
- Heartbeat does not derive model independently; it only persists `result.model` from the adapter.

## 3. Model observability semantics

Chosen semantic split:

- `runtimeContext.model`
  resolved/reported model only, otherwise `unknown`

- `runtimeContext.modelInfo`
  structured explanation of what Paperclip does know:
  - requested/default model signal
  - source
  - confidence
  - unknown reason

## 4. Chosen fix path

Chosen path:

- Option B with a small hybrid improvement

Details:

- add structured `modelInfo`
- keep backward-compatible `runtimeContext.model`
- only surface a concrete `model` when Paperclip has a high-confidence local-hosted model signal
- keep cloud-hosted unresolved models as `unknown`

## 5. Implemented change

Implemented in `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`:

- added `RuntimeModelInfo`
- classified model signals from:
  - `config.model`
  - effective `CODEX_HOME/config.toml`
- reserved `runtimeContext.model` for resolved/reported model identity
- added `unknownReason` instead of silent unknowns
- exported matching env vars so prompt/env/result stay aligned
- extended prompt runtime-context section with:
  - `requested_model`
  - `model_source`
  - `model_confidence`
  - `model_unknown_reason`

## 6. Files changed

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`
- `vendor/paperclip/server/src/__tests__/codex-local-execute.test.ts`
- `user_lab/phase2/README.md`
- `user_lab/phase2/experiment_2a_model_trace.md`
- `user_lab/phase2/experiment_2a_model_semantics.md`
- `user_lab/phase2/experiment_2a_result.md`
- `user_lab/phase2/experiment-log.md`

## 7. Tests run

Executed:

- `swift build`
- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`

## 8. Result

Passed.

Key behavioral result:

- cloud-hosted `codex_local` no longer hits a silent dead-end at `model: unknown`
- unresolved cloud model identity now carries explicit structure and reason
- local-hosted explicit model behavior remains intact
- no exact cloud `gpt-*` model is fabricated into `runtimeContext.model`

## 9. Keep or revert

Keep.

Reason:

- low-risk additive change
- improves truthfulness
- preserves backward compatibility
- does not change execution routing, billing, or fallback behavior

## 10. Remaining unknowns

- Codex CLI may know the resolved cloud model internally, but the current Paperclip parser does not receive a reliable explicit signal for it.
- Heartbeat top-level `model` fields still reflect adapter scalar `model`, so richer `modelInfo` is currently most available inside `resultJson.runtimeContext`.
- Desktop diagnostic surfaces may still privilege top-level `model` over structured `modelInfo`.

## 11. Recommended next experiment

Recommended next experiment:

- Experiment 2b: propagate `runtimeContext.modelInfo` into the most visible heartbeat/runtime diagnostic surfaces so users can see requested-model, source, confidence, and unknown-reason without drilling into raw result JSON.
