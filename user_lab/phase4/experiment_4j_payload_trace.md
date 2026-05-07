# Experiment 4j Payload Trace

## Code trace summary

### 1. What backend/run payload exists today

`codex-local` execution already returns `resultJson.runtimeContext` from:

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`

That payload already carries:

- `executionRuntime`
- `modelHosting`
- `provider`
- `model`
- `modelInfo`
- `biller`
- `billingType`

`AgentDetail.tsx` already reads `resultJson.runtimeContext` plus compact `runtimeDiagnostics`.

### 2. Whether run payload includes user prompt or task metadata

The adapter receives a generic `context: Record<string, unknown>` through `AdapterExecutionContext` in:

- `vendor/paperclip/packages/adapter-utils/src/types.ts`

`execute.ts` already consumes explicit context fields such as:

- `taskId`
- `issueId`
- `wakeReason`
- `paperclipWake`
- `approvalId`
- `approvalStatus`

So there is an existing safe metadata channel, but there is no built-in local-fallback task-class field yet.

### 3. Whether it includes safe task-class-like metadata

There is no existing real task-class field for:

- `local_short_summary`
- `local_small_code_explanation`
- `local_short_policy_text`

The current wake payload and issue metadata are useful for workflow state, but they are not a safe basis for local-fallback task classification.

### 4. Whether 4e handshake artifacts can inform a contract

Yes.

Experiment 4e already defined a safe explicit request shape with:

- `requestType: "local_fallback_candidate"`
- `taskClass`
- `requiresStrictJson`
- `requiresCodeEdit`
- `requiresCommandExecution`
- optional high-stakes signal
- explicit local request intent

That makes 4e handshake metadata the safest minimal source for a real backend candidate payload.

### 5. Whether heartbeat/run summary is the right place to carry candidate payload

For run-detail UI, the best insertion point is still full `resultJson.runtimeContext`, because `AgentDetail` already has it.

For compact run-summary surfacing, `heartbeat-run-summary.ts` is also a safe secondary place to preserve a compact `localFallbackCandidate` object inside summarized runtime diagnostics.

### 6. Whether UI currently receives enough information

UI receives enough information to consume a payload if it exists in:

- `resultJson.runtimeContext.localFallbackCandidate`
- `resultJson.runtimeDiagnostics.localFallbackCandidate`
- or a summarized equivalent

UI does **not** receive enough information to invent an eligible task class safely on its own.

### 7. Smallest safe insertion point

The smallest safe insertion point is:

1. accept explicit local-fallback handshake metadata in adapter `context`
2. normalize it in `codex-local` execution
3. write a conservative `runtimeContext.localFallbackCandidate`
4. let UI consume that payload directly

### 8. What should not be inferred

4j should not infer eligibility from:

- free-form prompt text
- issue title or description text
- repo contents
- model availability alone
- arbitrary wake reasons

If explicit candidate metadata is missing, the backend should not fabricate an eligible local-fallback offer.
