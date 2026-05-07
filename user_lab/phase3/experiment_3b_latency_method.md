# Experiment 3b Latency Method

## Goal

Measure the same read-only `codex_local` workflow on:

- the real current repo path
- an ASCII-only comparison workspace

## Controlled Prompt

```text
Please inspect the repository root and report:
1. current working directory
2. whether package files exist
3. whether runtime context is visible
Do not modify files.
```

## Execution Path

- Use the real Paperclip `codex_local` adapter through its `execute()` API.
- Keep the controlled prompt constant across runs.
- Point the adapter `cwd` at the target workspace being measured.
- Use `--skip-git-repo-check` because the ASCII comparison workspace excludes `.git`.

## Workspace Comparison

- Current workspace: the real repo path under `PaperclipApp`
- ASCII comparison workspace: `/private/tmp/paperclip_latency_baseline/PaperclipApp`

The ASCII workspace is refreshed from the real repo with excludes for heavy or irrelevant folders:

- `.git`
- `node_modules`
- `.build`
- `dist`
- `DerivedData`
- `user_lab/phase3/benchmarks`
- `user_lab/phase3/reports`
- `.codex`

## Run Count

- 2 runs on current workspace
- 2 runs on ASCII workspace

Reason:

- This meets the experiment minimum while limiting cloud usage.
- The order alternates current/ascii to reduce simple warm-cache bias.

## Metrics Captured

- total duration
- exit code
- success/failure
- time to first output
- time to first useful output when derivable from JSONL events
- warning codes
- workspace-path warning presence
- `x-codex-turn-metadata` incidence
- HTTP fallback incidence
- runtime context / modelInfo visibility
- cautious per-run classification

## Cautions

- Small sample size
- Real cloud conditions may vary slightly between runs
- The harness avoids full raw-log retention and stores only structured diagnostic signals
