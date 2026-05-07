# Phase 5D Result

## 1. Objective

Connect the Phase 5C Setup Health mock to safe existing diagnostics without changing runtime behavior.

## 2. Diagnostics trace summary

5D found three safe live signal groups already available to the web UI:

- app health through `/api/health`
- recent heartbeat run summaries through `heartbeatsApi.list()`
- run-scoped local fallback diagnostics already parsed by `readLocalFallbackCandidateSignal()`

This means Cloud AI, Local AI, and Runtime can be meaningfully connected now.

## 3. Mapping contract summary

`vendor/paperclip/ui/src/lib/setup-health.ts` now defines:

- `SetupHealthDiagnostics`
- `buildSetupHealthViewModel(diagnostics?)`

The mapper is pure and test-covered. It converts partial diagnostics into user-facing cards while keeping advanced details available for internal terms.

## 4. Signals connected now

- Cloud AI auth readiness hint from `/api/health`
- latest known provider/model-hosting/model-info from recent run diagnostics
- Local AI availability hint from local fallback candidate or local model-hosting context
- Runtime last-run status from heartbeat status
- Runtime warnings from summarized heartbeat `resultJson.warnings`

## 5. Signals still mocked or unknown

- Workspace selection on this screen
- workspace path health / path-class result
- developer tool availability summary
- PATH issue summary from native runtime checks
- standalone Ollama reachability from the native shell

These remain fallback/unknown states in diagnostics mode and fully explorable in mock mode.

## 6. Page behavior

`SetupHealth.tsx` now:

- defaults to a live `Diagnostics` mode
- still offers `Mock states` for preview and copy review
- uses live app health and recent runs when available
- falls back safely when no live source exists
- keeps all actions static and non-executing

Important product behavior:

- Local AI remains optional
- Workspace remains blocking until a real workspace signal exists
- Developer Tools remain non-blocking unless a true PATH issue is bridged later

## 7. Tests run

Ran:

```bash
pnpm exec vitest run src/pages/SetupHealth.test.tsx
```

Observed result:

- `1` test file passed
- `8` tests passed

## 8. Files changed

- `vendor/paperclip/ui/src/lib/setup-health.ts`
- `vendor/paperclip/ui/src/pages/SetupHealth.tsx`
- `vendor/paperclip/ui/src/pages/SetupHealth.test.tsx`
- `user_lab/phase5/experiment_5d_diagnostics_trace.md`
- `user_lab/phase5/experiment_5d_mapping_contract.md`
- `user_lab/phase5/experiment_5d_result.md`
- `user_lab/phase5/experiment-log.md`

## 9. Keep or revert

Keep.

This is a low-risk integration:

- no runtime behavior changed
- no new backend behavior was added
- the page remains preview-safe
- the mapping layer is isolated and testable

## 10. Remaining unknowns

- where the real first-run workspace should come from
- how to surface path-risk preflight cleanly
- whether Developer Tools should be fed from native diagnostics, server diagnostics, or a shared bridge payload
- whether Setup Health should stay a preview route in 5E or become a dashboard entry surface

## 11. Recommended next experiment

Phase 5E should connect:

- real workspace selection
- real workspace path health
- the `Analyze this workspace` CTA entry point

That is the smallest next step that converts Setup Health from “system status preview” into a true first-value product surface.
