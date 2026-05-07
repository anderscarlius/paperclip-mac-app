# Experiment 1e Recommendation

## Primary mitigation

- Implement a path-class detector plus a low-friction user-facing warning for cloud-hosted `codex_local` runs on affected workspace paths.

Why this is the best next step:

- It is the safest mitigation that materially improves user understanding.
- It does not change execution semantics.
- It does not risk path mismatch or file-mapping bugs.
- It is consistent with the evidence that tasks may still complete through HTTP fallback.
- It avoids pretending the upstream Codex bug is solved locally.

Recommended warning behavior:

- trigger only for cloud-hosted `codex_local`
- trigger only when workspace path class is affected
- prefer one-time-per-workspace or one-time-per-session display
- include a practical suggestion to use an ASCII-only workspace path when convenient
- clearly state that the run may still succeed, but with slower startup and noisy connection warnings

## Secondary mitigation

- Prepare and submit an upstream Codex CLI/core issue using the sanitized draft from this experiment.

Why:

- The strongest evidence points downstream to websocket metadata serialization.
- Upstream is the most likely place for a durable root-cause fix.
- Paperclip should carry a local user-experience mitigation, but should not silently absorb the full defect if the real bug is elsewhere.

## What NOT to do yet

- Do not normalize workspace paths before handoff yet.
  - Too much risk of path identity mismatch on macOS and surrounding tooling.
- Do not build a general shadow-workspace execution path yet.
  - Too much complexity and too much edit-mapping risk for a first mitigation.
- Do not assume Paperclip can safely sanitize the exact failing metadata payload yet.
  - That control point is not proven.
- Do not add a forced-HTTP workaround unless a real supported Codex switch is verified first.
  - `codex exec --help` did not expose one.

## Next implementation experiment

- `Experiment 1f — Path-Class Detector + One-Time Warning`

Suggested scope for 1f:

1. Detect affected workspace path classes without rewriting the path.
2. Surface a one-time warning only for cloud-hosted `codex_local`.
3. Include simple actionable copy.
4. Preserve existing runtime behavior.
5. Add focused tests for detector behavior and warning conditions.

## Optional follow-up after 1f

- `Experiment 1g — Upstream Repro Packaging / Issue Submission`

Suggested scope:

1. tighten the sanitized repro into temp-path steps
2. attach A/B evidence
3. record the upstream issue reference in `user_lab`
