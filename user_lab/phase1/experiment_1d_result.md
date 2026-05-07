# Experiment 1d Result

## 1. Objective

- Determine whether the `x-codex-turn-metadata` websocket/header error is specifically associated with the non-ASCII workspace path class by comparing an authenticated cloud run on the real repo path against an authenticated cloud run on an ASCII-only comparison workspace.

## 2. Setup

- Non-ASCII workspace:
  - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
- ASCII comparison workspace:
  - `/private/tmp/paperclip_ascii_ab/PaperclipApp`
- Shared controls:
  - same authenticated user `HOME`
  - same command path
  - same read-only prompt
  - same cloud-hosted runtime mode
  - same runtime-context capture

## 3. ASCII workspace method

- Method used:
  - temporary ASCII-only copy created with `rsync`
- Not used:
  - symlink
- Reason:
  - a symlink would not guarantee that the effective execution path stayed ASCII after `realpath`
- Verification:
  - both `pwd` and `realpath` stayed at `/private/tmp/paperclip_ascii_ab/PaperclipApp`

## 4. Non-ASCII run result

- Exit code:
  - `0`
- Duration:
  - `27,529 ms`
- Behavior:
  - repeated `x-codex-turn-metadata` UTF-8/header conversion errors
  - repeated websocket reconnect attempts
  - fallback to HTTP
  - final successful answer

## 5. ASCII run result

- Exit code:
  - `0`
- Duration:
  - `15,788 ms`
- Behavior:
  - no matching websocket/header conversion error observed
  - no `x-codex-turn-metadata` error observed
  - no HTTP fallback observed
  - final successful answer

## 6. Comparison table

| Signal | Non-ASCII path | ASCII path | Interpretation |
| --- | ---: | ---: | --- |
| exit code | `0` | `0` | Both runs completed successfully overall. |
| duration | `27,529 ms` | `15,788 ms` | Non-ASCII run was substantially slower. |
| websocket header error | `yes` | `no` | Error behavior differs by path class. |
| x-codex-turn-metadata error | `yes` | `no` | Strong signal that the metadata/header issue is path-sensitive. |
| fallback to HTTP | `yes` | `no` | Non-ASCII run required fallback; ASCII run did not. |
| final success | `yes` | `yes` | Remote/provider path still works for both. |
| runtimeContext preserved | `yes` | `yes` | Paperclip runtime context stayed intact in both runs. |
| cwd shown to agent | real non-ASCII repo path | ASCII `/private/tmp/...` path | Agent saw the actual workspace path for each run. |

## 7. Classification

- `A. Strong path-class evidence`

## 8. Evidence

- Strong control evidence:
  - both runs used authenticated cloud-hosted `codex_local`
  - both runs used the same user `HOME`
  - both runs used the same command path and prompt
  - runtime context matched across runs apart from workspace path
- Strong differential evidence:
  - non-ASCII run reproduced repeated `x-codex-turn-metadata` UTF-8/header failures
  - ASCII run did not reproduce those errors
  - non-ASCII run required HTTP fallback
  - ASCII run completed without fallback
- Path-specific evidence from failing payload:
  - the failing metadata included the non-ASCII workspace string
  - the decomposed `ä` segment appeared as escaped bytes `na\\xcc\\x88tverk`

## 9. Files changed

- `user_lab/phase1/experiment_1d_workspace_setup.md`
- `user_lab/phase1/experiment_1d_ab_observations.md`
- `user_lab/phase1/experiment_1d_comparison.md`
- `user_lab/phase1/experiment_1d_result.md`
- `user_lab/phase1/experiment-log.md`

## 10. Tests run

- `swift build`
- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`

## 11. Keep or revert

- Keep.
- No Paperclip runtime logic was changed in this experiment.
- The value here is the isolated evidence, not a code diff.

## 12. Remaining unknowns

- Whether the downstream bug is caused by decomposed Unicode specifically, any non-ASCII character, or a broader header-serialization rule inside Codex.
- Whether spaces alone contribute, or whether the Unicode component is sufficient on its own.
- Whether an adapter-side mitigation should normalize or alias the path before Codex sees it, or whether the right next step is an upstream Codex bug report first.

## 13. Recommended next experiment

- Run Experiment 1e as mitigation design only, not implementation.
- Compare a few candidate mitigations against the evidence:
  - Unicode normalization before handoff
  - ASCII-safe workspace alias or shadow path
  - user-facing warning for cloud runs on affected path classes
  - upstream Codex issue package with sanitized reproduction data
