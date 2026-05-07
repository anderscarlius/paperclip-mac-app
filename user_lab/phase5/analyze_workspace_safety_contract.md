# Analyze Workspace Safety Contract

## Safety Promise

This first analysis is read-only. Paperclip will not change files and will not run commands without your approval.

## Allowed In The First Safe Task

Read-only metadata inspection only.

Allowed metadata:

- workspace path
- workspace display name
- top-level file and folder names
- presence of common manifest files
- presence of repository indicators such as:
  - `.git`
  - `package.json`
  - `Package.swift`
  - `pyproject.toml`
  - `Cargo.toml`
  - `go.mod`
  - `README.md` / `README`
  - `pnpm-lock.yaml`
  - `package-lock.json`
  - `yarn.lock`

Allowed future safe reads, but not required yet:

- small README excerpt
- small manifest excerpt
- small package metadata excerpt

## Forbidden In The First Safe Task

- file writes
- code edits
- shell commands
- tests
- package installs
- dependency updates
- network calls
- reading secrets
- reading `.env`
- reading SSH keys
- reading credentials
- reading private documents outside the workspace
- reading large files
- recursive full-repo indexing
- local fallback execution
- automatic model routing
- telemetry upload
- claiming tests ran
- claiming project health beyond inspected evidence

## Truthfulness Rules

- do not say commands were run if none were run
- do not say files were read if only filenames were listed
- do not claim package manager, framework, or architecture without evidence
- do not claim security posture from first-run metadata inspection
- do not claim production readiness

## Product Intent

This task is meant to create a fast first-value moment, not a deep repo audit.

The safe first version should help the user understand:

- what kind of project this seems to be
- what major toolchain signals are visible
- what obvious setup warnings exist
- what safe next actions Paperclip can suggest later
