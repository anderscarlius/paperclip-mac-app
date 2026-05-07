# Experiment 4f Result

## 1. Objective

- Create an operator-facing diagnostic layer for the local fallback candidate path and add timeout-based validation hygiene for long-running checks.

## 2. Operator status tool implemented

- Created `user_lab/phase4/scripts/local_fallback_status.sh`
- Created `user_lab/phase4/scripts/local_fallback_status.py`
- The tool summarizes the latest reachable local model evidence, candidate policy status, eligible and ineligible task classes, latest smoke benchmark evidence, latest handshake demo evidence, and routing status.

## 3. Current local fallback status

- Canonical operator status JSON: `user_lab/phase4/status/local_fallback_status_20260503T121455Z.json`
- Canonical operator status markdown: `user_lab/phase4/reports/local_fallback_status_20260503T121455Z.md`
- Current classification: `available_candidate`
- Ollama status: reachable
- Model status: `gemma4:e4b` detected
- Policy status: `candidate`
- Routing status: `routingEnabled: false`
- Eligible task classes:
- `local_short_summary`
- `local_small_code_explanation`
- `local_short_policy_text`
- Ineligible task classes remain explicit in the 4c policy and were carried into the operator status report.
- Operator recommendation:
- local fallback is safe to offer manually for the narrow eligible classes
- local fallback is not safe for automatic routing

## 4. Validation timeout wrapper implemented

- Created `user_lab/phase4/scripts/run_validation_with_timeout.sh`
- The wrapper runs known validation commands with a per-command timeout, captures exit code and timeout status, and stores truncated stdout/stderr tails in JSON and markdown outputs.

## 5. Validation results

- Canonical validation JSON: `user_lab/phase4/validation/validation_run_20260503T121455Z.json`
- Canonical validation markdown: `user_lab/phase4/reports/validation_run_20260503T121455Z.md`
- Timeout used: `180 seconds` per command
- Validation summary:
- `swift build` classified as `failed`
- `pnpm --filter @paperclipai/server typecheck` classified as `timed_out`
- `pnpm --filter @paperclipai/ui typecheck` classified as `timed_out`
- The timeout wrapper therefore succeeded in preventing indefinite hangs and preserving structured evidence.
- Practical regression reruns also passed:
- `bash user_lab/phase4/scripts/local_fallback_prototype.sh --demo`
- `bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo`
- Fresh demo artifacts:
- `user_lab/phase4/prototype_runs/local_fallback_20260503T122727Z.json`
- `user_lab/phase4/reports/local_fallback_20260503T122727Z.md`
- `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T122727Z.json`
- `user_lab/phase4/reports/local_fallback_handshake_20260503T122727Z.md`
- Important validation caveat:
- the `swift build` failure in this run points to sandboxed cache/module write restrictions under `~/.cache/clang/ModuleCache`
- the two `pnpm` typechecks still require follow-up because they timed out with no stdout or stderr
- Final clarification from Experiment `4f.1`:
- manual `swift build` passed outside the wrapper
- both `pnpm` commands fail immediately as `command not found` in the current shell environment
- the original timeout classification was therefore a validation-hygiene problem, not evidence of local fallback regressions

## 6. Files changed

- `user_lab/phase4/status/.gitkeep`
- `user_lab/phase4/validation/.gitkeep`
- `user_lab/phase4/scripts/local_fallback_status.sh`
- `user_lab/phase4/scripts/local_fallback_status.py`
- `user_lab/phase4/scripts/run_validation_with_timeout.sh`
- `user_lab/phase4/experiment_4f_method.md`
- `user_lab/phase4/experiment_4f_result.md`
- `user_lab/phase4/experiment-log.md`
- Generated: `user_lab/phase4/status/local_fallback_status_20260503T121455Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_status_20260503T121455Z.md`
- Generated: `user_lab/phase4/validation/validation_run_20260503T121455Z.json`
- Generated: `user_lab/phase4/reports/validation_run_20260503T121455Z.md`
- Generated: `user_lab/phase4/prototype_runs/local_fallback_20260503T122727Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_20260503T122727Z.md`
- Generated: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T122727Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_handshake_20260503T122727Z.md`

## 7. Keep or revert

- Keep.
- The operator status tool is useful, read-only, and truthful.
- The timeout wrapper solved the main hygiene problem from 4e by turning indefinite waits into explicit structured results.

## 8. Remaining unknowns

- Automatic routing remains intentionally disabled, so no production integration path has been exercised.
- The `swift build` failure in the timeout wrapper appears environment- or sandbox-related rather than a local-fallback regression.
- The two `pnpm` typechecks still need a dedicated follow-up to determine why they produce no output before timing out.
- We still have not validated an operator-confirmation UX or a stronger-model fallback handoff after a low-quality eligible local result.

## 9. Recommended next experiment

- Recommend Experiment `4g`.
- The next safe step is to prototype an operator-facing diagnostics or review surface that can show this manual local fallback candidate and its evidence clearly, while keeping automatic routing disabled and leaving stronger-model fallback as the default path.
