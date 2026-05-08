# Paperclip Private Alpha Runbook

## Purpose

Help an early tester complete the first Paperclip flow, understand the safety model, and give useful feedback.

## Current capabilities

- Setup Health
- workspace readiness checks
- path health warnings
- limited top-level metadata collection
- metadata-only first summary
- approved README excerpt read
- approved manifest field read
- transparent summary of what was inspected and what was not inspected

## How to run the first demo

1. Open Paperclip.
2. Show Setup Health and the private alpha note.
3. Confirm the selected workspace.
4. Click `Analyze this workspace`.
5. Explain the read-only confirmation step.
6. Click `Prepare request`.
7. Click `Collect limited metadata`.
8. Walk through the first summary.
9. Optionally click `Read small README excerpt`.
10. Optionally click `Read selected manifest fields`.
11. Confirm the `First successful run` checklist state.
12. Review the improved summary and the feedback questions.

## What to test

- clarity of Setup Health
- trust in the read-only promise
- usefulness of the first summary
- trust in the README approval step
- trust in the manifest approval step
- clarity of the first successful run checklist
- understanding of what remains unwired

## What not to test yet

- AI analysis
- code editing
- command execution
- dependency health
- security review
- deep repo scanning
- public installer polish

## Known limitations

- summary quality is conservative and rule-based
- no telemetry or remote feedback submission
- no subdirectory scanning
- no lockfile parsing
- no broader documentation reading beyond the approved README step

## Safety promises

- no commands are run in this flow
- no AI is used in this flow
- no recursive scan is performed
- only approved top-level file reads are allowed
- Paperclip states what it inspected and what it did not inspect

## How to report feedback

Use the in-app feedback questions as a guide, then copy answers into the alpha tester feedback template.

The tester handoff and troubleshooting notes can be sent together with this runbook.
