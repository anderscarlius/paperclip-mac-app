# Experiment 3b Result

## 1. Objective

- Measure controlled Paperclip/Codex latency and diagnostic behavior on the current repo path versus an ASCII-only comparison workspace.

## 2. Method

- Implemented a read-only latency harness in `user_lab/phase3/scripts/run_latency_baseline.sh` and `user_lab/phase3/scripts/run_latency_baseline.py`.
- Used the real Paperclip `codex_local` adapter execution path with the fixed controlled prompt and no file modifications requested.
- Ran 2 + 2 measurements to satisfy the minimum comparison while limiting cloud usage.
- Alternated run order as `current_non_ascii`, `ascii_comparison`, `ascii_comparison`, `current_non_ascii` to reduce simple warm-start bias.

## 3. Workspace setup

- Current workspace: `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
- ASCII comparison workspace: `/private/tmp/paperclip_latency_baseline/PaperclipApp`
- The ASCII comparison workspace was refreshed from the real repo with excludes for `.git`, `node_modules`, `.build`, `dist`, `DerivedData`, `user_lab/phase3/benchmarks`, `user_lab/phase3/reports`, and `.codex`.
- The current workspace remained medium-risk because it contains spaces, non-ASCII, and decomposed Unicode.
- The ASCII comparison workspace was ASCII-only in both `pwd` and `realpath`, and it was sufficient for the controlled read-only prompt.

## 4. Metrics captured

- Duration, exit code, success/failure, time to first output, time to first useful output, warning codes, workspace-path warning presence, websocket metadata error incidence, HTTP fallback incidence, runtimeContext visibility, and per-run classification.
- `runtimeContext` was visible in all four runs and consistently reported `executionRuntime=local`, `modelHosting=cloud`, `provider=openai`, `model=unknown`, and `modelInfo` with `requestedModel=gpt-5.4` and unresolved actual model fields.

## 5. Results summary

- Generated benchmark JSON: `user_lab/phase3/benchmarks/latency_baseline_20260502T195731Z.json`
- Generated markdown report: `user_lab/phase3/reports/latency_baseline_20260502T195731Z.md`
- Current path runs: `23435 ms` and `14422 ms`, median `18928.5 ms`, both `success_with_warning`
- ASCII workspace runs: `13044 ms` and `20956 ms`, median `17000 ms`, both `clean_success`
- Current path warning incidence: `2 / 2`
- ASCII workspace warning incidence: `0 / 2`
- Websocket metadata errors: `0` on both workspaces
- HTTP fallback incidence: `0` on both workspaces
- Success rate: `2 / 2` on both workspaces
- Time to first useful output was lower on the ASCII runs in this sample, but the sample is too small to treat that as a stable performance claim.

## 6. Interpretation

- The current path still showed measurable overhead in this small sample, with a higher median duration than the ASCII comparison workspace.
- The ASCII comparison remained cleaner because it completed both runs without warnings, while the real workspace produced the expected path warning on both runs.
- The warning-first mitigation appears to be working as intended: the warning surfaced, but the task still completed successfully.
- Earlier Phase 1 websocket/header fallback behavior did not reproduce in this 2 + 2 baseline, so stronger mitigation is not justified from this experiment alone.
- The correct reading is cautious: path friction is still visible, but current behavior is functional and the sample size is intentionally small.

## 7. Files changed

- `user_lab/phase3/scripts/run_latency_baseline.sh`
- `user_lab/phase3/scripts/run_latency_baseline.py`
- `user_lab/phase3/experiment_3b_latency_method.md`
- `user_lab/phase3/experiment_3b_result.md`
- `user_lab/phase3/experiment-log.md`
- Generated: `user_lab/phase3/benchmarks/latency_baseline_20260502T195731Z.json`
- Generated: `user_lab/phase3/reports/latency_baseline_20260502T195731Z.md`

## 8. Validation run

- Passed `bash user_lab/phase3/scripts/run_latency_baseline.sh`
- Passed `python3 -m json.tool user_lab/phase3/benchmarks/latency_baseline_20260502T195731Z.json`
- Passed `swift build`
- Passed `pnpm --filter @paperclipai/server typecheck`
- Passed `pnpm --filter @paperclipai/ui typecheck`

## 9. Keep or revert

- Keep.
- The harness is read-only, generated useful baseline data, and did not change Paperclip runtime behavior.

## 10. Remaining unknowns

- The sample size is only 2 + 2, so variance is still meaningful.
- The earlier `x-codex-turn-metadata` / HTTP fallback failure mode may be intermittent or environment-specific, since it did not reproduce in this run set.
- The benchmark used the currently configured cloud execution path, so local-model path behavior remains unmeasured.
- Time to first useful output is derived from observable JSONL events and should be treated as best-effort instrumentation, not a product KPI.

## 11. Recommended next experiment

- Recommend Experiment 3c as a broader friction-profile follow-up focused on repeated-path reliability and whether the remaining current-path overhead is stable enough to justify a stronger mitigation proposal.
