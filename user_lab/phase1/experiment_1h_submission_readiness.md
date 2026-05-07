# Experiment 1h Submission Readiness

## Upstream Issue Readiness Checklist

| Checklist Item | Status | Notes |
| --- | --- | --- |
| Title is specific | pass | The title clearly names Codex, websocket metadata/header failure, non-ASCII/decomposed Unicode path, and HTTP fallback. |
| Summary is factual | pass | The summary is short, concrete, and does not over-assign blame. |
| Environment is clear | pass | macOS, Paperclip Desktop adapter context, cloud-hosted Codex, and native auth presence are all stated. |
| Repro is minimal | pass | The report uses sanitized temp paths and a tiny read-only prompt. |
| ASCII vs Unicode comparison is clear | pass | The A/B structure is explicit and central to the repro. |
| Auth is separated from issue | pass | Prior auth noise from 1a is clearly ruled out. |
| Paperclip adapter responsibility is not overstated | pass | The report says Paperclip passes `cwd` and env, not that it constructs the failing header. |
| Logs are sanitized | pass | Only short snippets are included. |
| No secrets | pass | No tokens, ids, or auth material are present. |
| No full personal paths | pass | Sanitized placeholder paths are used. |
| Expected behavior is reasonable | pass | It asks for safe Unicode handling or ASCII-safe header encoding. |
| Actual behavior is concise | pass | The websocket failure, retry behavior, HTTP fallback, and successful completion are all described clearly. |
| HTTP fallback is mentioned | pass | Fallback is called out both in summary and notes. |
| Prior ruled-out causes are included | pass | Missing auth, adapter-built headers, and general cloud failure are all listed. |

## Outcome

- The upstream issue package is paste-ready.
- No documentation-only edits were needed to `experiment_1g_upstream_issue_final.md` after checklist review.
