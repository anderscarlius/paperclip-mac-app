# Experiment 1d A/B Observations

## Shared run conditions

- Same authenticated user `HOME`
- Same command path:
  - `/Applications/Codex.app/Contents/Resources/codex`
- Same controlled prompt
- Same cloud-hosted runtime mode
- Same Paperclip-managed `CODEX_HOME` pattern
- Same runtime-context injection and logging capture

## Run A — Non-ASCII path

- Workspace:
  - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
- Realpath:
  - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
- Start time:
  - `2026-04-30 16:57:31 CEST`
- End time:
  - `2026-04-30 16:57:58 CEST`
- Duration:
  - `27,529 ms`
- Exit code:
  - `0`
- Overall success:
  - yes
- Runtime context:
  - `executionRuntime: local`
  - `modelHosting: cloud`
  - `provider: openai`
  - `model: unknown`
  - `biller: chatgpt`
  - `billingType: subscription`
- Websocket/header error:
  - yes
- `x-codex-turn-metadata` error:
  - yes
- HTTP fallback:
  - yes
- Relevant sanitized evidence:
  - repeated `failed to convert header to a str for header name 'x-codex-turn-metadata'`
  - repeated reconnect attempts through `5/5`
  - `codex_core::client: falling back to HTTP`
  - failing metadata payload contained:
    - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
    - decomposed segment represented as `na\\xcc\\x88tverk`
- CWD shown to agent:
  - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`

## Run B — ASCII path

- Workspace:
  - `/private/tmp/paperclip_ascii_ab/PaperclipApp`
- Realpath:
  - `/private/tmp/paperclip_ascii_ab/PaperclipApp`
- Start time:
  - `2026-04-30 16:58:07 CEST`
- End time:
  - `2026-04-30 16:58:23 CEST`
- Duration:
  - `15,788 ms`
- Exit code:
  - `0`
- Overall success:
  - yes
- Runtime context:
  - `executionRuntime: local`
  - `modelHosting: cloud`
  - `provider: openai`
  - `model: unknown`
  - `biller: chatgpt`
  - `billingType: subscription`
- Websocket/header error:
  - no matching error observed
- `x-codex-turn-metadata` error:
  - no
- HTTP fallback:
  - no
- Relevant sanitized evidence:
  - normal `thread.started`
  - normal `turn.started`
  - normal `turn.completed`
  - no `UTF-8 encoding error`
  - no websocket reconnect loop
- CWD shown to agent:
  - `/private/tmp/paperclip_ascii_ab/PaperclipApp`

## Immediate interpretation

- The authenticated cloud run behaves materially differently between the two path classes.
- The ASCII path completed without the websocket/header failure that appears on the non-ASCII path.
