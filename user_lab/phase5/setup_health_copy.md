# Setup Health Copy

## Screen copy

### Title

```text
Setup Health
```

### Subtitle

```text
Check that Paperclip is ready to analyze your local workspace.
```

### Primary CTA

```text
Analyze this workspace
```

### Secondary CTA

```text
Open diagnostics
```

## Overall status copy

### Ready to start

```text
Ready to start
Paperclip is ready to analyze this workspace.
```

### Needs attention

```text
Needs attention
Fix the items below before starting your first analysis.
```

### Optional improvements available

```text
Optional improvements available
You can start now, or improve setup for a smoother experience.
```

## Cloud AI

### Ready

Status:

```text
Ready
```

Summary:

```text
Cloud AI is connected and ready.
```

Primary action:

```text
Manage connection
```

Secondary action:

```text
Check again
```

### Needs attention

Status:

```text
Needs attention
```

Summary:

```text
Cloud AI is not connected. Sign in or reconnect to run cloud Codex tasks.
```

Primary action:

```text
Connect Cloud AI
```

Secondary action:

```text
Open diagnostics
```

### Unknown

Status:

```text
Unknown
```

Summary:

```text
Cloud AI status is not known yet.
```

Primary action:

```text
Check again
```

## Local AI

### Available

Status:

```text
Optional
```

Summary:

```text
Local AI is available for small private drafts.
```

Primary action:

```text
View local model
```

Secondary action:

```text
Learn about local AI
```

### Optional

Status:

```text
Optional
```

Summary:

```text
Local AI is optional. You can set it up later.
```

Primary action:

```text
Learn about local AI
```

Secondary action:

```text
Set up later
```

### Unavailable

Status:

```text
Optional
```

Summary:

```text
Local AI is not currently available.
```

Primary action:

```text
Open Ollama
```

Secondary action:

```text
Learn about local AI
```

### Unknown

Status:

```text
Unknown
```

Summary:

```text
Local AI status is not known yet.
```

Primary action:

```text
Check again
```

## Workspace

### Ready

Status:

```text
Ready
```

Summary:

```text
Workspace looks ready.
```

Primary action:

```text
Analyze this workspace
```

Secondary action:

```text
Choose another workspace
```

### Warning

Status:

```text
Warning
```

Summary:

```text
This workspace path may slow some cloud runs, but tasks should still work.
```

Primary action:

```text
View path details
```

Secondary action:

```text
Analyze this workspace
```

### Needs attention

Status:

```text
Needs attention
```

Summary:

```text
Choose a workspace before starting.
```

Primary action:

```text
Choose workspace
```

Secondary action:

```text
Open diagnostics
```

### Unknown

Status:

```text
Unknown
```

Summary:

```text
Workspace status is not known yet.
```

Primary action:

```text
Choose workspace
```

## Developer Tools

### Ready

Status:

```text
Ready
```

Summary:

```text
Required developer tools are available.
```

Primary action:

```text
View tools
```

Secondary action:

```text
Check again
```

### Partial

Mapped status:

```text
Warning
```

Summary:

```text
Some developer tools are missing, but read-only analysis can still work.
```

Primary action:

```text
View missing tools
```

Secondary action:

```text
Analyze this workspace
```

### Needs attention

Status:

```text
Needs attention
```

Summary:

```text
Paperclip cannot find required tools in the app environment.
```

Primary action:

```text
Fix tool path
```

Secondary action:

```text
Open diagnostics
```

### Unknown

Status:

```text
Unknown
```

Summary:

```text
Developer tool status is not known yet.
```

Primary action:

```text
Check again
```

## Runtime

### Ready

Status:

```text
Ready
```

Summary:

```text
Runtime diagnostics look healthy.
```

Primary action:

```text
Open diagnostics
```

Secondary action:

```text
Check again
```

### Degraded

Mapped status:

```text
Warning
```

Summary:

```text
Paperclip can run, but some diagnostics need attention.
```

Primary action:

```text
View diagnostics
```

Secondary action:

```text
Analyze this workspace
```

### Needs attention

Status:

```text
Needs attention
```

Summary:

```text
Runtime is not ready yet.
```

Primary action:

```text
Troubleshoot runtime
```

Secondary action:

```text
Open diagnostics
```

### Unknown

Status:

```text
Unknown
```

Summary:

```text
Runtime status is not known yet.
```

Primary action:

```text
Check again
```

## Supporting microcopy

### Advanced details toggle

```text
Advanced details
```

### Loading

```text
Checking setup…
Paperclip is gathering the latest readiness signals.
```

### Screen-level error

```text
Setup Health could not load completely.
You can retry, open diagnostics, or continue to the app.
```

### Retry action

```text
Try again
```

## Copy principles

- keep the collapsed card summary plain and calm
- avoid internal field names in primary copy
- never imply Local AI is required
- never imply warning-only states block the first safe task
- preserve `Analyze this workspace` as the main forward action once minimum readiness is met
