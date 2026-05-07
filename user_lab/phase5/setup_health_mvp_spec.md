# Setup Health MVP Spec

## Purpose

`Setup Health` is the first understandable system-status screen for a new technical Mac user.

It should answer:

1. Is Paperclip ready?
2. What is connected?
3. What needs attention?
4. What is optional?
5. What should I do next?

## Screen title

```text
Setup Health
```

## Subtitle

```text
Check that Paperclip is ready to analyze your local workspace.
```

## Primary CTA

```text
Analyze this workspace
```

## Secondary CTA

```text
Open diagnostics
```

## Overall screen model

The screen has three levels:

1. overall status summary
2. five readiness cards
3. footer note for advanced terminology and recovery

## Overall status summary

Top summary states:

### Ready to start

Use when all of the following are true:

- Workspace is `ready` or `warning`
- Runtime is `ready`
- Cloud AI is `ready` or a valid first-safe-task path exists without it
- Developer Tools are not blocking read-only analysis

Recommended top copy:

```text
Ready to start
Paperclip is ready to analyze this workspace.
```

### Needs attention

Use when any required first-safe-task dependency is missing:

- no workspace selected
- runtime not ready
- cloud AI required but not connected
- app environment missing tools required for the chosen analysis path

Recommended top copy:

```text
Needs attention
Fix the items below before starting your first analysis.
```

### Optional improvements available

Use when the first safe task can work, but one or more non-blocking improvements exist:

- Local AI unavailable
- workspace path is warning-only
- some developer tools are missing but read-only analysis still works
- runtime is healthy but there are mild warnings

Recommended top copy:

```text
Optional improvements available
You can start now, or improve setup for a smoother experience.
```

## Card grid

The screen includes five cards:

1. Cloud AI
2. Local AI
3. Workspace
4. Developer Tools
5. Runtime

## Recommended layout

Desktop:

- top header block
- primary CTA row
- 2-column grid for first four cards
- Runtime card full width below

Reason:

- Runtime is the best place for a wider explanation and links to deeper diagnostics

Mobile/narrow layout:

- stack all cards vertically

## Card order

Recommended default order:

1. Cloud AI
2. Local AI
3. Workspace
4. Developer Tools
5. Runtime

Display rule:

- visually sort cards by severity inside the fixed layout only if implementation is simple
- otherwise keep the fixed order and rely on top summary plus card status colors

## Card behavior

Each card should show:

- title
- status pill
- short summary
- primary action
- optional secondary action
- `Advanced details` disclosure

Rules:

- the collapsed state must use plain product language
- advanced details may expose terms like `provider`, `modelInfo`, `Ollama`, `PATH`, or `runtime warnings`
- no card should block the whole app unless it blocks the first safe task

## Required card intent

### Cloud AI

Purpose:

- tell the user if the cloud run path is ready

### Local AI

Purpose:

- explain that local AI is optional and secondary

### Workspace

Purpose:

- confirm a local workspace is selected
- show path health in simple language

### Developer Tools

Purpose:

- show whether the app can find the tools it depends on for the chosen path

### Runtime

Purpose:

- summarize server/run health and surface the best “go deeper” path

## CTA behavior

### Primary CTA enabled

Enable `Analyze this workspace` only when:

- a workspace is selected
- runtime is `ready`
- the minimum required cloud/runtime path for the first safe task is available

### Primary CTA disabled

When disabled:

- keep the button visible
- show one-line reason nearby or in button helper text

Examples:

- `Choose a workspace first`
- `Connect Cloud AI first`
- `Start the runtime first`

### Secondary CTA

`Open diagnostics` should always be available unless the screen is still in initial loading.

## Empty/loading/error states

### Loading

Use when card signals are still being collected.

Top copy:

```text
Checking setup…
Paperclip is gathering the latest readiness signals.
```

### Partial data

Use when some cards are known and some are unknown.

Rule:

- render known cards normally
- render unknown cards as `Unknown`
- do not hide the screen behind a full-page spinner

### Health screen error

Use only for a true screen-level load failure.

Top copy:

```text
Setup Health could not load completely.
You can retry, open diagnostics, or continue to the app.
```

Actions:

- `Try again`
- `Open diagnostics`

## What the MVP should not do

- no account or auth redesign
- no automatic local fallback routing
- no tool installation workflow automation
- no full onboarding replacement
- no workspace edits
- no complicated preference system
- no requirement that Local AI be configured

## MVP success definition

The screen succeeds if a new technical Mac user can answer:

- `I am ready`
- `I need to connect cloud AI`
- `I need to choose a workspace`
- `Local AI is optional`
- `I can now click Analyze this workspace`

within a short glance, without opening logs or deep settings.
