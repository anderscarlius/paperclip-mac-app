# Analyze Workspace Confirmation Copy

## Ready State

### Title

```text
Analyze this workspace
```

### Body

```text
Paperclip will perform a read-only first analysis of this workspace. It will not change files and will not run commands without your approval.
```

### Bullets

```text
Summarize what this project appears to be
Detect common languages and project files
Show setup warnings if available
Suggest safe next steps
```

### Buttons

```text
Continue
Cancel
```

## Workspace Warning State

Additional note:

```text
This workspace path has a warning. Analysis can continue, but some cloud runs may be slower.
```

## Missing Cloud AI

If Cloud AI is required and missing:

```text
Cloud AI is not connected. Connect Cloud AI before running the first analysis, or continue later when a local analysis mode is available.
```

Do not offer local fallback for the first analysis yet.

## Developer Tools Partial

```text
Some developer tools are missing, but the first read-only analysis can still start.
```

## Safety Footer

```text
Read-only first run · No file changes · No commands without approval
```
