# Experiment 1e Result

## 1. Objective

- Design the safest and most useful mitigation strategy for the confirmed non-ASCII workspace path / `x-codex-turn-metadata` websocket failure without implementing runtime changes.

## 2. Evidence basis

- Experiment 1c:
  - authenticated cloud run on the real non-ASCII path reproduced repeated websocket/header failures and HTTP fallback, but still completed
- Experiment 1d:
  - authenticated A/B comparison showed strong path-class evidence
  - non-ASCII path reproduced the failure
  - ASCII-only path did not
- Local verification:
  - `codex exec --help` did not expose a verified public flag to explicitly disable websocket/prewarm or force HTTP-only transport

## 3. Options evaluated

- `A. Do nothing / document only`
- `B. User-facing warning`
- `C. Unicode normalization`
- `D. ASCII-safe alias / shadow path`
- `E. Disable websocket / force HTTP fallback if configurable`
- `F. Sanitize metadata before Codex receives it`
- `G. Upstream Codex issue report`

## 4. Scoring summary

- Best immediate Phase 1 option:
  - `B. User-facing warning`
- Best supporting action:
  - `G. Upstream Codex issue report`
- Conditional option only if a real supported switch is found:
  - `E. Disable websocket / force HTTP fallback if configurable`
- Highest-risk options for now:
  - `C. Unicode normalization`
  - `D. ASCII-safe alias / shadow path`
  - `F. Sanitize metadata before Codex receives it`

## 5. Recommended path

- Primary:
  - implement a path-class detector plus one-time warning for cloud-hosted `codex_local`
- Secondary:
  - prepare and file a sanitized upstream Codex issue
- Preserve:
  - current runtime behavior and HTTP fallback path

## 6. Rejected options and why

- `C. Unicode normalization`
  - too risky without proof that path identity remains safe across filesystem, trust config, and tooling
- `D. ASCII-safe alias / shadow path`
  - too heavy and too error-prone for general editing workflows
- `F. Sanitize metadata before Codex receives it`
  - Paperclip ownership of the exact failing metadata payload is not proven
- `A. Do nothing / document only`
  - too weak given the now-strong user-impact evidence

## 7. Files changed

- `user_lab/phase1/experiment_1e_mitigation_options.md`
- `user_lab/phase1/experiment_1e_recommendation.md`
- `user_lab/phase1/experiment_1e_upstream_issue_draft.md`
- `user_lab/phase1/experiment_1e_result.md`
- `user_lab/phase1/experiment-log.md`

## 8. Tests run

- `swift build`
- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`
- markdown/file validation for required artifacts

## 9. Keep or revert

- Keep.
- This experiment is design-only and does not change runtime behavior.
- The value is a conservative implementation recommendation backed by measured evidence.

## 10. Remaining unknowns

- Whether the downstream Codex bug is tied specifically to decomposed Unicode versus broader non-ASCII path handling
- Whether a hidden Codex config/env switch exists outside public CLI help that safely avoids websocket/prewarm
- Whether a later adapter-side mitigation can reduce latency further without hiding the upstream bug or changing path semantics

## 11. Next recommended experiment

- `Experiment 1f — Path-Class Detector + One-Time Warning`

Suggested implementation goals:

1. detect affected workspace path classes safely
2. warn only for cloud-hosted `codex_local`
3. avoid warning spam
4. preserve current execution behavior
5. add focused tests for warning conditions
