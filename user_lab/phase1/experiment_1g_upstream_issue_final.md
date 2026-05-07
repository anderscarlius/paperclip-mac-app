# Experiment 1g Upstream Issue Final

## Title

Codex websocket metadata header fails with non-ASCII/decomposed Unicode workspace path, then falls back to HTTP

## Summary

We reproduced a path-class-specific Codex cloud execution issue on macOS.

In authenticated cloud-hosted runs, a workspace path containing non-ASCII and decomposed Unicode characters triggers repeated websocket startup failures referencing `x-codex-turn-metadata`. Codex then falls back to HTTP and the task still completes. An ASCII-only control path running under the same authenticated conditions does not reproduce the websocket/header failure.

## Environment

- macOS
- Paperclip Desktop local adapter context
- Codex cloud-hosted execution
- Native Codex auth present
- Provider observed in runtime context: `openai`
- No secrets included

## Expected Behavior

Codex websocket/prewarm startup should either:

- accept valid Unicode workspace metadata safely, or
- encode workspace metadata into an ASCII-safe header representation, or
- avoid placing Unicode-sensitive raw workspace data into headers

Path class alone should not force websocket retries or HTTP fallback.

## Actual Behavior

- Authenticated cloud-hosted run starts normally
- websocket startup hits repeated UTF-8/header conversion failures for `x-codex-turn-metadata`
- reconnect/retry behavior occurs
- Codex falls back to HTTP
- the task still completes successfully

## Minimal Reproduction

Prepare two equivalent lightweight local repos or directory trees with the same content:

- ASCII control path:
  - `/tmp/codex_ascii_repro/PaperclipApp`
- Unicode/decomposed path:
  - `/tmp/codex_unicode_repro/Datorer och nätverk/PaperclipApp`

Authenticate Codex normally, then run the same command in both directories:

```bash
codex exec --json --skip-git-repo-check -
```

Use the same read-only prompt in both:

```text
Please inspect the repository root and report:
1. current working directory
2. whether package files exist
3. whether runtime context is visible
Do not modify files.
```

Compare stderr/stdout behavior during websocket startup.

## Evidence Summary

- Experiment 1c:
  - real authenticated cloud-hosted reproduction on a non-ASCII/decomposed path
  - repeated websocket/header failures
  - HTTP fallback still succeeded
- Experiment 1d:
  - authenticated A/B comparison
  - non-ASCII/decomposed path reproduced the failure
  - ASCII-only control path did not
- Experiment 1f:
  - Paperclip added a warning-only mitigation
  - execution behavior remained unchanged

## What Has Been Ruled Out

- Missing auth
  - authenticated runs reproduce the issue
- Paperclip adapter directly placing workspace path into websocket/header payloads
  - adapter review showed Paperclip passes `cwd` and `PAPERCLIP_WORKSPACE_*` env, not the failing websocket header itself
- General cloud failure
  - ASCII-only control path succeeds under the same authenticated cloud conditions

## Sanitized Log Snippets

Non-ASCII/decomposed path:

```text
ERROR codex_api::endpoint::responses_websocket: failed to connect to websocket:
UTF-8 encoding error: failed to convert header to a str for header name
'x-codex-turn-metadata'
```

```text
value:
{"session_id":"...","thread_source":"user","turn_id":"...","workspaces":{"/tmp/codex_unicode_repro/Datorer och na\u0308tverk/PaperclipApp":{"has_changes":true}},"sandbox":"seatbelt"}
```

```text
WARN codex_core::session::turn: stream disconnected - retrying sampling request ...
WARN codex_core::client: falling back to HTTP
```

ASCII control path:

```text
thread.started
turn.started
turn.completed
```

No matching `x-codex-turn-metadata` UTF-8/header error observed.

## Notes on HTTP Fallback

- The bug does not always block task completion.
- Codex can still complete via HTTP fallback.
- The user-visible impact is slower startup plus noisy connection diagnostics.

## Privacy / Redaction Notes

- Paths are sanitized placeholders, not personal filesystem paths.
- No tokens, account identifiers, private prompts, or source code contents are included.
- The reproduction can be run with temporary directories and a minimal local repo.
