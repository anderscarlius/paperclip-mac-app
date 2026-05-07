# Experiment 1g Evidence Bundle

## Evidence Index

- `1a` — auth noise separated
  - missing cloud auth now fails fast with `missing_auth_preflight`
- `1b` — adapter path flow reviewed
  - Paperclip adapter does not directly build the failing websocket/header payload
- `1c` — authenticated Unicode-path reproduction
  - real cloud-hosted run reproduced repeated websocket/header failures and HTTP fallback
- `1d` — authenticated ASCII vs Unicode A/B
  - non-ASCII/decomposed path reproduced the issue
  - ASCII-only path did not
- `1f` — warning mitigation
  - warning-first observability added without changing execution behavior

## Key Signals

| Signal | ASCII Path | Unicode/Decomposed Path |
| --- | ---: | ---: |
| auth present | yes | yes |
| cloud-hosted | yes | yes |
| websocket metadata error | no | yes |
| HTTP fallback | no | yes |
| final task success | yes | yes |
| duration | `15,788 ms` | `27,529 ms` |

## Sanitized Log Snippets

Unicode/decomposed path:

```text
ERROR codex_api::endpoint::responses_websocket: failed to connect to websocket:
UTF-8 encoding error: failed to convert header to a str for header name
'x-codex-turn-metadata'
```

```text
WARN codex_core::session::turn: stream disconnected - retrying sampling request ...
WARN codex_core::client: falling back to HTTP
```

ASCII path:

```text
thread.started
turn.started
turn.completed
```

No matching `x-codex-turn-metadata` websocket/header error was observed on the ASCII control path.

## What We Have Ruled Out

- Missing auth
- Paperclip adapter directly constructing the failing websocket/header payload
- General authenticated cloud failure independent of path class

## What Still Remains Unknown

- whether the trigger is decomposed Unicode specifically versus broader non-ASCII handling
- whether spaces alone contribute
- whether Codex has an internal or future supported transport flag that would avoid the failing path

## Redactions Applied

- personal full paths replaced with sanitized placeholders
- no tokens or account identifiers
- no private prompts beyond the minimal read-only reproduction prompt
- no repository source code content
