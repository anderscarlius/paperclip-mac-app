# First Safe Task Spec

## Task name

`Analyze this workspace`

## Purpose

Give a new technical Mac user one truthful, useful result from their own local code without making changes.

## Product promise

This task should answer:

- what this project appears to be
- what languages/tools are present
- what important files exist
- what setup risks or warnings Paperclip can already see
- what the user should do next

## Constraints

- read-only
- no file edits
- no command execution unless explicitly approved
- no secrets exposure
- no telemetry upload
- no automatic local fallback
- no pretending tests/builds ran

## Input

Required:

- selected local workspace path

Optional:

- user question such as:
  - `What is this repo?`
  - `How do I start here?`
  - `What should I inspect first?`

## Allowed inspection scope

Default allowed:

- directory tree reads
- file metadata
- selected important text files such as:
  - `README`
  - package manifests
  - build configs
  - entry points
  - docs

Not allowed by default:

- shell commands that execute project code
- tests
- builds
- package installs
- file edits

## Expected output sections

```text
Project summary
Detected languages/tools
Important files
Setup warnings
Suggested next actions
What I did not inspect
```

## Truthfulness requirements

The agent must:

- say what files were inspected
- say what was not inspected
- distinguish observed facts from inference
- avoid claiming tests ran unless they actually ran
- avoid fabricating model/runtime info
- surface uncertainty clearly

## Example result shape

### Project summary

- one short paragraph

### Detected languages/tools

- concise list based on observed files

### Important files

- 3 to 8 files with one-line reason each

### Setup warnings

- include path-risk warning if applicable
- include missing runtime/auth warning if visible
- include “none found in inspected scope” when true

### Suggested next actions

- 2 to 4 follow-ups
- examples:
  - `Open README and app entrypoint`
  - `Check package scripts`
  - `Inspect the build settings`

### What I did not inspect

- clearly state excluded areas such as:
  - hidden directories
  - large generated folders
  - tests
  - runtime execution

## Why this should be the first task

- it is safe
- it is fast
- it uses the user's own code
- it demonstrates honesty
- it naturally leads into deeper tasks later

## Non-goals

This first safe task should not:

- modify the workspace
- generate a broad product plan for the repo
- require Ollama
- require the user to understand Paperclip companies/projects first
