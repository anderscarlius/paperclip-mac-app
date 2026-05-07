# Phase 5C Result

## 1. Objective

Build a static Setup Health UI mock with mock data only to validate layout, card hierarchy, readiness summary, CTA placement, copy clarity, and advanced-details affordance.

## 2. UI surface decision

Setup Health was implemented as a standalone page and route-wired into the existing UX preview route family:

- `vendor/paperclip/ui/src/pages/SetupHealth.tsx`
- `/:companyPrefix/tests/ux/setup-health`

An unprefixed redirect path was also added:

- `/tests/ux/setup-health`

This kept the mock low-risk and previewable without backend integration.

## 3. Mock data states

The mock data contract was created in:

- `vendor/paperclip/ui/src/lib/setup-health.ts`

Exported mock states:

- `mockSetupHealthReady`
- `mockSetupHealthNeedsAttention`
- `mockSetupHealthWorkspaceWarning`

The page includes local scenario switching between those states.

## 4. Component behavior

The page renders:

- title and subtitle
- overall readiness panel
- primary CTA
- secondary CTA
- five health cards
- per-card advanced details using collapsible sections
- local scenario switcher

All actions are static. Clicking actions only updates a local selected-action message.

## 5. User-facing copy used

The mock uses Phase 5B copy direction:

- Local AI is clearly optional
- Workspace warning says tasks should still work
- Developer Tools partial state says read-only analysis can still work
- Runtime degraded state remains calm

## 6. Actions behavior

Static-only action behavior:

- `Analyze this workspace` shows `Analyze workspace action selected`
- `Open diagnostics` shows `Open diagnostics action selected`
- other actions show `<label> action selected`

No backend or runtime call is made.

## 7. Files changed

Created:

- `vendor/paperclip/ui/src/pages/SetupHealth.tsx`
- `vendor/paperclip/ui/src/lib/setup-health.ts`
- `vendor/paperclip/ui/src/pages/SetupHealth.test.tsx`
- `user_lab/phase5/experiment_5c_ui_surface_decision.md`
- `user_lab/phase5/experiment_5c_result.md`

Updated:

- `vendor/paperclip/ui/src/App.tsx`
- `user_lab/phase5/experiment-log.md`

## 8. Tests/validation run

Requested file checks were run.

Also attempted:

- `bash user_lab/phase4/scripts/run_validation_with_timeout.sh --commands minimal --timeout 300`
- `pnpm --filter @paperclipai/ui test -- SetupHealth.test.tsx`

See final report for exact outcome.

## 9. Keep or revert

Recommendation:

- keep

Reason:

- the mock is low-risk
- it is isolated to preview routes and mock-only code
- it is a good base for 5D signal wiring

## 10. Remaining unknowns

- whether the final product surface should stay in web UI, move to native shell, or both
- how Workspace health will bind to a real selected code workspace
- whether Cloud AI readiness can be exposed cleanly with a small bridge or needs a richer status endpoint
- whether Runtime should remain a full-width card in the final design

## 11. Recommended next experiment

Recommended next experiment:

`Phase 5D — Connect Existing Runtime Diagnostics`

Reason:

- the layout and copy are now concrete
- the next highest-value step is replacing mock data with existing real signals without changing runtime behavior
