# Experiment 1e Mitigation Options

## Evidence basis

- Experiment 1c showed that an authenticated cloud-hosted `codex_local` run on the real non-ASCII path reproduced repeated websocket/header failures for `x-codex-turn-metadata`, then fell back to HTTP and still completed successfully.
- Experiment 1d showed strong path-class evidence:
  - non-ASCII path: websocket/header failure + reconnect loop + HTTP fallback
  - ASCII-only path: no matching websocket/header failure and no HTTP fallback
- Experiment 1b showed that the Paperclip adapter does not directly place workspace path into HTTP or websocket headers.
- `codex exec --help` did not show any verified public CLI flag to explicitly disable websocket/prewarm or force HTTP-only execution for this case.

## Scoring method

- Scores are `1–5`, where `5` is better for Paperclip in Phase 1.
- For `Engineering effort`, `5` means low effort.
- For `Risk of data loss`, `5` means low risk.
- For `Risk of hiding upstream bug`, `5` means low risk of hiding the upstream bug.

## Path classification concept

Concept only, not implementation yet:

```text
workspace_path_class:
- ascii_safe
- contains_spaces
- contains_non_ascii
- contains_decomposed_unicode
- contains_percent_encoding
- unknown
```

Safe detection approach:

- `ascii_safe`
  - every code point is ASCII printable path-safe content
- `contains_spaces`
  - string contains one or more space characters
- `contains_non_ascii`
  - any code point is outside ASCII
- `contains_decomposed_unicode`
  - compare `path === normalize("NFD", path)` and `path !== normalize("NFC", path)` with at least one non-ASCII code point
- `contains_percent_encoding`
  - detect `%` followed by two hex digits without decoding or rewriting the path
- `unknown`
  - fallback if detection cannot run safely

Important detection constraints:

- inspect the string only
- do not rewrite the filesystem path in this phase
- do not assume percent-encoded text should be decoded
- preserve the original path for user display

## User-facing warning copy for Option B

Draft copy:

> This workspace path contains characters that can make Codex cloud runs fall back from websocket to HTTP. The task may still complete, but startup can be slower and logs may show connection warnings. For the smoothest cloud Codex performance, use an ASCII-only workspace path when practical.

Recommended tone:

- clear
- actionable
- non-alarming
- honest that completion is still possible

Recommended behavior:

- show only for cloud-hosted `codex_local`
- show only when the workspace path class is affected
- default to one-time-per-workspace or one-time-per-session to avoid warning fatigue

## Scoring table

| Option | User value | Safety | Engineering effort | Reversibility | Testability | Risk of data loss | Risk of hiding upstream bug | Expected latency improvement | Suitability for Phase 1 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| A. Do nothing / document only | 2 | 5 | 5 | 5 | 5 | 5 | 5 | 1 | 2 |
| B. User-facing warning | 4 | 5 | 4 | 5 | 4 | 5 | 5 | 1 | 5 |
| C. Unicode normalization | 2 | 1 | 2 | 2 | 2 | 1 | 3 | 3 | 1 |
| D. ASCII-safe alias / shadow path | 4 | 2 | 1 | 2 | 2 | 2 | 3 | 4 | 2 |
| E. Disable websocket / force HTTP if configurable | 3 | 4 | 3 | 4 | 3 | 5 | 4 | 3 | 3 |
| F. Sanitize metadata before Codex receives it | 3 | 2 | 2 | 3 | 2 | 5 | 2 | 4 | 2 |
| G. Upstream Codex issue report | 4 | 5 | 4 | 5 | 4 | 5 | 5 | 1 | 5 |

## Option analysis

### Option A — Do Nothing / Document Only

Description:

- Accept HTTP fallback as current behavior.
- Document the known issue.
- No runtime warning.

Assessment:

- Lowest engineering cost.
- Safest from a code-change perspective.
- Weak user experience because the user still pays latency and sees noisy logs without explanation.
- Not strong enough as the only Phase 1 response now that path-class evidence is strong.

### Option B — User-Facing Warning

Description:

- Detect affected workspace path classes before a cloud-hosted `codex_local` run.
- Warn that websocket startup may fail and fall back to HTTP.
- Suggest an ASCII-only workspace path when practical.

Assessment:

- Best immediate safety/value tradeoff.
- Does not modify execution semantics.
- Does not hide the upstream bug.
- Helps users decide whether latency/noise is expected.
- Should be low-friction and rate-limited to avoid alert fatigue.

### Option C — Unicode Normalization

Description:

- Normalize the workspace path before handoff, for example to NFC, while preserving the displayed path.

Assessment:

- Too risky right now.
- macOS filesystems often tolerate normalization differences, but that does not prove that all tooling, trust lists, git config, plugin discovery, or downstream path identity checks will remain correct.
- A normalization-based mitigation could silently point Codex at a path string that differs from the real user-visible path.
- This is not acceptable without a narrower proof experiment.

### Option D — ASCII-Safe Alias / Shadow Path

Description:

- Create an ASCII-only alias, copy, or shadow workspace for cloud-hosted Codex runs.

Assessment:

- Read-only diagnostics are relatively tractable.
- Editing workflows are much riskier because file mapping, git state, trust config, timestamps, and stale-copy issues appear quickly.
- A copy-based shadow path can improve startup behavior, but it introduces source-of-truth ambiguity.
- A symlink is not enough if realpath resolves back to the original non-ASCII path.
- This is too heavy as a first mitigation for general editing runs.

### Option E — Disable Websocket / Force HTTP Fallback If Configurable

Description:

- Use a verified Codex flag, env var, or config key to avoid the websocket/prewarm path on affected workspace classes.

Assessment:

- Attractive if real, because it targets the failing transport rather than changing path semantics.
- Current verification status:
  - `codex exec --help` does not expose a public `--http-only`, `--disable-websocket`, or equivalent flag.
  - No verified Paperclip-side hook has been found yet for disabling websocket/prewarm in the downstream Codex cloud path.
- This remains a candidate only if a real supported switch is later discovered.

### Option F — Sanitize Metadata Before Codex Receives It

Description:

- Sanitize workspace metadata to ASCII-safe form while preserving the real `cwd`.

Assessment:

- Potentially high value if Paperclip truly controls the exact metadata that becomes `x-codex-turn-metadata`.
- Current evidence from Experiment 1b weakens that assumption:
  - Paperclip passes `cwd` and `PAPERCLIP_WORKSPACE_*` env
  - the failing header appears to be generated downstream in Codex CLI/core
- A mismatch between `cwd` and metadata path may also mislead downstream systems.
- This is not safe to recommend first without proof that Paperclip actually owns the failing metadata payload.

### Option G — Upstream Codex Issue Report

Description:

- Prepare a sanitized upstream issue with minimal reproduction and A/B evidence.

Assessment:

- High value because the strongest evidence points downstream into Codex websocket metadata handling.
- Low engineering cost.
- Compatible with a conservative Paperclip-side mitigation such as Option B.
- Does not solve user experience by itself, so it should be paired with a local mitigation or warning strategy.

## Interim ranking

1. `B. User-facing warning`
2. `G. Upstream Codex issue report`
3. `E. Disable websocket / force HTTP if configurable` only if a real supported switch is later verified
4. `A. Do nothing / document only`
5. `D. ASCII-safe alias / shadow path` for read-only-only scenarios, not general editing
6. `F. Sanitize metadata before Codex receives it`
7. `C. Unicode normalization`
