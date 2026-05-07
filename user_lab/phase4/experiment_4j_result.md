# Experiment 4j Result

## 1. Objective

Implement the smallest real backend/runtime candidate payload that allows the UI to surface a true local-fallback offer only when explicit evidence exists, without enabling automatic routing or UI-triggered local inference.

## 2. Payload trace summary

The trace showed that `AgentDetail` already receives `resultJson.runtimeContext`, and the `codex-local` adapter already receives a generic `context: Record<string, unknown>`. There was no existing safe built-in task-class field, so 4j used explicit metadata only instead of inferring from prompt text, issue text, or repo contents.

## 3. Payload contract created

4j defined `LocalFallbackCandidatePayload` with:

- `available`
- `decision`
- `source`
- optional eligible `taskClass`
- `confidence`
- local model/runtime identity
- routing-disabled flags
- privacy/quality notes
- eligible/ineligible reasons
- `recommendedFallback: "stronger_model"`

The contract is documented in:

- `user_lab/phase4/local_fallback_candidate_payload.md`

## 4. Backend strategy chosen

4j chose a conservative Option B:

- accept explicit normalized candidate payloads from adapter context, or
- accept a 4e-style local-fallback handshake request from adapter context,
- normalize that into `runtimeContext.localFallbackCandidate`,
- preserve a compact copy in heartbeat-visible runtime diagnostics.

No free-form prompt classification was added.

## 5. Implementation summary

Implemented:

- backend normalization in `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`
- compact diagnostics preservation in `vendor/paperclip/server/src/services/heartbeat-run-summary.ts`
- UI payload consumption in `vendor/paperclip/ui/src/lib/local-fallback-offer.ts`
- `AgentDetail` consumption of real payloads in `vendor/paperclip/ui/src/pages/AgentDetail.tsx`

Supported explicit context inputs now include:

- `context.localFallbackCandidate`
- `context.paperclipLocalFallbackCandidate`
- `context.localFallbackCandidateRequest`
- `context.paperclipLocalFallbackRequest`

For the handshake-style request, 4j only creates:

- `eligible` when an explicit eligible task class is provided and no disqualifying flags are set
- `diagnostic_only` when fallback metadata exists but no eligible task class is present
- `not_eligible` when explicit disqualifying flags are present

## 6. UI behavior after change

The UI now consumes a real payload when present.

- `eligible` shows the full `Run locally instead?` offer
- `diagnostic_only` shows availability without `Run locally`
- `not_eligible` shows a muted recommendation to use a stronger model
- missing payload shows no local-fallback card

Automatic routing remains disabled, and UI actions still do not execute inference.

## 7. Files changed

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`
- `vendor/paperclip/server/src/services/heartbeat-run-summary.ts`
- `vendor/paperclip/server/src/__tests__/heartbeat-run-summary.test.ts`
- `vendor/paperclip/server/src/__tests__/codex-local-execute.test.ts`
- `vendor/paperclip/ui/src/lib/local-fallback-offer.ts`
- `vendor/paperclip/ui/src/pages/AgentDetail.tsx`
- `vendor/paperclip/ui/src/pages/AgentDetail.local-fallback.test.tsx`
- `user_lab/phase4/experiment_4j_payload_trace.md`
- `user_lab/phase4/local_fallback_candidate_payload.md`
- `user_lab/phase4/experiment_4j_result.md`

## 8. Tests/validation run

Ran:

- `bash user_lab/phase4/scripts/local_fallback_status.sh`
- `bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo`
- `bash user_lab/phase4/scripts/run_validation_with_timeout.sh --commands minimal --timeout 300`
- `python3 -m json.tool user_lab/phase4/validation/validation_run_20260503T210308Z.json`

Observed:

- status tool passed and produced `local_fallback_status_20260503T210308Z.json`
- handshake demo passed and produced `local_fallback_handshake_20260503T210308Z.json`
- minimal validation wrapper passed and produced `validation_run_20260503T210308Z.json`
- targeted UI test command was attempted but still blocked by the known PATH issue:
  `pnpm --filter @paperclipai/ui test -- AgentDetail.local-fallback.test.tsx`
  -> `zsh:1: command not found: pnpm`

Server and UI test files were updated, but they were not executed from this shell because `pnpm` remains unavailable in the non-interactive PATH.

## 9. Keep or revert

Keep.

The 4j change adds a real backend/runtime payload path, keeps offer gating conservative, and does not change routing or execution behavior.

## 10. Remaining unknowns

- There is still no production caller that emits explicit local-fallback request metadata by default.
- Because of that, most existing runs will still show no eligible local-fallback offer unless explicit metadata is supplied.
- UI test execution remains blocked in this shell environment by the known `pnpm` PATH issue.
- No UI-triggered handshake or local execution path exists yet, by design.

## 11. Recommended next experiment

Experiment 4k should define the smallest producer of explicit local-fallback candidate metadata in a real operator flow, so at least one narrow real task path can surface an eligible offer without relying on lab-only fixtures.
