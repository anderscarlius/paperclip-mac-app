# Experiment 1h Result

## 1. Objective

- Close Phase 1 cleanly by verifying submission readiness, assessing user impact, recording the Phase 1 decision, and recommending the next phase.

## 2. Submission readiness outcome

- Upstream package is paste-ready.
- The readiness checklist passed without needing edits to the issue package.

## 3. User impact outcome

- User impact is real but currently moderate:
  - affected cloud-hosted non-ASCII runs are slower and noisier
  - observed 1d delta was about `11.7 s`
  - tasks still completed successfully through HTTP fallback
- Warning-first mitigation is proportionate for now.

## 4. Phase 1 closeout decision

- Close Phase 1.
- Keep warning-first mitigation and upstream-ready documentation.
- Do not implement stronger local workaround yet.

## 5. Phase 2 recommendation

- Primary:
  - `Track A — Model Observability Gap`
- Secondary:
  - `Track B — Warning Surfacing in UI`

## 6. Files changed

- `user_lab/phase1/experiment_1h_submission_readiness.md`
- `user_lab/phase1/experiment_1h_user_impact_review.md`
- `user_lab/phase1/phase1_closeout_summary.md`
- `user_lab/phase1/phase1_decision_record.md`
- `user_lab/phase1/phase2_recommendation.md`
- `user_lab/phase1/experiment_1h_result.md`
- `user_lab/phase1/experiment-log.md`

## 7. Tests run

- `swift build`
- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`
- existence check for required 1h markdown files

## 8. Keep or revert

- Keep.
- No runtime behavior changed in Experiment 1h.
- The value is a clean Phase 1 closeout package and an explicit Phase 2 direction.

## 9. Remaining unknowns

- whether upstream Codex will confirm a Unicode/header serialization bug quickly
- whether future user-impact data will justify a stronger local mitigation
- whether `model: unknown` can be resolved cleanly without introducing routing confusion

## 10. Recommended next prompt

- Request a detailed Phase 2 prompt for `Track A — Model Observability Gap`, with a secondary note about how warning surfacing should follow once the runtime context is more authoritative.
