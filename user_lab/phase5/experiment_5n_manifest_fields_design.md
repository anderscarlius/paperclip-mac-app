# Phase 5N Manifest Fields Design

## Why manifest fields are the next approved deeper read

README excerpts help explain what a project says it is. Manifest fields help explain what the project is configured to be. Together they improve the first summary without jumping to AI, commands, or deeper scanning.

## Why this step must be explicit

Manifest reading crosses the line from filename-only metadata into file-content inspection, so it must stay:

- explicit
- user-triggered
- top-level only
- strongly bounded
- transparent in the UI and result data

## Allowed filenames

- `package.json`
- `pyproject.toml`
- `Cargo.toml`
- `go.mod`
- `Package.swift`

## Byte limit

Manifest reads are capped at `16 KB` and clamped server-side.

## Safety boundaries

- No symlink following
- No recursive search
- No arbitrary path reads
- No shell commands
- No AI
- No raw manifest content shown by default

## Safe fields by manifest type

### `package.json`

- `name`
- `version`
- `description`
- `type`
- script names only
- dependency names only
- devDependency names only
- peerDependency names only
- engine keys only

### `pyproject.toml`

- `project.name`
- `project.version`
- `project.description`
- project dependency names if obvious
- `tool.poetry.name`
- `tool.poetry.version`
- `tool.poetry.description`
- Poetry dependency names if obvious
- `build-system.build-backend`

### `Cargo.toml`

- `package.name`
- `package.version`
- `package.description`
- dependency names only
- dev-dependency names only
- build-dependency names only
- small workspace-member notes if obvious

### `go.mod`

- `module`
- `go` version
- required module names only
- note if `replace` directives are present without exposing local paths

### `Package.swift`

- package name if obvious
- product names if obvious
- target names if obvious
- platform names if obvious
- dependency URLs summarized as host/repo only if obvious

## Redaction and omission behavior

The manifest reader omits unsafe raw content by default and records omissions such as:

- raw manifest content
- script command values
- dependency versions
- local replace paths
- executable Swift evaluation

## How manifest evidence improves the summary

Manifest evidence can improve:

- project name hints
- language detection
- framework hints
- package-manager hints
- important file understanding
- what Paperclip reports in `filesRead`

## Principle

Read only what is needed to improve the first summary. Do not expose raw manifest content by default.

## What remains for later

- manifest excerpts beyond selected safe fields
- dependency health reasoning
- AI-assisted synthesis
- deeper project structure analysis
