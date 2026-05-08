# Phase 5M Demo Flow Design

## First-user flow

1. User opens Setup Health.
2. User sees readiness cards for Cloud AI, Local AI, Workspace, Developer Tools, and Runtime.
3. User clicks `Analyze this workspace`.
4. User confirms the read-only setup step.
5. User prepares a validated request.
6. User collects limited metadata.
7. User sees a first metadata-only summary.
8. User optionally approves one small top-level README excerpt read.
9. User sees an improved summary.
10. User sees safe next actions and current product limits.

## User promise

Paperclip will show you what it inspected, what it did not inspect, and whether any file contents were read.

## Alpha limitation

This private alpha does not yet run AI analysis or edit code.

## Why this flow matters

Phase 5F through Phase 5L created the safety model and the first conservative result. Phase 5M packages those pieces into a flow that early users can follow without guessing what just happened.

## UX goals

- Make the flow feel sequential instead of fragmented.
- Keep every state honest about what has and has not happened.
- Show progress without making the UI feel heavy.
- End with a clear explanation of what is available now and what is coming later.

## Scope kept intentionally small

- No manifest excerpt reading yet.
- No AI summary yet.
- No command execution.
- No code changes.
- No deeper repo inspection.
