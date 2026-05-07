# Baseline Summary

## System Snapshot

- Runtime working: partially
- Model used: not surfaced; runtime context reported `unknown`
- Execution type: local `codex_local` adapter with cloud-hosted model path
- Environment: local macOS dev machine, workspace path contains non-ASCII characters, Codex managed `CODEX_HOME`, Paperclip runtime context injection enabled, baseline run executed from an isolated temporary `HOME`

## Observed Behavior

- Speed
  Fast local setup: managed home, skill injection, and first Codex event all arrived almost immediately.
  Slow failure: the run still took ~14.8s because retries and fallback behavior happened before the terminal error.

- Quality
  No useful answer was produced. The run failed before the agent delivered any repo analysis.

- Clarity
  Runtime context was visible and internally consistent.
  Failure clarity was poor at the user level because multiple failure layers surfaced together.

## Key Issues

- Missing or invalid cloud auth is not detected early in the controlled no-auth path.
- Non-ASCII workspace paths appear to contribute to websocket metadata failures.
- Runtime context does not surface the actual model.
- Prompt weighting favors generic runtime guidance over the new runtime-context block.
- Final failure diagnosis is too layered for a quick user read.

## Known Limitations Of This Baseline

- The auth failure was captured in an isolated environment without inherited shared Codex auth.
- The auth result is therefore representative of a missing-auth path, but not yet a confirmed reproduction of the normal logged-in Desktop path.
- `model: unknown` should currently be treated as a runtime-context observability gap, not as a reliable statement that no model would have been chosen.

## What Is Working Well

- Runtime context injection is real, visible, and consistent across prompt, env, and result.
- Local setup overhead is very low.
- Managed `CODEX_HOME` bootstrapping worked.
- Paperclip skill injection worked.
- The session-integrity mitigation still surfaced a clean warning instead of silently reusing a broken session.
