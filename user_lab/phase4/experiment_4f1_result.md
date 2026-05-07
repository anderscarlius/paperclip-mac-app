# Experiment 4f.1 Result

## 1. Objective

- Stabilize and clarify the validation state after Experiment 4f without changing runtime behavior or local fallback behavior.

## 2. Diagnostics performed

- Re-ran `swift build` manually outside the timeout wrapper
- Re-ran `pnpm --filter @paperclipai/server typecheck` manually outside the timeout wrapper
- Re-ran `pnpm --filter @paperclipai/ui typecheck` manually outside the timeout wrapper
- Re-ran `bash user_lab/phase4/scripts/local_fallback_status.sh`
- Re-ran `bash user_lab/phase4/scripts/local_fallback_prototype.sh --demo`
- Re-ran `bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo`
- Improved and re-ran `bash user_lab/phase4/scripts/run_validation_with_timeout.sh --timeout 300`

## 3. Swift build finding

- Manual `swift build` completed successfully.
- The wrapper version still failed under `/bin/bash -lc` with cache/module write errors involving `~/.cache/clang/ModuleCache`.
- Classification: wrapper or process-environment issue, not a demonstrated local fallback code regression.

## 4. pnpm server typecheck finding

- Manual command failed immediately with `command not found: pnpm`.
- Improved wrapper classified it as `failed`, not `timed_out`, and captured `baseCommandAvailable: false`.
- Classification: shell/PATH validation issue, not a real server typecheck result and not a local fallback failure.

## 5. pnpm UI typecheck finding

- Manual command failed immediately with `command not found: pnpm`.
- Improved wrapper classified it as `failed`, not `timed_out`, and captured `baseCommandAvailable: false`.
- Classification: shell/PATH validation issue, not a real UI typecheck result and not a local fallback failure.

## 6. Wrapper changes

- Added `--commands minimal|standard|full`
- Added command start/end markers
- Added cwd and runner shell reporting
- Added base command availability/path checks
- Added first relevant error capture
- Added per-command recommendation text

## 7. Final validation status

- Local fallback status tool passed and still reports `available_candidate`
- Local fallback prototype demo passed
- Local fallback handshake demo passed
- Standard wrapper validation is now more truthful:
- `swift build` fails only inside the wrapper process environment
- both `pnpm` checks are environment/PATH failures rather than silent hangs or proven repo-wide type failures

## 8. 4g readiness decision

- Ready for `4g`
- Reason:
- the operator-facing local fallback artifacts still pass
- routing remains disabled
- the remaining validation issues are classified as validation hygiene or environment issues, not as regressions in files touched by 4d, 4e, or 4f

## 9. Files changed

- `user_lab/phase4/scripts/run_validation_with_timeout.sh`
- `user_lab/phase4/experiment_4f_result.md`
- `user_lab/phase4/experiment_4f1_validation_diagnostics.md`
- `user_lab/phase4/experiment_4f1_result.md`
- `user_lab/phase4/experiment-log.md`
- Generated: `user_lab/phase4/status/local_fallback_status_20260503T123533Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_status_20260503T123533Z.md`
- Generated: `user_lab/phase4/prototype_runs/local_fallback_20260503T123533Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_20260503T123533Z.md`
- Generated: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T123533Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_handshake_20260503T123533Z.md`
- Generated: `user_lab/phase4/validation/validation_run_20260503T123629Z.json`
- Generated: `user_lab/phase4/reports/validation_run_20260503T123629Z.md`

## 10. Remaining unknowns

- The wrapper-specific `swift build` failure still needs deeper shell/process-environment investigation if broad repo validation becomes important again.
- `pnpm` still needs a known non-interactive PATH or absolute binary path before wrapper-based repo typechecks can be trusted.
- No broader production routing integration has been exercised yet.

## 11. Recommended next experiment

- Recommend Experiment `4g`.
- The next safe step is an operator-facing diagnostics or review surface for the manual local fallback candidate, while keeping automatic routing disabled.
