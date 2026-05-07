# Decision: Close Phase 1 with Warning-First Mitigation

## Status

Accepted

## Context

- Missing-auth noise has been separated by auth preflight.
- The remaining websocket/header issue reproduces only on non-ASCII/decomposed workspace path classes under authenticated cloud-hosted `codex_local`.
- Paperclip adapter inspection did not show direct ownership of the failing websocket/header payload.
- Authenticated runs still complete successfully through HTTP fallback.
- A warning-first mitigation now exists and tests pass.
- A sanitized upstream issue package is prepared.

## Decision

- Close Phase 1 after Experiment 1h.
- Keep warning-first mitigation and the upstream issue package.
- Do not implement a stronger local workaround unless additional user-impact data or upstream response changes the tradeoff.

## Consequences

- Users on affected paths receive an honest warning without behavior changes.
- Paperclip avoids risky local workarounds such as path normalization or shadow workspaces.
- The upstream bug remains visible and well-documented.
- Latency and noisy logs can still affect some users until upstream behavior changes or stronger mitigation is later justified.

## What would reopen this decision?

- Evidence that affected tasks start failing rather than merely slowing down
- Repeated user confusion or support burden despite the warning
- Discovery of a safe, supported Codex switch for HTTP-only or websocket-disable behavior
- Proof that Paperclip directly controls the failing metadata payload and can sanitize it safely
- Upstream feedback that suggests a safe local mitigation path

## Related artifacts

- `experiment_1a_result.md`
- `experiment_1c_result.md`
- `experiment_1d_result.md`
- `experiment_1e_recommendation.md`
- `experiment_1f_result.md`
- `experiment_1g_upstream_issue_final.md`
- `experiment_1g_decision_gate.md`
- `phase1_closeout_summary.md`
