# Experiment 1a Result

## 1. Problem observed

- Phase 1 baseline captured a controlled cloud-hosted `codex_local` run with isolated `HOME` and missing auth.
- That run took about 14.8 seconds before surfacing a final `401 Unauthorized`.
- Most of the failure time and log volume came from downstream websocket retry and HTTP fallback behavior rather than an immediate auth diagnosis.

## 2. Root cause hypothesis

- `execute.ts` already knew enough to classify the run as cloud-hosted through runtime context.
- It did not perform any auth presence check before starting Codex execution.
- Because of that, clearly unauthenticated cloud-hosted runs entered deeper execution paths and produced misleading noise before failing.

## 3. Smallest useful change

- Added a presence-only auth preflight for cloud-hosted Codex runs in `execute.ts`.
- The preflight checks for either `OPENAI_API_KEY` or readable native Codex auth in the effective `CODEX_HOME`.
- If both are absent, the adapter returns a structured `missing_auth_preflight` failure before Codex execution starts.
- Local-hosted execution is unchanged.

## 4. Files changed

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`
- `vendor/paperclip/server/src/__tests__/codex-local-execute.test.ts`
- `user_lab/phase1/experiment_1a_auth_preflight_notes.md`
- `user_lab/phase1/experiment_1a_result.md`
- `user_lab/phase1/experiment-log.md`

## 5. Tests run

- `swift build`
- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`
- Post-change controlled no-auth rerun through the Paperclip baseline harness

## 6. Measured result

- Before change: controlled no-auth cloud-hosted run failed after about 14.8 seconds with websocket and HTTP retry noise before a final auth-style failure.
- After change: the same controlled no-auth scenario failed in 4 ms.
- The new failure is explicit: `missing_auth_preflight`.
- Runtime diagnostics still include `resultJson.runtimeContext`.
- No Codex execution attempt was made once missing auth was detected.

## 7. Keep or revert

- Keep.
- The diff is small, the behavior is clearer, and the measured outcome matches the experiment objective.

## 8. Remaining unknowns

- This does not prove that normal authenticated Desktop cloud runs are healthy.
- This does not address the separate non-ASCII workspace-path / header issue.
- Runtime context still reports `model: unknown` in this cloud path.
- Custom command wrappers that do not resemble direct `codex` invocation may need separate review if they should also use this guard.

## 9. Next recommended experiment

- Run Experiment 1b to isolate the non-ASCII workspace-path / header-encoding issue while holding auth constant.
