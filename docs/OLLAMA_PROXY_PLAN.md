# Ollama Proxy Plan

## Goal

Give Paperclip reliable local-model health and performance metrics even when Codex does not write useful JSON events until late in a run.

The proxy should measure:

- time to first request byte
- time to first model byte
- time to first generated token or text delta
- live output throughput
- final prompt, cached, and output token usage when available
- request failures, disconnects, cancellations, and timeout causes

## Shape

Run a local HTTP proxy owned by Paperclip Desktop:

- Codex talks to `http://127.0.0.1:<proxy-port>/v1`.
- The proxy forwards to the real Ollama OpenAI-compatible endpoint at `http://127.0.0.1:11434/v1`.
- Paperclip receives structured proxy events over an internal endpoint or local event file.

The proxy should be small, boring, and restartable. A Node service inside the Paperclip runtime is the best first version because the server already owns heartbeat run IDs, logging, auth, and process lifecycle.

## Request Flow

1. Paperclip allocates a proxy session for a heartbeat run.
2. The Codex local adapter sets the local provider base URL to the proxy instead of Ollama.
3. The proxy forwards `/v1/models`, `/v1/responses`, and `/v1/chat/completions`.
4. For streaming responses, the proxy tees the Server-Sent Events stream.
5. The proxy emits `local_model.proxy.*` events keyed by `runId`.
6. The existing heartbeat telemetry endpoint folds proxy events into sidebar and Diagnostics data.

## Event Schema

Use append-only events:

- `request.started`: method, path, model, runId, monotonic timestamp
- `upstream.connected`: upstream latency
- `stream.first_byte`: milliseconds from request start
- `stream.first_delta`: milliseconds from request start
- `stream.delta`: approximate text length and approximate token count
- `stream.usage`: upstream usage object when present
- `request.completed`: status, total milliseconds, final usage
- `request.failed`: status, error code, message
- `request.cancelled`: cancellation source and elapsed time

Do not store raw prompts or model output in proxy metrics by default. The run log already handles content. Proxy telemetry should be privacy-light counters and timings.

## Token Counting

Phase 1:

- Count text deltas with the existing approximate tokenizer.
- Prefer upstream `usage` when Ollama provides it.
- Display approximate live throughput clearly as approximate.

Phase 2:

- Add model-specific tokenization only if needed.
- Keep the approximate counter as fallback.

## Watchdog Rules

The proxy should enforce request-level deadlines:

- model list timeout: 3 seconds
- first upstream byte warning: 45 seconds
- first delta warning: 90 seconds
- first delta hard timeout for fast mode: 120 seconds
- normal/deep hard timeout: configurable and longer

When a timeout fires:

1. Abort the upstream request.
2. Mark the run phase as `stalled`.
3. Ask Desktop to restart managed Ollama if Paperclip owns the process.
4. Leave externally-owned Ollama alone and surface `Ollama not responding`.

## Adapter Changes

The Codex local adapter should accept proxy config:

- `ollamaProxyBaseUrl`
- `ollamaUpstreamBaseUrl`
- `ollamaProxySessionId`

When proxy mode is enabled, the adapter writes Codex config so the Ollama local provider points at the proxy base URL. The adapter should also pass `PAPERCLIP_RUN_ID` and session metadata so the proxy can attribute requests even if headers are missing.

## Server Changes

Add a local-model proxy service to the runtime:

- `server/src/services/local-model-proxy.ts`
- `server/src/routes/local-model-proxy.ts`
- persistence through heartbeat events or a compact sidecar event log

Expose:

- `GET /api/local-model/health`
- `GET /api/heartbeat-runs/:runId/local-model-telemetry`
- internal event ingestion if the proxy runs as a child process

Fold proxy metrics into:

- `/api/companies/:companyId/heartbeat-telemetry`
- run detail Diagnostics
- sidebar status

## Desktop Changes

Paperclip Desktop should:

- reserve or discover a proxy port
- start/stop the proxy with the Paperclip runtime
- show proxy health in Diagnostics
- restart managed Ollama only when Paperclip owns the Ollama process
- keep external Ollama restart as an explicit user action

## Rollout

1. Add proxy behind a feature flag, disabled by default.
2. Use it only for local Codex/Ollama agents.
3. Compare proxy timings against current run logs for a few runs.
4. Enable it by default after it proves stable.
5. Remove UI dependence on Codex JSON events for live local throughput.

## Risks

- Codex local-provider config may not expose every base URL knob we need.
- Streaming formats may differ between `/v1/responses` and `/v1/chat/completions`.
- Proxying raw streams must preserve exact SSE framing.
- We must avoid logging prompt/output content in the proxy metrics path.
- Killing externally-owned Ollama would be surprising, so automatic restarts must stay limited to managed processes.
