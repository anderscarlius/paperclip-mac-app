# Proposed First-Run Journey

## Goal

Target first-run success:

`New technical user gets first useful result within 5 minutes.`

## Design principles

- make readiness visible before the first run
- keep Local AI optional
- treat workspace selection as first-class
- make the first result useful, not just diagnostic
- keep advanced details available but collapsed

## Step 1 — Welcome

Copy:

```text
Welcome to Paperclip.
Paperclip helps you understand, inspect, and improve local code projects with AI.
```

Secondary copy:

```text
We'll check setup, connect the AI path you want to use, choose a workspace, and run one safe read-only task.
```

Primary actions:

- `Get started`
- `Open advanced setup` as a secondary link

## Step 2 — Check Setup

Show one setup health screen with five cards:

- Cloud AI
- Local AI
- Workspace
- Developer tools
- Runtime diagnostics

Rules:

- show plain states first
- show one-line explanation
- show one primary action
- hide advanced details behind disclosure

## Step 3 — Connect Cloud AI

If needed, show:

```text
Cloud AI is not connected.
Sign in or reconnect to use Codex cloud runs.
```

Also show:

- current provider if known
- requested/default model if known
- what Paperclip will try next

Primary actions:

- `Sign in`
- `Add API key`
- `Retry check`

## Step 4 — Optional Local AI

Local AI should be clearly secondary.

If Ollama exists:

```text
Local AI is available for small private drafts.
```

If not:

```text
Local AI is optional. You can set it up later.
```

Rules:

- do not block first-run success on Local AI
- do not make local fallback the default story
- keep “Set up later” explicit

## Step 5 — Choose Workspace

Ask for one local code workspace.

Show path health:

- `OK`
- `Warning`
- `Needs attention`

Also show:

- full selected path
- why the path health state was chosen
- whether Paperclip will only inspect or may later edit with approval

Primary actions:

- `Choose folder`
- `Use this folder`

If warning:

- allow continue
- explain the risk calmly

## Step 6 — First Safe Task

Offer one default task:

```text
Analyze this workspace
```

Expected output:

- project summary
- detected package/language
- important files
- setup warnings
- suggested next steps

Rules:

- read-only
- truthful
- no edits
- no hidden command execution
- no local fallback unless the user opts in later

## Step 7 — First Result Screen

After the task, show:

- short result summary
- files inspected
- warnings found
- suggested next actions

Primary actions:

- `Ask a follow-up question`
- `Inspect another folder`
- `Open advanced project setup`

## Journey summary

Recommended first-run path:

1. welcome
2. setup health
3. connect cloud AI if needed
4. optionally acknowledge Local AI
5. choose workspace
6. run `Analyze this workspace`
7. show useful result

## Why this is better than the current flow

- it answers “is Paperclip ready?” early
- it defers advanced runtime/tooling concepts until needed
- it uses the user's own code as the first value moment
- it keeps Local AI optional
- it fits the private-alpha target user better than company-first bootstrap alone
