# Phase 5H Handoff Design

## 1. Why a non-executing handoff boundary is needed

Phase 5G proved that Setup Health can build and validate an `AnalyzeWorkspaceRequest`.

The next product step is to show that the validated request can be handed off to a clearly defined boundary without implying that analysis has already started.

This boundary is useful because it:

- separates request preparation from future execution,
- preserves the first-run safety promise,
- gives the UI a truthful prepared state,
- creates a stable contract for Phase 5I and later backend work.

## 2. Chosen architecture

Chosen option: **Option A — Frontend-only handoff model**

Rationale:

- lowest-risk change for the current codebase,
- no new backend route surface,
- no new runtime coupling,
- no possibility of accidental execution,
- easy to test narrowly in the existing Setup Health test suite.

The server already has clear route and service patterns, but adding even a stub route in Phase 5H would expand the integration surface more than necessary for this safety-only milestone.

## 3. Handoff result contract

Phase 5H adds a frontend-only `AnalyzeWorkspaceHandoffResult` contract.

The result shape records:

- whether the request was accepted,
- whether validation passed,
- that execution has not started,
- that no files, commands, network, or agent activity occurred,
- that the next implementation phase is still required.

Core invariant:

```ts
executionStarted: false
```

Always.

## 4. Safety invariants

The handoff boundary must always report:

- `executionStarted: false`
- `filesChanged: false`
- `commandsRun: false`
- `networkAccessed: false`
- `agentStarted: false`
- `localFallbackUsed: false`
- `automaticRoutingUsed: false`

This remains true for both valid and invalid requests.

## 5. UI states

Phase 5H extends the Analyze flow with a prepared state:

1. `closed`
2. `confirm`
3. `ready`
4. `prepared`

The UI sequence becomes:

```text
Analyze this workspace
→ Continue
→ Ready to run read-only analysis
→ Prepare request
→ Analysis request prepared
```

The prepared state must explicitly say that execution has not started and that no agent, commands, or file reads occurred.

## 6. What is intentionally not implemented

Phase 5H does not:

- submit the request to a backend,
- create a job,
- run an agent,
- gather workspace metadata,
- read files,
- run shell commands,
- call cloud AI,
- call local AI,
- enable local fallback,
- enable automatic routing.

## 7. How 5I should build on it

Phase 5I should reuse the same request and handoff contracts to introduce a narrow submission boundary.

Recommended 5I direction:

1. keep the request validator unchanged,
2. move the handoff result contract into shared code only if a real backend endpoint is needed,
3. add a non-destructive prepare endpoint or service boundary,
4. keep execution disabled until safe metadata collection is explicitly designed and tested.
