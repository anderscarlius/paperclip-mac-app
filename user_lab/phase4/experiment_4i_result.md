# Experiment 4i Result

## 1. Objective

Wire the Phase 4h local fallback UI prototype to a narrow real candidate signal or operator-visible diagnostics payload without enabling automatic routing or UI-triggered local inference.

## 2. Candidate signal source chosen

Experiment 4i chose the smallest safe version of Option C, gated by real runtime diagnostics presence in `AgentDetail`. The UI now derives a lab candidate signal only when run-detail runtime diagnostics exist, instead of rendering from unconditional demo data.

## 3. Signal contract summary

The new `LocalFallbackCandidateSignal` contract records:

- availability,
- source,
- optional task class,
- confidence,
- local model/runtime identity,
- routing-disabled flags,
- privacy and quality notes,
- eligible and ineligible reasons,
- non-executing actions.

The signal explicitly keeps `routingEnabled: false` and `automaticRoutingEnabled: false`.

## 4. UI behavior implemented

`LocalFallbackOfferCard` now renders only from a candidate signal.

- No signal: no card.
- Eligible signal with task class: full offer card with `Run locally`.
- Available signal without task class: diagnostic-only card with no `Run locally` action.
- Lab source: clearly labeled `Lab preview`.

The current `RunDetail` wiring uses real runtime-diagnostics presence plus a lab fixture source, so the default 4i surface is diagnostic-first rather than a direct local-run offer.

## 5. Demo/lab fixture status, if any

The lab fixture remains available, but only through the explicit helper `getLabLocalFallbackCandidateSignal(...)`. It is no longer rendered unconditionally, and it is clearly labeled as a lab preview rather than production eligibility.

## 6. Actions behavior

All actions remain prototype-safe and non-executing.

- `Run locally` shows a prototype notice only when the signal is eligible.
- `Use stronger model` shows a local notice only.
- `Cancel` dismisses the card locally.

No UI action triggers Ollama, backend mutation, or routing changes.

## 7. Files changed

- `vendor/paperclip/ui/src/lib/local-fallback-offer.ts`
- `vendor/paperclip/ui/src/pages/AgentDetail.tsx`
- `vendor/paperclip/ui/src/pages/AgentDetail.local-fallback.test.tsx`
- `user_lab/phase4/experiment_4i_signal_trace.md`
- `user_lab/phase4/local_fallback_candidate_signal.md`
- `user_lab/phase4/local_fallback_ui_behavior_4i.md`
- `user_lab/phase4/experiment_4i_result.md`

## 8. Tests/validation run

Ran:

- `bash user_lab/phase4/scripts/local_fallback_status.sh`
- `bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo`
- `bash user_lab/phase4/scripts/run_validation_with_timeout.sh --commands minimal --timeout 300`
- `python3 -m json.tool user_lab/phase4/validation/validation_run_20260503T204400Z.json`

Observed:

- status tool passed and produced `local_fallback_status_20260503T204400Z.json`
- handshake demo passed and produced `local_fallback_handshake_20260503T204400Z.json`
- minimal validation wrapper passed and produced `validation_run_20260503T204400Z.json`
- targeted UI test command was attempted but blocked by the known non-interactive PATH issue:
  `pnpm --filter @paperclipai/ui test -- AgentDetail.local-fallback.test.tsx`
  -> `zsh:1: command not found: pnpm`

## 9. Keep or revert

Keep.

The 4i change removes unconditional demo rendering, introduces a clearer signal contract, and still avoids runtime behavior changes.

## 10. Remaining unknowns

- There is still no real backend-supplied task-class candidate signal.
- The current `RunDetail` wiring therefore defaults to a diagnostic-only availability state.
- The narrow UI test file exists but could not be executed from this non-interactive shell because `pnpm` is unavailable in PATH.
- UI-triggered handshake invocation is still intentionally out of scope.

## 11. Recommended next experiment

Experiment 4j should define or prototype the smallest real backend/runtime candidate payload so the UI can move from lab-fixture diagnostics to truthful eligible-task surfacing without enabling automatic routing or UI-triggered inference.
