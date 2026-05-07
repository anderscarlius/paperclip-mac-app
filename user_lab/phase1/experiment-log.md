# Phase 1 Experiment Log

## Baseline

Date:
- 2026-04-29

Status:
- Runtime-context injection completed for `codex_local`.

Notes:
- Add the first user-environment baseline observations here.
- Keep entries short and timestamped.

Time:
- 23:23 UTC

Change:
- Executed one real `codex_local` baseline run against the local Paperclip Desktop repo and captured prompt, runtime context, logs, timing, and result behavior.

Expected effect:
- Establish a trusted baseline for runtime-context visibility and real user friction before any optimization work.

Observed result:
- Runtime context was visible and internally consistent across prompt, env, and result. The run failed after ~14.8s due to repeated websocket metadata/auth failures and final `401 Unauthorized`, with `model` still surfaced as `unknown`.

Next action:
- Prioritize Experiment 1 around fast auth preflight for cloud-hosted `codex_local` runs, then re-measure failure duration and clarity.

Time:
- 15:57 CEST

Change:
- Added a minimal cloud-auth preflight for cloud-hosted `codex_local` runs and expanded execute-test coverage for missing auth, local-hosted bypass, and auth-present cloud runs.

Expected effect:
- Controlled no-auth cloud runs should fail immediately and clearly instead of entering websocket / HTTP retry churn.

Observed result:
- The post-change controlled no-auth baseline failed in 4 ms instead of about 14.8 seconds, returned `missing_auth_preflight`, preserved runtime context in diagnostics, and made no Codex execution attempt.

Next action:
- Run Experiment 1b to isolate the non-ASCII workspace-path / header-encoding issue with auth held constant.

Time:
- 16:35 CEST

Change:
- Added focused path-flow notes and five `codex_local` reproduction tests covering ASCII, spaces, Swedish characters, decomposed Unicode, and percent-like workspace paths with auth held constant.

Expected effect:
- Prove or weaken the workspace-path/header hypothesis without mixing in auth behavior, and only justify a runtime fix if a path-content failure is reproduced.

Observed result:
- All five path variants reached the mocked execution point and preserved the original workspace string in `PAPERCLIP_WORKSPACE_*` env vars. The only observed difference was macOS canonicalizing child-process `cwd` from `/var/...` to `/private/var/...`, which is an OS realpath effect rather than a Unicode or header-safety failure in the adapter.

Next action:
- Move to Experiment 1c and test a real authenticated cloud-hosted Codex run to determine whether the remaining header failure is downstream in Codex CLI/core.

Time:
- 16:43 CEST

Change:
- Ran one real authenticated cloud-hosted `codex_local` execution against the live Paperclip Desktop repo path with spaces and decomposed Unicode, and documented auth context plus sanitized run observations.

Expected effect:
- Determine whether the remaining websocket/header issue still appears once auth preflight is satisfied and adapter-level path handling has already passed focused tests.

Observed result:
- The run authenticated successfully, skipped `missing_auth_preflight`, started Codex normally, then repeatedly hit `x-codex-turn-metadata` UTF-8 websocket-header errors inside Codex before falling back to HTTP and completing the prompt successfully. This strongly points to a downstream Codex CLI/core failure rather than a Paperclip adapter startup failure.

Next action:
- Run Experiment 1d as an authenticated A/B path-class comparison to determine whether the downstream failure is specific to non-ASCII workspace paths or broader to Codex cloud websocket metadata handling.

Time:
- 17:01 CEST

Change:
- Created an ASCII-only comparison workspace under `/private/tmp`, then ran authenticated cloud-hosted `codex_local` A/B executions against the real non-ASCII repo path and the ASCII-only copy with the same prompt, auth context, and command path.

Expected effect:
- Determine whether `x-codex-turn-metadata` websocket/header failures are truly path-class-specific rather than a general authenticated cloud Codex problem.

Observed result:
- The non-ASCII run reproduced repeated `x-codex-turn-metadata` UTF-8/header errors, reconnect loops, and HTTP fallback, while the ASCII-only run completed without that websocket/header failure and without HTTP fallback. Both runs succeeded overall, but the difference is strong evidence that the downstream failure is tied to the non-ASCII workspace path class.

Next action:
- Move to Experiment 1e and evaluate mitigation options or upstream-report packaging without changing runtime behavior yet.

Time:
- 17:08 CEST

Change:
- Produced a design-only mitigation analysis for the confirmed path-class-specific websocket/header failure, including option scoring, a conservative recommendation, and a sanitized upstream Codex issue draft.

Expected effect:
- Choose the safest next implementation step without prematurely changing runtime behavior or hiding the upstream bug.

Observed result:
- The strongest immediate mitigation is a path-class detector plus a low-friction user warning for cloud-hosted `codex_local`, paired with an upstream Codex issue report. Unicode normalization, shadow workspaces, and metadata sanitization were all judged too risky or too uncertain to implement first.

Next action:
- Run Experiment 1f to implement and test the path-class detector plus one-time warning, while preserving the current fallback behavior.

Time:
- 21:48 CEST

Change:
- Implemented a pure workspace path-class detector in `codex_local` plus a one-time informational warning for cloud-hosted runs on medium-risk path classes, and added focused tests for ASCII, spaces-only, non-ASCII, decomposed Unicode, percent-encoded, and local-hosted cases.

Expected effect:
- Make the known Codex websocket/header failure understandable to the user without changing execution semantics, while keeping ASCII and local runs free from noisy warnings.

Observed result:
- The warning is emitted only for affected cloud-hosted medium-risk paths and is carried in `resultJson.warnings` plus a short stdout line. ASCII paths and spaces-only cloud paths do not receive the medium-risk warning, local-hosted non-ASCII runs do not warn, and all targeted tests passed with execution behavior preserved.

Next action:
- Run Experiment 1g to prepare upstream submission readiness and decide whether any stronger local mitigation is still needed after the warning-first rollout.

Time:
- 21:51 CEST

Change:
- Produced a sanitized upstream-ready Codex issue package, a standalone repro plan, an evidence bundle, and a decision gate that evaluates whether Paperclip should go beyond the warning-first mitigation.

Expected effect:
- Make it easy to escalate the confirmed downstream bug upstream while preventing premature local workaround work that could introduce path or file-safety risk.

Observed result:
- The upstream package is ready to paste into an issue tracker, the repro plan no longer depends on private repo contents, and the decision gate recommends stopping at warning-first mitigation plus upstream reporting for now.

Next action:
- Move to Experiment 1h only if we want a submission-readiness pass or a user-impact review; otherwise Phase 1 can reasonably conclude with warning-first mitigation and the upstream issue package prepared.

Time:
- 22:08 CEST

Change:
- Completed a final Phase 1 closeout pass covering upstream submission readiness, user-impact review, a closeout summary, an ADR-style decision record, and an explicit Phase 2 recommendation.

Expected effect:
- Confirm that the non-ASCII path issue is understood, locally mitigated enough for now, cleanly packaged for upstream reporting, and ready to stop consuming Phase 1 engineering effort.

Observed result:
- The upstream package is paste-ready, the current warning-first mitigation is sufficient for now, Phase 1 can close, and the next recommended track is Phase 2 work on the model observability gap with warning surfacing as the secondary track.

Next action:
- Start Phase 2 with a detailed prompt for Track A — Model Observability Gap.

## Template

Time:
- HH:MM

Change:
- What changed in this experiment?

Expected effect:
- What should improve?

Observed result:
- What actually happened?

Next action:
- What should happen next?
