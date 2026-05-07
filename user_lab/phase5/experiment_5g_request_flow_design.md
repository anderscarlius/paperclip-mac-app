# Phase 5G Request Flow Design

## 1. How request construction works

Phase 5G adds a frontend-only `AnalyzeWorkspaceRequest` builder in `vendor/paperclip/ui/src/lib/setup-health.ts`.

The request is created only after the user:

1. selects or confirms a workspace,
2. clicks `Analyze this workspace`,
3. reviews the read-only confirmation,
4. clicks `Continue`.

The builder uses only `SetupHealthDiagnostics.workspace` plus already-available setup signals.

It does not:

- read files,
- run commands,
- call backend services,
- start an agent,
- include file contents,
- include secrets.

If no workspace is selected, request creation returns `null`.

If a workspace is selected, the request includes:

- schema version,
- request type,
- workspace path and display name,
- workspace path health,
- strict read-only safety flags,
- cloud-first runtime preference,
- local fallback disabled,
- automatic routing disabled,
- first-run user intent.

## 2. What validation checks

Phase 5G adds a pure frontend validation helper for `AnalyzeWorkspaceRequest`.

Validation checks:

- request exists,
- `schemaVersion === 1`,
- `requestType === "analyze_workspace"`,
- workspace is selected,
- workspace path is present and non-empty,
- `readOnly === true`,
- `allowFileWrites === false`,
- `allowCommandExecution === false`,
- `allowNetworkAccess === false`,
- `requireUserApprovalForCommands === true`,
- `allowLocalFallback === false`,
- `allowAutomaticRouting === false`,
- `userIntent.goal === "understand_workspace"`.

Validation returns a structured success or a non-throwing error list suitable for UI preview and future diagnostics.

## 3. What UI states exist

Phase 5G uses three local Analyze flow states inside Setup Health:

### Closed

No confirmation panel is visible.

### Confirm

The user sees the first-run safety explanation:

- read-only first run,
- no file changes,
- no commands without approval,
- optional workspace warning copy if path risk is medium.

Buttons:

- `Continue`
- `Cancel`

### Ready

After `Continue`, the page:

1. builds `AnalyzeWorkspaceRequest`,
2. validates the request,
3. shows a setup-ready panel.

The ready panel shows:

- `Ready to run read-only analysis`,
- workspace name/path when available,
- warning notes when applicable,
- safety bullets,
- validation status,
- a collapsible request preview,
- explicit notice that analysis has not started.

## 4. Why no execution happens

Phase 5G stops at request construction and validation in the frontend.

It intentionally does not:

- submit the request,
- call a backend endpoint,
- create a runtime job,
- execute an agent,
- run shell commands,
- read repository files.

This keeps the phase low-risk while making the first safe task concrete and reviewable.

## 5. What remains for 5H

Recommended Phase 5H scope:

1. define the handoff boundary from Setup Health to a future execution layer,
2. decide where the request should be stored or passed,
3. introduce a non-destructive submission pathway,
4. keep runtime execution disabled until the handoff contract is proven,
5. prepare the future first-result surface for `AnalyzeWorkspaceResult`.
