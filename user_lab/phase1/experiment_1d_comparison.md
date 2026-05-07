# Experiment 1d Comparison

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

## Classification

- `A. Strong path-class evidence`

## Why

- The non-ASCII real repo path reproduced the websocket/header failure repeatedly.
- The ASCII-only realpath-stable comparison workspace did not reproduce that failure.
- Auth, provider path, prompt, command path, and runtime context were held effectively constant.
