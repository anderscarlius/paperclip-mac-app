# Top 5 Friction Points

## 1. Cloud auth failure is discovered too late

1. What happens
- The run spends ~14.8s retrying websocket and HTTP requests before failing with `401 Unauthorized`.

2. Why it is bad
- The user waits through a full execution cycle instead of getting a fast, actionable preflight error.

3. Evidence
- Final error: `401 Unauthorized: Missing bearer or basic authentication in header`
- Multiple reconnect attempts occurred before failure.

4. Impact
- High

## 2. Non-ASCII workspace path appears to break websocket metadata transport

1. What happens
- The run repeatedly logs UTF-8 conversion failures for the `x-codex-turn-metadata` header, and the serialized workspace path includes `Datorer och nätverk`.

2. Why it is bad
- It adds noisy retries before the real request path stabilizes, and it suggests this user’s normal workspace path may be intrinsically risky.

3. Evidence
- Repeated errors: `failed to convert header to a str for header name 'x-codex-turn-metadata'`
- The logged metadata payload includes the non-ASCII workspace path.

4. Impact
- High

## 3. Runtime context says `model: unknown`

1. What happens
- The prompt, env vars, and `resultJson.runtimeContext` all surface `model: unknown`.

2. Why it is bad
- The user cannot trust model selection visibility, and the agent cannot reason about model-specific behavior from Paperclip’s own context.

3. Evidence
- Prompt field: `- model: unknown`
- Env field: `PAPERCLIP_RUNTIME_MODEL=unknown`
- Result field: `runtimeContext.model = unknown`

4. Impact
- Medium

## 4. Runtime context is clear, but overshadowed by larger guidance text

1. What happens
- Runtime context is injected first, but then immediately followed by a much larger web-search guidance block.

2. Why it is bad
- The signal-to-noise ratio is weaker than it should be for critical execution context.

3. Evidence
- Runtime context prompt section: 298 chars
- Runtime capability guidance: 953 chars

4. Impact
- Medium

## 5. Failure reporting is technically rich but operationally unclear

1. What happens
- Logs contain useful transport details, but the user-facing outcome would still feel like “Codex failed somewhere” unless they inspect raw diagnostics.

2. Why it is bad
- The user has to infer whether the real problem is auth, workspace-path encoding, provider selection, or session persistence.

3. Evidence
- The run shows websocket 401s, UTF-8 metadata failures, HTTP fallback 401s, and a session-persistence mitigation warning in one attempt.

4. Impact
- Medium
