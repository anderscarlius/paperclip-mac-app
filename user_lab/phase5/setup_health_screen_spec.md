# Setup Health Screen Spec

## Purpose

Give the user one place to answer:

`Is Paperclip ready for my first useful task?`

## Layout

Use five status cards in one screen:

1. Cloud AI
2. Local AI
3. Workspace
4. Developer Tools
5. Runtime

Each card should include:

- title
- status
- one-line explanation
- primary action button
- advanced details disclosure

## Card 1 — Cloud AI

### States

- `Ready`
- `Needs sign-in`
- `Unknown`

### Signals

- auth preflight result
- provider
- billing type if available
- `runtimeContext.modelInfo` or latest equivalent model diagnostics

### One-line explanation examples

- `Cloud AI is connected and ready for cloud runs.`
- `Cloud AI is not connected yet.`
- `Cloud AI has not been checked yet.`

### Primary actions

- `Sign in`
- `Add API key`
- `Retry check`

### Advanced details

- provider name
- requested/default model
- resolved model if known
- last auth error
- last successful check time

## Card 2 — Local AI

### States

- `Available`
- `Optional`
- `Unavailable`
- `Unknown`

### Signals

- Ollama reachable
- model detected
- local fallback candidate status

### One-line explanation examples

- `Local AI is available for small private drafts.`
- `Local AI is optional and not required for first run.`
- `Ollama is not available right now.`

### Primary actions

- `Set up local AI`
- `Refresh`
- `Skip for now`

### Advanced details

- Ollama version
- selected local model
- installed/loaded models
- candidate confidence label
- explicit note that local routing is not the default path

## Card 3 — Workspace

### States

- `Ready`
- `Warning`
- `Needs attention`

### Signals

- selected workspace path
- path class
- non-ASCII/decomposed warning

### One-line explanation examples

- `This workspace path looks safe for a first run.`
- `This workspace path may cause issues in some cloud Codex flows.`
- `Choose a workspace before continuing.`

### Primary actions

- `Choose folder`
- `Use another folder`
- `Continue`

### Advanced details

- full path
- path flags:
  - spaces
  - non-ASCII
  - decomposed Unicode
  - percent encoding
- explanation of why the state was chosen

## Card 4 — Developer Tools

### States

- `Ready`
- `Partial`
- `Needs attention`

### Signals

- `git`
- shell PATH
- Swift only if needed
- Node/pnpm only if needed
- agent runtime tool presence:
  - `codex`
  - `claude`
  - `gemini`

### One-line explanation examples

- `Paperclip found a compatible agent runtime tool on this Mac.`
- `Some developer tools are available, but a compatible agent runtime is still missing.`
- `Paperclip could not find a supported local runtime tool yet.`

### Primary actions

- `Recheck tools`
- `Open help`

### Advanced details

- detected runtime tool
- PATH visibility result
- versions when available
- what is required for the chosen run mode

## Card 5 — Runtime

### States

- `Ready`
- `Degraded`
- `Needs attention`

### Signals

- last run success
- warnings
- `runtimeContext`
- heartbeat diagnostics
- server state

### One-line explanation examples

- `Paperclip runtime is up and recent runs succeeded.`
- `Paperclip can run, but recent diagnostics include warnings.`
- `Paperclip server is not ready yet.`

### Primary actions

- `Start server`
- `Restart`
- `Open diagnostics`

### Advanced details

- server URL/port
- installed runtime revision
- last run summary
- latest warning list
- latest heartbeat/run status

## Interaction rules

- show the worst current state first
- keep each card actionable
- collapse advanced details by default
- never require the user to search logs for the basic answer
- allow first-run success with:
  - Cloud AI ready
  - Workspace ready or warning
  - Developer tools ready or acceptable for the selected task
  - Runtime ready
  - Local AI optional

## Minimum implementation recommendation

If a brand-new screen is too large for the next step, build a compact equivalent first by reusing existing signals from:

- `DesktopAppModel`
- `DiagnosticsSettingsView`
- `StatusBarView`
- `RuntimeAgentAdapterService`
- Phase 1/2 warning surfaces
