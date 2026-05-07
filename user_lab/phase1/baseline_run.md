# Baseline Execution

## Workflow

User asks Paperclip to analyze and diagnose a bug in a local repo.

## Baseline Conditions

- The run used the real `codex_local` adapter against the real Paperclip Desktop workspace.
- The run was executed from an isolated temporary `HOME` in order to capture a controlled baseline artifact.
- Because of that isolation, the run did not inherit any previously logged-in shared Codex auth state.
- This means the observed `401 Unauthorized` is valid evidence for the no-auth path, but not yet proof that the same auth failure happens in the normal Desktop environment.

## A. Exact Prompt Sent To Codex

```text
Paperclip runtime context for this run (authoritative):
- execution_runtime: local
- model_hosting: cloud
- provider: openai
- model: unknown
- biller: chatgpt
- billing_type: subscription
Use these values when reasoning about whether this run is local or cloud, and which provider/model is active.

Runtime web search is a shell command, not a Codex tool or skill. When current public web information is needed, run `paperclip-web-search "query" --max-results 5` from the shell. `websearch` is available as a compatibility alias. If a subject can mean multiple things, use the issue title, description, and recent comments to disambiguate it before searching. For ambiguous names, acronyms, or product names, try 2-3 refined queries before concluding there is no relevant coverage. If the first search returns generic or off-topic results, tighten the query with the domain, vendor, geography, language, or exact product phrase from the issue. Do not claim there is no news or no public information after one weak search. If evidence is still thin after refined searches, say that clearly and mention the specific framing you checked. Never call paperclip-web-search, websearch, skill_execute, exec_skill, execute_skill, or process_skill as tool calls.

You are helping with a local Paperclip Desktop repository. Analyze Sources/PaperclipDesktop/Services/RuntimeAgentAdapterService.swift and explain one likely runtime-context risk or UX weakness. Do not modify any files. Use concise bullets and mention whether the active runtime context appears local or cloud-aware.
```

## B. Runtime Context Captured

### Injected Prompt Context

- `execution_runtime`: `local`
- `model_hosting`: `cloud`
- `provider`: `openai`
- `model`: `unknown`
- `biller`: `chatgpt`
- `billing_type`: `subscription`

### Injected Environment Variables

- `PAPERCLIP_RUNTIME_EXECUTION=local`
- `PAPERCLIP_RUNTIME_MODEL_HOSTING=cloud`
- `PAPERCLIP_RUNTIME_PROVIDER=openai`
- `PAPERCLIP_RUNTIME_MODEL=unknown`
- `PAPERCLIP_RUNTIME_BILLER=chatgpt`
- `PAPERCLIP_RUNTIME_BILLING_TYPE=subscription`

### `resultJson.runtimeContext`

- `executionRuntime`: `local`
- `modelHosting`: `cloud`
- `provider`: `openai`
- `model`: `unknown`
- `biller`: `chatgpt`
- `billingType`: `subscription`

## C. Execution Behavior

- Start time: 2026-04-29 21:23:17 UTC
- End time: 2026-04-29 21:23:32 UTC
- Total duration: 14.8s
- Time to first log: 2ms
- Time to first Codex JSON event: 69ms
- Execution type: local `codex_local` adapter
- Provider attempted: `openai`
- Hosting mode: `cloud`
- Model surfaced to Paperclip: `unknown`
- Outcome: failed before any useful model output in the controlled no-auth baseline path

## D. Output Quality

- Result quality: wrong / unusable for the user workflow
- Hallucinations: none observed, because the run failed before substantive output
- Missing steps: no diagnosis of the file, no repo analysis, no answer to the user prompt
- Failure mode: the user would wait through reconnect churn and still receive no useful explanation unless they inspect logs

## E. Relevant Logs

### Early startup

- Managed `CODEX_HOME` was created immediately.
- Required Paperclip skills and web-search shim were injected immediately.

### Transport / auth failures

- Because the run used an isolated `HOME`, the auth failures below should be interpreted as a controlled missing-auth baseline, not yet a full reproduction of the normal Desktop environment.
- Websocket prewarm hit `401 Unauthorized` against `wss://api.openai.com/v1/responses`
- Repeated websocket retries failed with UTF-8 header conversion errors for `x-codex-turn-metadata`
- The workspace path embedded in that metadata included non-ASCII characters from `Datorer och nätverk`
- Codex eventually fell back to HTTP
- HTTP retries also failed with `401 Unauthorized: Missing bearer or basic authentication in header`

### Final state

- `turn.failed` was emitted
- Paperclip emitted the session-persistence mitigation warning:
  `Codex completed the run, but its session thread was not persisted correctly. Paperclip will discard this session and avoid reusing it on the next run.`
