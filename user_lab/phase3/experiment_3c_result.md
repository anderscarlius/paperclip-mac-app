# Experiment 3c Result

## 1. Objective

- Expand the 3b baseline into a larger controlled reliability sample to judge whether path-related latency and reliability differences are stable enough to justify anything stronger than warning-first.

## 2. Sampling method

- Reused the 3b latency harness and added a `--mode reliability` path in the existing entrypoint.
- Kept the controlled prompt unchanged and used the real Paperclip `codex_local` adapter execution path.
- Refreshed the ASCII-only comparison workspace under `/private/tmp/paperclip_latency_baseline/PaperclipApp` with the same excludes as 3b.
- Ran the balanced `5 + 5` sequence `current, ascii, ascii, current, current, ascii, ascii, current, current, ascii` to reduce simple warm-start bias.

## 3. Run count

- `5` runs on `current_non_ascii`
- `5` runs on `ascii_comparison`
- This used the preferred default sample size and stayed within the experiment cap.

## 4. Aggregate findings

- Generated benchmark JSON: `user_lab/phase3/benchmarks/latency_reliability_20260502T200851Z.json`
- Generated markdown report: `user_lab/phase3/reports/latency_reliability_20260502T200851Z.md`
- Current path aggregate:
- `runs=5`, `successes=5`, `warnings=5`, `median=15799 ms`, `mean=16961.4 ms`, `p75=17266 ms`, `min=15054 ms`, `max=21468 ms`, `median TTF output=2 ms`
- ASCII path aggregate:
- `runs=5`, `successes=5`, `warnings=0`, `median=15738 ms`, `mean=15735.6 ms`, `p75=17915 ms`, `min=11941 ms`, `max=19836 ms`, `median TTF output=2 ms`
- Delta summary:
- `median_delta_ms=61`
- `mean_delta_ms=1225.8`
- Compared with 3b, the larger sample sharply reduced the apparent median latency gap.

## 5. Warning/error/fallback findings

- Workspace-path warnings were perfectly consistent on the current path: `5 / 5`
- Workspace-path warnings remained absent on the ASCII path: `0 / 5`
- Websocket/header metadata errors did not recur: `0` on both workspaces
- HTTP fallback did not recur: `0` on both workspaces
- All runs exposed `runtimeContext` and `modelInfo`
- The visible model signal remained:
- `executionRuntime=local`
- `modelHosting=cloud`
- `provider=openai`
- `model=unknown`
- `Requested/default model: gpt-5.4`
- `Resolved model: unknown`

## 6. Decision threshold outcome

- Outcome: `warning_only_outcome`
- This matched the conservative threshold:
- warnings were stable on the current path
- warnings were absent on the ASCII path
- websocket errors and HTTP fallbacks did not recur
- median latency delta stayed far under `5 seconds`
- Recommendation: `Keep warning-first only. No stronger mitigation justified.`

## 7. Files changed

- `user_lab/phase3/scripts/run_latency_baseline.sh`
- `user_lab/phase3/scripts/run_latency_baseline.py`
- `user_lab/phase3/experiment_3c_sampling_method.md`
- `user_lab/phase3/experiment_3c_result.md`
- `user_lab/phase3/experiment-log.md`
- Generated: `user_lab/phase3/benchmarks/latency_reliability_20260502T200851Z.json`
- Generated: `user_lab/phase3/reports/latency_reliability_20260502T200851Z.md`

## 8. Validation run

- Passed `bash user_lab/phase3/scripts/run_latency_baseline.sh --mode reliability`
- Passed `python3 -m json.tool user_lab/phase3/benchmarks/latency_reliability_20260502T200851Z.json`
- Passed `swift build`
- Passed `pnpm --filter @paperclipai/server typecheck`
- Passed `pnpm --filter @paperclipai/ui typecheck`

## 9. Keep or revert

- Keep.
- The change is read-only, adds useful measurement capability, and does not alter Paperclip runtime behavior.

## 10. Remaining unknowns

- Even `5 + 5` is still a small cloud sample and can be influenced by remote variance.
- Resolved model identity is still unknown because only requested/default model and runtime model signals are available.
- The earlier Phase 1 websocket/header issue may have been session-specific or intermittent, since it still did not reproduce here.
- This experiment compared only the current cloud path and an ASCII-only workspace; it did not test local-model behavior.

## 11. Recommended next experiment

- Recommend `4a` rather than `3d`.
- 3c did not produce evidence strong enough for a stronger mitigation proposal, so the next useful step is to move on to the next broader environment optimization question instead of escalating the path workaround track.
