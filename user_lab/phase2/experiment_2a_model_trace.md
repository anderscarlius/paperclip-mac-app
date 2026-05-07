# Experiment 2a — Model Trace

## 1. Where `runtimeContext.model` is first assigned

`runtimeContext.model` is assigned inside `buildRuntimeContext(...)` in `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts` at lines 278-293.

Current semantics:

- use `modelInfo.resolvedModel` when available
- otherwise use `modelInfo.reportedModel` when available
- otherwise set `model` to `unknown`

## 2. What input sources exist for model value

Code-level model inputs found:

- `config.model` inside `execute(...)` in `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts:773-778`
- top-level `model` in effective `CODEX_HOME/config.toml` via `resolveCodexRequestedModelSignal(...)` in `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts:192-225`

No other reliable model input source was found in the `codex_local` adapter.

## 3. Whether Desktop knows requested model

Desktop only sets an explicit adapter model for the local Ollama recommendation:

- `Sources/PaperclipDesktop/Services/RuntimeAgentAdapterService.swift:105-110`

The generic `codex_local` recommendation does not set `adapterConfig.model`:

- `Sources/PaperclipDesktop/Services/RuntimeAgentAdapterService.swift:18-27`

Conclusion:

- Desktop knows a requested model in the local-primary Codex + Ollama case
- Desktop does not know an explicit requested model for the normal cloud-hosted Codex recommendation

## 4. Whether adapter receives requested model

Yes, when one is configured.

The adapter reads `config.model` directly:

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts:773-778`

If `config.model` is empty, the adapter can still see a default request-like signal from the effective `CODEX_HOME/config.toml`:

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts:857-865`

## 5. Whether Codex CLI exposes actual model

Not in the current Paperclip parser.

`parseCodexJsonl(...)` only reads:

- `thread.started`
- `error`
- `item.completed`
- `turn.completed` usage
- `turn.failed`

See:

- `vendor/paperclip/packages/adapters/codex-local/src/server/parse.ts:3-61`

No parsed event currently extracts or persists an actual resolved model ID from Codex CLI output.

## 6. Whether heartbeat/session data includes model

Heartbeat does not independently resolve model identity.

It persists the adapter result model into runtime state, usage JSON, and cost events:

- `vendor/paperclip/server/src/services/heartbeat.ts:2526-2564`
- `vendor/paperclip/server/src/services/heartbeat.ts:3387-3390`

Conclusion:

- heartbeat/session data only knows what the adapter already decided to report as `result.model`

## 7. Whether `resultJson` includes model after run

Yes.

The adapter writes `runtimeContext` into `resultJson`, and heartbeat preserves it:

- adapter result assembly in `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`
- heartbeat enrichment in `vendor/paperclip/server/src/services/heartbeat.ts:3402-3405`

After Experiment 2a, `resultJson.runtimeContext` includes:

- existing scalar fields
- structured `modelInfo`

## 8. Where `unknown` is introduced

`unknown` is introduced in `buildRuntimeContext(...)` when no resolved or directly reported model exists:

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts:278-293`

For cloud-hosted Codex runs:

- an explicit requested/default model may still exist
- but the adapter does not currently have proof of the actual resolved runtime model

So `runtimeContext.model` remains `unknown` while `runtimeContext.modelInfo` carries the best available signal and reason.

## 9. Whether `unknown` is accurate or just missing plumbing

Findings:

- For generic cloud-hosted `codex_local`, `unknown` was originally a silent observability gap because request/default model signals existed but were not classified separately.
- Paperclip still does not have a reliable resolved-model signal from Codex CLI output or heartbeat.

Experiment 2a conclusion:

- `runtimeContext.model = unknown` is accurate for unresolved cloud-hosted runs
- the missing piece was not “the model value itself” but the lack of structured explanation
- requested/default model signals are now preserved in `runtimeContext.modelInfo` instead of being silently collapsed into `unknown`
