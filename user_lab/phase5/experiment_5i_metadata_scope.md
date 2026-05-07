# Phase 5I Metadata Scope

## Goal

Define exactly what the first safe `Analyze this workspace` task may inspect before any real filesystem collection is wired.

Phase 5I stays in fixture-only mode.

No product runtime collection is enabled yet.

## Allowed metadata for the first safe analysis

Allowed:

- workspace display name
- workspace path health
- top-level entry names
- top-level entry kind: `file`, `directory`, or `unknown`
- limited top-level entry listing with a maximum entry cap
- presence of common manifest files by filename only
- presence of common lockfiles by filename only
- presence of README-like files by filename only
- presence of `.git` by filename only
- presence of common source directories by filename only
- presence of common test directories by filename only
- presence of common docs/config indicators by filename only

Allowed indicator filenames:

- `package.json`
- `pnpm-lock.yaml`
- `package-lock.json`
- `yarn.lock`
- `bun.lockb`
- `Package.swift`
- `pyproject.toml`
- `requirements.txt`
- `poetry.lock`
- `Cargo.toml`
- `Cargo.lock`
- `go.mod`
- `go.sum`
- `Gemfile`
- `Gemfile.lock`
- `composer.json`
- `composer.lock`
- `README`
- `README.md`
- `README.txt`
- `.git`
- `src`
- `Sources`
- `Tests`
- `test`
- `tests`
- `docs`
- `Dockerfile`
- `docker-compose.yml`

Future-safe but not implemented in 5I:

- small README excerpt
- small manifest excerpt

## Forbidden metadata in the first safe analysis

Forbidden:

- file writes
- shell commands
- test execution
- package installs
- network calls
- recursive full-repo indexing
- reading `.env`
- reading auth files
- reading token files
- reading credentials
- reading private keys
- reading `.ssh`
- reading large files
- reading `dist` or `build` artifacts
- reading `node_modules`
- reading `.git` internals
- reading binary files
- telemetry upload
- local fallback execution
- automatic model routing
- AI inference
- claims about test status
- claims about security posture

## Filename-only handling

The first metadata snapshot is filename-only.

It may record that a sensitive-looking top-level entry exists, but it must not expose the raw name or any contents.

Chosen redaction behavior:

- keep a placeholder top-level entry
- set `name` to `[redacted]`
- set `redacted: true`
- include a reason
- add a matching redaction record without the raw sensitive name

This keeps the snapshot transparent without leaking secrets or sensitive filenames.

## 5I stop point

Phase 5I introduces:

- a metadata snapshot contract
- pure fixture-only snapshot helpers
- validation and redaction rules

Phase 5I does not introduce:

- real filesystem collection
- backend execution
- AI execution
- real analysis results
