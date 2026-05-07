# Experiment 3c Sampling Method

## Goal

- Expand the 3b latency baseline into a bounded reliability sample large enough to judge whether current-path overhead and warning behavior are stable.

## Controlled Prompt

```text
Please inspect the repository root and report:
1. current working directory
2. whether package files exist
3. whether runtime context is visible
Do not modify files.
```

## Execution Path

- Reuse the same real Paperclip `codex_local` adapter execution path from Experiment 3b.
- Keep the prompt wording unchanged.
- Continue using `--skip-git-repo-check` so the ASCII comparison workspace can run without `.git`.

## Workspace Comparison

- Current workspace: the real medium-risk repo path
- ASCII comparison workspace: `/private/tmp/paperclip_latency_baseline/PaperclipApp`

The ASCII workspace is refreshed from the real repo with the same excludes used in 3b:

- `.git`
- `node_modules`
- `.build`
- `dist`
- `DerivedData`
- `user_lab/phase3/benchmarks`
- `user_lab/phase3/reports`
- `.codex`

## Sample Size

- Chosen run count: `5 + 5`

Reason:

- This remains within the experiment cap.
- It gives a much better stability read than `2 + 2`.
- The expected duration is still modest enough for a low-risk measurement pass.

## Run Order

- `current_non_ascii`
- `ascii_comparison`
- `ascii_comparison`
- `current_non_ascii`
- `current_non_ascii`
- `ascii_comparison`
- `ascii_comparison`
- `current_non_ascii`
- `current_non_ascii`
- `ascii_comparison`

This balanced order avoids running all current-path samples first and reduces simple warm-start bias.

## Metrics Captured

- duration
- time to first output
- time to first useful output when derivable
- exit code
- success/failure
- warning codes
- workspace-path warning presence
- websocket metadata error count
- HTTP fallback presence
- runtimeContext visibility
- per-run classification

## Aggregate Statistics

- run count
- success count
- warning count
- websocket metadata error count
- HTTP fallback count
- min duration
- max duration
- median duration
- mean duration
- p75 duration
- median time to first output
- current-minus-ASCII median and mean deltas

## Decision Rule

- Use the conservative thresholds from the experiment prompt.
- Prefer warning-first unless the larger sample shows a clear reliability or latency problem.
