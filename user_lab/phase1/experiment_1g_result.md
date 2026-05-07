# Experiment 1g Result

## 1. Objective

- Prepare a high-quality upstream issue package for the confirmed Codex websocket metadata/header failure on non-ASCII/decomposed Unicode workspace paths, and decide whether Paperclip should stop at warning-first mitigation for now.

## 2. Upstream issue package status

- Ready.
- `experiment_1g_upstream_issue_final.md` is written as a sanitized issue-ready report with:
  - title
  - summary
  - environment
  - expected vs actual behavior
  - minimal reproduction
  - evidence summary
  - ruled-out causes
  - sanitized logs

## 3. Repro plan status

- Ready.
- `experiment_1g_repro_plan.md` provides a minimal, safe, temp-directory-based reproduction path that does not depend on the private Paperclip repo.

## 4. Evidence bundle summary

- Ready.
- `experiment_1g_evidence_bundle.md` condenses the relevant signals from 1a, 1b, 1c, 1d, and 1f into a short, reusable package with sanitized snippets and measured timing.

## 5. Decision gate outcome

- Outcome:
  - stop at warning-first mitigation for now
  - prepare upstream report
  - do not implement stronger local workaround yet

## 6. Files changed

- `user_lab/phase1/experiment_1g_upstream_issue_final.md`
- `user_lab/phase1/experiment_1g_repro_plan.md`
- `user_lab/phase1/experiment_1g_evidence_bundle.md`
- `user_lab/phase1/experiment_1g_decision_gate.md`
- `user_lab/phase1/experiment_1g_result.md`
- `user_lab/phase1/experiment-log.md`

## 7. Tests run

- `swift build`
- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`
- existence check for required Experiment 1g markdown files

## 8. Keep or revert

- Keep.
- No runtime behavior changed in this experiment.
- The value is a clean upstream-ready package plus a conservative local decision gate.

## 9. Remaining unknowns

- whether the true trigger is decomposed Unicode specifically or a broader non-ASCII class
- whether upstream Codex already has an internal unsupported transport switch
- whether future user-impact data will justify a stronger local workaround

## 10. Recommended next experiment

- `Experiment 1h — Post-Issue Submission Readiness or User-Impact Review`

Suggested scope:

1. confirm the upstream package is ready to paste as-is
2. decide whether to track warning frequency / support burden qualitatively
3. revisit stronger mitigation only if the warning-first approach proves insufficient
