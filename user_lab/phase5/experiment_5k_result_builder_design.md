# Phase 5K Result Builder Design

## Why the first result should be rule-based before AI

Paperclip now has a safe metadata snapshot from Phase 5J, but it still does not have an approved AI execution path for first-run analysis.

The fastest safe product step is therefore a deterministic, metadata-only result builder.

This gives the user a real first value moment:

`Paperclip safely inspected limited workspace metadata and produced a useful first summary without changing files or running commands.`

## Input evidence used

Phase 5K uses only:

- `AnalyzeWorkspaceRequest`
- `AnalyzeWorkspaceMetadataSnapshot`

Evidence is limited to:

- workspace display name
- workspace path health
- top-level entry names
- top-level entry kinds
- manifest indicators inferred from filenames only
- redaction signals

## Inference rules

- infer languages only from strong filename indicators such as `package.json`, `Package.swift`, `pyproject.toml`, `Cargo.toml`, and `go.mod`
- infer TypeScript only if `tsconfig.json` is present
- infer frameworks only from strong config filenames such as `next.config.*` or `vite.config.*`
- infer package managers only from lockfile or package-manager filenames
- infer important files only from visible top-level entry names

If the metadata does not prove it, do not claim it.

## Confidence rules

- use `medium` only when at least one strong manifest or README-like indicator exists
- use `low` when the result is based only on weak or sparse top-level signals
- avoid `high` in Phase 5K

## Overclaim prevention

The result builder and validator must not claim:

- tests passed
- dependency health
- security posture
- production readiness
- runtime behavior

The result must also explicitly say:

- no file contents were read
- no commands were run
- no AI was used

## UI result sections

The first visible result should show:

- Project summary
- Detected languages/tools
- Important files
- Setup warnings
- Suggested next actions
- What I inspected
- What I did not inspect

## What remains for the AI phase

Later phases may add:

- approved README excerpts
- approved manifest excerpts
- Cloud AI summary from safe metadata
- deeper approved analysis

Phase 5K stops at a deterministic, metadata-only first summary.
