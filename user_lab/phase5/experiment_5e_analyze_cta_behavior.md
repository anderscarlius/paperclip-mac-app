# Phase 5E Analyze CTA Behavior

## Objective

Make `Analyze this workspace` behave like a product-ready next step without executing real analysis.

## Implemented 5E Behavior

### No workspace selected

- button label stays `Analyze this workspace`
- button is disabled
- helper copy says: `Choose a workspace before starting.`

### Workspace selected and ready

- button is enabled
- click opens a local confirmation/preview panel
- no analysis runs

Preview copy:

- `Ready to analyze this workspace. The first analysis will be read-only and will not modify files.`

### Workspace selected with warning

- button is enabled
- click opens the same local confirmation/preview panel
- no analysis runs

Preview copy:

- `Ready to analyze this workspace. This path has a warning, but read-only analysis can continue.`

### Confirmation / preview panel

The panel now shows:

- `Analyze this workspace`
- `Read-only first task`
- `No files will be changed`
- `No commands will run without approval`

Actions:

- `Continue to analysis setup`
- `Cancel`

In 5E both actions are local UI only.

## Non-goals

The CTA does not:

- start agents
- run shell commands
- perform analysis
- route to a final onboarding flow

## Product Effect

This is enough for a technical first-run user to understand:

- whether they are blocked on workspace selection
- what the first analysis is supposed to be
- that it is read-only
- that approval is still required for commands later
