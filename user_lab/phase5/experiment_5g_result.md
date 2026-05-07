# Phase 5G Result

## 1. Objective

Implement the non-executing setup request flow behind the Setup Health `Analyze this workspace` confirmation.

## 2. Request helper summary

Added a pure frontend `buildAnalyzeWorkspaceRequest()` helper in `vendor/paperclip/ui/src/lib/setup-health.ts`.

The helper:

- returns `null` when no workspace is selected,
- creates a versioned `AnalyzeWorkspaceRequest` when a workspace path exists,
- includes workspace path health,
- keeps the first analysis cloud-first,
- disables local fallback,
- disables automatic routing,
- keeps all first-run safety flags strict.

## 3. Validation helper summary

Added `validateAnalyzeWorkspaceRequest()` to confirm that the generated request remains within the Phase 5F safety contract.

Validation rejects:

- missing request,
- missing workspace path,
- wrong schema version,
- wrong request type,
- any unsafe flag drift,
- local fallback enabled,
- automatic routing enabled,
- wrong user intent goal.

The validator returns structured errors instead of throwing.

## 4. Setup-ready UI behavior

Updated `SetupHealth.tsx` so that:

1. `Analyze this workspace` opens the read-only confirmation,
2. `Continue` constructs the request locally,
3. the request is validated,
4. the UI shows a setup-ready panel instead of running anything.

The setup-ready panel includes:

- ready title and summary,
- workspace display name/path,
- workspace warning note when risk is medium,
- safety bullets,
- validation status,
- collapsible request preview,
- explicit notice that analysis has not started.

## 5. Safety copy used

The ready panel explicitly states:

- `Analysis has not started yet.`
- `This setup request is read-only.`
- `No files will be changed.`
- `No commands will run without your approval.`

When path risk is medium, the UI also states:

- `This workspace path has a warning. Analysis can continue, but some cloud runs may be slower.`

## 6. Tests run

Ran:

```bash
pnpm exec vitest run src/pages/SetupHealth.test.tsx
```

Observed result:

- 1 test file passed
- 24 tests passed

The test suite now covers:

- request creation,
- request validation,
- strict safety flags,
- disabled local fallback,
- disabled automatic routing,
- non-blocking path warning behavior,
- ready-state UI behavior,
- no-workspace disabled CTA behavior.

## 7. Files changed

- `vendor/paperclip/ui/src/lib/setup-health.ts`
- `vendor/paperclip/ui/src/pages/SetupHealth.tsx`
- `vendor/paperclip/ui/src/pages/SetupHealth.test.tsx`
- `user_lab/phase5/experiment_5g_request_flow_design.md`
- `user_lab/phase5/experiment_5g_result.md`

## 8. Runtime behavior confirmation

Phase 5G does not:

- call backend analysis,
- run an agent,
- run a command,
- read workspace files,
- modify workspace files,
- change runtime behavior.

The page constructs and validates a request in frontend state only.

## 9. What remains unimplemented

- submitting `AnalyzeWorkspaceRequest` anywhere,
- backend safety validation,
- safe metadata gathering,
- result generation,
- result rendering,
- Cloud AI execution gating,
- future `AnalyzeWorkspaceResult` flow.

## 10. Recommended next experiment

Phase 5H should define and implement the non-executing handoff layer between Setup Health and a future first-analysis runtime entry point, while still keeping actual execution disabled.
