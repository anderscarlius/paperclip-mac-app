# Experiment 4f.1 Validation Diagnostics

## 1. Manual Command Results

### `swift build`

- Start condition: run manually outside the timeout wrapper from the repo root
- Output appeared immediately:
- `[0/1] Planning build`
- `Building for debugging...`
- Completion: yes
- Duration: about `0.17s`
- Exit code: `0`
- First relevant outcome: build completed successfully
- Match vs 4f wrapper result: no
- Interpretation: the earlier wrapper failure was not reproduced in the direct manual run

### `pnpm --filter @paperclipai/server typecheck`

- Start condition: run manually outside the timeout wrapper from the repo root
- Output appeared immediately:
- `zsh:1: command not found: pnpm`
- Completion: yes
- Duration: immediate
- Exit code: `127`
- First relevant error: `pnpm` not found
- Match vs 4f wrapper result: no
- Interpretation: the earlier `timed_out` result was misleading; in the current non-interactive shell context the command does not start because `pnpm` is missing from PATH

### `pnpm --filter @paperclipai/ui typecheck`

- Start condition: run manually outside the timeout wrapper from the repo root
- Output appeared immediately:
- `zsh:1: command not found: pnpm`
- Completion: yes
- Duration: immediate
- Exit code: `127`
- First relevant error: `pnpm` not found
- Match vs 4f wrapper result: no
- Interpretation: same as server typecheck; this is a shell/PATH validation issue, not a local fallback failure

## 2. Wrapper Command Results

### 4f wrapper result at `180s`

- Artifact: `user_lab/phase4/validation/validation_run_20260503T121455Z.json`
- `swift build`: `failed`
- `pnpm --filter @paperclipai/server typecheck`: `timed_out`
- `pnpm --filter @paperclipai/ui typecheck`: `timed_out`
- Diagnosis: useful first hygiene step, but insufficiently specific for the `pnpm` failures

### 4f.1 wrapper result at `300s`

- Artifact: `user_lab/phase4/validation/validation_run_20260503T123629Z.json`
- Command set: `standard`
- `swift build`: `failed`
- `pnpm --filter @paperclipai/server typecheck`: `failed`
- `pnpm --filter @paperclipai/ui typecheck`: `failed`
- New captured detail:
- command set
- cwd
- runner shell
- base command availability
- base command path
- first relevant error
- recommendation per command

## 3. Root-Cause Classification

### `swift build`

- Classification: wrapper or process-environment issue
- Evidence:
- direct manual run passed
- wrapper run under `/bin/bash -lc` failed with cache/module write errors under `~/.cache/clang/ModuleCache`
- Conclusion:
- not a proven code regression in the local fallback work
- not a blocker for 4g readiness by itself

### `pnpm --filter @paperclipai/server typecheck`

- Classification: validation environment / PATH issue
- Evidence:
- manual run failed immediately with `command not found`
- improved wrapper detected `baseCommandAvailable: false`
- Conclusion:
- not a real typecheck result
- not a local fallback regression

### `pnpm --filter @paperclipai/ui typecheck`

- Classification: validation environment / PATH issue
- Evidence:
- manual run failed immediately with `command not found`
- improved wrapper detected `baseCommandAvailable: false`
- Conclusion:
- not a real typecheck result
- not a local fallback regression

## 4. Wrapper Changes

- Added `--commands minimal|standard|full`
- Added command start/end markers
- Added cwd and runner shell reporting
- Added base-command availability/path checks
- Added first relevant error capture
- Added per-command recommendation text
- Preserved separate `timed_out` vs `failed` classification

## 5. Recommended Validation Set For Future Experiments

### Minimal

Use for local fallback experiments where the goal is readiness rather than broad repo validation:

- `swift build`
- `bash user_lab/phase4/scripts/local_fallback_prototype.sh --demo`
- `bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo`

### Standard

Use only when the shell environment is known to expose `pnpm` in PATH for non-interactive runs:

- `swift build`
- `pnpm --filter @paperclipai/server typecheck`
- `pnpm --filter @paperclipai/ui typecheck`

### Recommendation

- For Phase 4 local fallback experiments, treat `minimal` as the safest default validation set.
- Treat `standard` as an environment-dependent repo validation set, not as a required gate for local fallback readiness.
