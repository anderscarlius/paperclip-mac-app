---
name: paperclip-web-search
description: >
  Search the public web through Paperclip's installed web-search plugin when
  current internet context is required. Use for live facts, product/docs checks,
  or any request that depends on information outside the repo or issue thread.
---

# Paperclip Web Search Command Bridge

Use this skill when you need live public-web information from inside a Paperclip agent run.

This skill assumes the instance has the first-party `paperclipai.web-search` plugin installed.

Important: this page is instruction text, not a callable tool. For `codex_local`, Paperclip exposes web search as the `paperclip-web-search` shell command during runs and does not link this directory as a Codex skill. Do not call `paperclip-web-search`, `websearch`, `skill_execute`, `process_skill`, `execute_skill`, `exec_skill`, or any similar name as a tool/function call.

The actual action is the `paperclip-web-search` shell command, which calls the Paperclip plugin endpoint for you.

## When to use it

- The issue asks for current facts, pricing, docs, releases, or outside-world context
- The answer cannot be trusted from the issue thread or local repo alone
- You need a simple web search, not full repo exploration

## How to call it

Preferred:

```bash
paperclip-web-search "YOUR SEARCH QUERY" --max-results 5
```

`websearch` is available as a compatibility alias, but prefer `paperclip-web-search` because it makes the runtime capability explicit.

## Search quality rules

- Use the issue title, description, and newest comments to interpret the search target before you search.
- If the subject is ambiguous, do not stop after one broad query.
- For product names, acronyms, organizations, or terms that can mean multiple things, try 2-3 refined searches before concluding there is no relevant coverage.
- If the first results are generic or off-topic, tighten the query with details already present in the issue:
  - vendor or company name
  - product category
  - country or region
  - local language wording
  - exact phrase from the issue
- If evidence is still weak after refined searches, say that clearly. Do not pretend the first weak search was definitive.

Example progression for an ambiguous term:

```bash
paperclip-web-search "Cosmic news in Sweden today" --max-results 5
paperclip-web-search "Cambio Cosmic Sweden news" --max-results 5
paperclip-web-search "Cosmic journalsystem Sweden nyheter" --max-results 5
```

Run the command through the shell. If a runtime says the command is unavailable, report that honest failure instead of inventing a skill/tool call.

Fallback, if the command is unavailable: call the plugin tool execution endpoint directly with `curl`:

```bash
curl -sS "$PAPERCLIP_API_URL/api/plugins/tools/execute" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"tool\": \"paperclipai.web-search:web-search\",
    \"parameters\": {
      \"query\": \"YOUR SEARCH QUERY\",
      \"maxResults\": 5
    },
    \"runContext\": {
      \"agentId\": \"$PAPERCLIP_AGENT_ID\",
      \"runId\": \"$PAPERCLIP_RUN_ID\",
      \"companyId\": \"$PAPERCLIP_COMPANY_ID\",
      \"projectId\": \"${PAPERCLIP_PROJECT_ID:-default}\"
    }
  }"
```

Notes:

- `projectId` is required by the plugin tool API. Use `$PAPERCLIP_PROJECT_ID` when it exists; otherwise use `"default"`.
- Keep `maxResults` small unless you really need more detail.
- Read and summarize the result; do not dump raw search output back to the user.

## Failure handling

- If you get `404 Tool "paperclipai.web-search:web-search" not found`, the plugin is not installed on this Paperclip instance yet.
- If you get `403`, your run context did not match the current agent/run token.
- If the tool returns an `error` field, treat the search as failed and say so briefly rather than pretending you searched.
