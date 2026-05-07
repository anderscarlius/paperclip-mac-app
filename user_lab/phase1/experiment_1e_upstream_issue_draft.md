# Experiment 1e Upstream Issue Draft

## 1. Title

- Codex cloud websocket startup fails with `x-codex-turn-metadata` UTF-8 header conversion when workspace path contains decomposed non-ASCII characters

## 2. Environment

- macOS
- Codex Desktop/CLI runtime path:
  - `/Applications/Codex.app/Contents/Resources/codex`
- authenticated cloud-hosted Codex run
- workspace path classes tested:
  - non-ASCII decomposed Unicode path
  - ASCII-only comparison path

## 3. Minimal reproduction steps

1. Prepare two equivalent workspaces containing the same lightweight repo content.
2. Place one workspace under a non-ASCII path with decomposed Unicode, for example:
   - `/tmp/repro-nätverk/PaperclipApp`
3. Place the other under a real ASCII-only path, for example:
   - `/private/tmp/repro_ascii/PaperclipApp`
4. Authenticate Codex normally.
5. Run the same cloud-hosted `codex exec --json --skip-git-repo-check -` command in each workspace with the same prompt.
6. Compare stderr/stdout behavior during session startup.

## 4. Expected behavior

- Both workspaces should start the websocket/streaming path successfully without invalid-header UTF-8 conversion errors.
- Path class alone should not force retries or HTTP fallback.

## 5. Actual behavior

- Non-ASCII workspace:
  - repeated websocket startup failures referencing `x-codex-turn-metadata`
  - reconnect loop
  - fallback to HTTP
  - final task completion still possible
- ASCII workspace:
  - no matching websocket/header failure observed
  - no HTTP fallback observed
  - normal successful completion

## 6. Evidence summary

- Strong A/B control:
  - same authenticated user context
  - same command path
  - same prompt
  - same cloud-hosted mode
- Differential outcome:
  - only the non-ASCII path reproduces the websocket/header failure
- The failing metadata payload includes the non-ASCII workspace key and shows the decomposed character bytes in escaped form.

## 7. Sanitized logs

Non-ASCII path:

```text
ERROR codex_api::endpoint::responses_websocket: failed to connect to websocket:
UTF-8 encoding error: failed to convert header to a str for header name
'x-codex-turn-metadata'

value:
{"session_id":"...","thread_source":"user","turn_id":"...","workspaces":{"/tmp/repro-na\u0308tverk/PaperclipApp":{"has_changes":true}},"sandbox":"seatbelt"}
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

No matching `x-codex-turn-metadata` UTF-8/header error observed.

## 8. Notes on HTTP fallback

- The failure does not necessarily prevent task completion.
- Codex eventually falls back to HTTP and can still complete the prompt.
- The user-visible impact is increased latency and noisy connection warnings.

## 9. What has already been ruled out

- Missing auth
  - authenticated runs reproduce the issue
- Paperclip adapter directly inserting workspace path into HTTP/websocket headers
  - adapter inspection showed path passed as `cwd` and env, not adapter-built transport headers
- General cloud failure
  - ASCII-only authenticated comparison path succeeds without the websocket/header issue

## 10. Privacy/redaction notes

- Paths above are sanitized examples.
- No tokens, API keys, account ids, or private repo content are included.
- The issue can be reproduced with temporary directories and a minimal local repo.
