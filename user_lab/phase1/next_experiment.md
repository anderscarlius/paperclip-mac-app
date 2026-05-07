# Next Experiment

Experiment label: 1a

## Objective

Reduce wasted failure time and improve failure clarity for cloud-hosted `codex_local` runs.

## Scope

`vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`

## Current behavior

In the controlled no-auth baseline path, when runtime context resolves to local execution with cloud-hosted OpenAI usage, the adapter can spend ~15 seconds retrying websocket and HTTP requests before returning a final `401 Unauthorized`.

## Expected outcome

The run should fail immediately with a short, Paperclip-owned message that clearly says Codex cloud auth is missing or invalid.

## Change

Add a minimal preflight in `execute.ts` that checks for valid Codex auth before starting a cloud-hosted OpenAI run, and return a direct actionable error if auth is missing.

## Constraints

- Do not change local-model execution behavior.
- Do not change session-integrity mitigation behavior.
- Do not add dependencies.
- Do not change runtime-context field names in this experiment.
- Do not attempt to solve the non-ASCII workspace-path/header issue in this experiment.

## Verification

- Run one `codex_local` baseline scenario with missing cloud auth.
- Measure total failure duration before/after the change.
- Compare the final error surface before/after the change.
- Confirm whether websocket/header path errors are still present separately from auth behavior.
- Success signal: no reconnect loop, no long retry sequence, and one clear failure diagnosis for the no-auth case.

## Follow-Up Note

Experiment 1b should isolate the non-ASCII workspace-path / header-encoding issue with auth held constant.
