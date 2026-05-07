# Phase 5E Result

## 1. Objective

Make Setup Health understand workspace selection well enough to drive first-action readiness without executing analysis.

## 2. Workspace trace summary

Paperclip already has real project workspace and execution workspace models, including local `cwd` fields, but they are tied to project and issue flows rather than a simple first-run “workspace to analyze” concept.

No clean first-run selected-folder source was found for Setup Health.

## 3. Workspace contract summary

`setup-health.ts` now defines:

- `WorkspacePathHealth`
- `SetupHealthWorkspaceDiagnostics`
- `classifyWorkspacePathForSetupHealth(path)`

This gives Setup Health a clean place to accept a future real workspace bridge.

## 4. Path health behavior

5E now classifies workspace paths with a pure helper:

- ASCII path with no spaces -> `none`
- spaces only -> `low`
- non-ASCII, decomposed Unicode, or percent encoding -> `medium`
- missing or invalid path -> `unknown`

Important product behavior:

- low-risk spaces stay `Ready`
- medium-risk Unicode / encoded paths become `Warning`
- warning paths do not block read-only analysis

## 5. Analyze CTA behavior

The top CTA now behaves like a real next step:

- no workspace -> disabled
- workspace ready -> enabled
- workspace warning -> enabled

Clicking the CTA with a selected workspace opens a local read-only preview:

- first task is read-only
- no files will be changed
- no commands will run without approval

No analysis executes in 5E.

## 6. Real signals connected

Workspace diagnostics can now be rendered if provided through `SetupHealthDiagnostics.workspace`.

The page also now renders selected workspace name/path clearly when available.

## 7. Remaining mocked / missing bridges

Still missing:

- a true first-run selected workspace source for Setup Health
- a native or backend bridge that feeds that workspace into live diagnostics mode
- real workspace persistence owned by the Setup Health journey

So in diagnostics mode, workspace may still remain missing/unknown until the next phase introduces the bridge.

## 8. Tests run

Ran:

```bash
pnpm exec vitest run src/pages/SetupHealth.test.tsx
```

Observed result:

- `1` file passed
- `14` tests passed

## 9. Files changed

- `vendor/paperclip/ui/src/lib/setup-health.ts`
- `vendor/paperclip/ui/src/pages/SetupHealth.tsx`
- `vendor/paperclip/ui/src/pages/SetupHealth.test.tsx`
- `user_lab/phase5/experiment_5e_workspace_trace.md`
- `user_lab/phase5/experiment_5e_workspace_contract.md`
- `user_lab/phase5/experiment_5e_analyze_cta_behavior.md`
- `user_lab/phase5/experiment_5e_result.md`
- `user_lab/phase5/experiment-log.md`

## 10. Keep or revert

Keep.

This change is low-risk because:

- it adds no runtime behavior
- it runs no analysis
- it keeps the live page honest when no real workspace bridge exists
- it gives a future bridge a stable UI contract

## 11. Recommended next experiment

Phase 5F should define and implement the first safe task backend contract for `Analyze this workspace`, still read-only, and connect the `Continue to analysis setup` step to that non-executing request shape.
