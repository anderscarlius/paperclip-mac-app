# Experiment 1c Result

## 1. Objective

- Run one authenticated cloud-hosted `codex_local` execution against a real workspace path containing spaces and decomposed non-ASCII characters, then determine whether the remaining header/websocket issue occurs downstream of Paperclip’s adapter.

## 2. Setup

- Workspace tested:
  - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
- Workspace path characteristics:
  - spaces
  - decomposed Unicode `ä`
  - normal Desktop-like repo path
- Command path:
  - `/Applications/Codex.app/Contents/Resources/codex`
- Execution style:
  - authenticated cloud-hosted `codex_local`
  - normal user `HOME`
  - controlled read-only prompt

## 3. Auth context summary

- Native Codex auth was present and readable in `~/.codex/auth.json`.
- Auth presence was confirmed structurally only; no secrets were printed.
- Auth preflight did not trigger.
- Runtime context captured at execution time reported:
  - `executionRuntime: local`
  - `modelHosting: cloud`
  - `provider: openai`
  - `model: unknown`
  - `biller: chatgpt`
  - `billingType: subscription`

## 4. Workspace path class tested

- Real repo path with:
  - spaces
  - decomposed Unicode

## 5. Controlled prompt used

- `Please inspect the repository root and report: 1. current working directory 2. whether package files exist 3. whether runtime context is visible Do not modify files.`

## 6. Observed result

- The run succeeded overall with `exitCode: 0`.
- Auth preflight was not involved.
- Codex started normally and emitted `thread.started` and `turn.started`.
- During websocket setup/streaming, Codex repeatedly logged:
  - `failed to convert header to a str for header name 'x-codex-turn-metadata'`
- The failing metadata value included the workspace path, with the decomposed `ä` rendered as escaped bytes.
- Codex retried multiple times, then fell back to HTTP.
- After HTTP fallback, the run completed successfully and answered the controlled prompt.
- Paperclip then discarded the returned session because thread persistence was not recorded correctly.

## 7. Failure classification

- `C. Codex CLI/core downstream failure`

## 8. Evidence

- Evidence that this is not an auth failure:
  - no `missing_auth_preflight`
  - real authenticated run started
  - `thread.started` and `turn.started` were emitted
- Evidence that the failure is downstream of Paperclip adapter startup:
  - Paperclip successfully launched Codex and passed runtime context
  - the first hard error came from:
    - `codex_api::endpoint::responses_websocket`
    - `codex_core::session_startup_prewarm`
    - `codex_core::session::turn`
- Evidence that the header issue is real in authenticated cloud mode:
  - repeated stderr lines referenced `x-codex-turn-metadata`
  - the workspace path appeared inside the failing metadata payload
  - reconnect retries and HTTP fallback followed the websocket failure
- Evidence that the remote/provider path still works after fallback:
  - Codex completed the prompt successfully
  - `turn.completed` was emitted with token usage

## 9. Files changed

- `user_lab/phase1/experiment_1c_auth_context_notes.md`
- `user_lab/phase1/experiment_1c_run_observations.md`
- `user_lab/phase1/experiment_1c_result.md`
- `user_lab/phase1/experiment-log.md`

## 10. Tests run

- `swift build`
- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`

## 11. Keep or revert

- Keep the findings.
- No runtime logic was changed in this experiment, so there is no runtime diff to revert.
- The current evidence strongly supports keeping Paperclip adapter behavior unchanged while treating this as a downstream Codex CLI/core issue unless a narrower adapter-side mitigation is explicitly chosen later.

## 12. Remaining unknowns

- Whether the downstream websocket/header issue is caused strictly by decomposed Unicode, by non-ASCII in general, or by Codex’s specific metadata-header serialization strategy.
- Whether the same issue would reproduce with a normalized NFC path that still contains `ä`.
- Whether the thread-persistence warning is causally related to the websocket/header failure or is a separate downstream Codex defect.
- Whether a minimal adapter-side mitigation should exist anyway, for example warning the user or steering cloud runs away from affected workspace-path classes.

## 13. Next recommended experiment

- Run Experiment 1d as a narrowed A/B reproduction against two authenticated cloud runs:
  - one ASCII-only workspace path
  - one non-ASCII workspace path
- Keep auth, prompt, command path, and runtime context as constant as possible to determine whether the websocket/header failure is path-class-specific or a broader Codex cloud issue.
