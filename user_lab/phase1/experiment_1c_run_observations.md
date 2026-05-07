# Experiment 1c Run Observations

## Controlled run

- Start time: `2026-04-30 16:40:54 CEST`
- End time: `2026-04-30 16:41:16 CEST`
- Duration: `21,947 ms`
- Workspace path:
  - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
- Controlled prompt:
  - `Please inspect the repository root and report: 1. current working directory 2. whether package files exist 3. whether runtime context is visible Do not modify files.`

## Top-level outcome

- Success/failure: `success`
- Exit code: `0`
- Top-level error message: `null`
- `missing_auth_preflight`: `no`

## Runtime context captured

- `executionRuntime: local`
- `modelHosting: cloud`
- `provider: openai`
- `model: unknown`
- `biller: chatgpt`
- `billingType: subscription`

## Execution behavior

- First Paperclip log: `3 ms`
- First stdout event: `3 ms`
- Codex emitted `thread.started`
- Codex emitted `turn.started`
- Codex later emitted `turn.completed`

## Header/websocket behavior

- Websocket/header failure occurred: `yes`
- `x-codex-turn-metadata` appeared: `yes`
- Relevant sanitized stderr evidence:
  - `failed to connect to websocket: UTF-8 encoding error: failed to convert header to a str for header name 'x-codex-turn-metadata'`
  - the failing metadata value included the workspace key:
    - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
  - the `ä` portion appeared in escaped byte form as `na\\xcc\\x88tverk`
- Retry behavior:
  - repeated reconnect attempts were logged
  - retries reached at least `5/5`
- Fallback behavior:
  - `codex_core::client: falling back to HTTP`

## Downstream result after fallback

- After websocket failure and HTTP fallback, Codex still completed the prompt successfully.
- The agent reported:
  - current working directory
  - package-file presence
  - visible runtime context
- No files were modified.

## Additional relevant logs

- Repeated plugin-loader warnings appeared for missing installed plugin cache paths under the managed Paperclip Codex home.
- Final Paperclip session handling warning:
  - `Codex completed the run, but its session thread was not persisted correctly. Paperclip will discard this session and avoid reusing it on the next run.`
