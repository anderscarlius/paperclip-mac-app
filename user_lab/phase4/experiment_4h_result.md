# Experiment 4h Result

## 1. Objective

- Implement the smallest useful operator-facing local fallback UI prototype without enabling automatic routing or changing production default behavior.

## 2. UI surface chosen

- Chosen surface: existing run detail diagnostics area in `vendor/paperclip/ui/src/pages/AgentDetail.tsx`
- Placement: directly below the existing runtime diagnostics card inside `RunDetail`
- Surface decision document: `user_lab/phase4/experiment_4h_ui_surface_decision.md`
- Reason:
- low risk
- already associated with runtime diagnostics and warnings
- does not require global composer or settings integration

## 3. Prototype behavior

- Added a minimal `LocalFallbackOfferCard` prototype to `AgentDetail`
- The card appears as a lab preview when runtime diagnostics are present
- It uses demo offer data shaped from the 4g UI contract rather than real task classification
- It is explicitly marked as a prototype preview and says that automatic routing is disabled
- User actions only update local component state or dismiss the card; no local inference is triggered from the UI

## 4. User-facing copy used

- Header:
- `Run locally instead?`
- Body:
- `This task looks suitable for your local model. It keeps data on this Mac and avoids cloud cost, but quality may be lower than the cloud model.`
- Badge:
- `Local fallback candidate · Medium confidence`
- Details include:
- model `gemma4:e4b`
- runtime `Ollama`
- best-for and not-for lists
- routing line `automatic routing disabled`

## 5. Actions implemented

- `Run locally`
- `Use stronger model`
- `Cancel`
- Prototype action behavior:
- `Run locally` shows a prototype notice pointing the operator to the manual tooling or handshake flow
- `Use stronger model` shows a prototype notice that stronger-model fallback remains the normal path
- `Cancel` dismisses the card locally for that view

## 6. What is still not wired

- no real task classification
- no real handshake invocation from UI
- no UI-triggered local inference
- no persistent preference system
- no automatic routing
- no global composer integration

## 7. Files changed

- `vendor/paperclip/ui/src/pages/AgentDetail.tsx`
- `vendor/paperclip/ui/src/lib/local-fallback-offer.ts`
- `vendor/paperclip/ui/src/pages/AgentDetail.local-fallback.test.tsx`
- `user_lab/phase4/experiment_4h_ui_surface_decision.md`
- `user_lab/phase4/experiment_4h_result.md`
- `user_lab/phase4/experiment-log.md`
- Generated: `user_lab/phase4/status/local_fallback_status_20260503T200559Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_status_20260503T200559Z.md`
- Generated: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T200559Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_handshake_20260503T200559Z.md`
- Generated: `user_lab/phase4/validation/validation_run_20260503T200559Z.json`
- Generated: `user_lab/phase4/reports/validation_run_20260503T200559Z.md`

## 8. Tests/validation run

- Passed `bash user_lab/phase4/scripts/local_fallback_status.sh`
- Passed `bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo`
- Passed `bash user_lab/phase4/scripts/run_validation_with_timeout.sh --commands minimal --timeout 300`
- Validation outcome:
- status remained `available_candidate`
- handshake demo passed
- minimal validation wrapper passed `3/3`
- Added a narrow UI render test in `vendor/paperclip/ui/src/pages/AgentDetail.local-fallback.test.tsx`
- UI test was not executed in this shell environment because `pnpm` remains unavailable in the current non-interactive PATH, and this did not block the experiment

## 9. Keep or revert

- Keep.
- The prototype is clearly optional, uses truthful product language, preserves stronger-model fallback, and does not change production default behavior.

## 10. Remaining unknowns

- The card currently uses lab/demo offer data rather than real task classification
- No user feedback has been gathered on the copy or placement yet
- No real UI-triggered local execution path exists yet
- Broader UI package test execution still depends on fixing `pnpm` availability in the non-interactive shell environment

## 11. Recommended next experiment

- Recommend Experiment `4i`.
- The next safe step is to connect this UI prototype to a narrow real candidate signal or operator-visible runtime diagnostics payload while still keeping execution opt-in and automatic routing disabled.
