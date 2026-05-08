# Phase 5N Result

## Objective

Add one more explicit, approval-based summary improvement step by reading selected safe fields from an approved top-level manifest file.

## Manifest field contract

Phase 5N introduces:

- `AnalyzeWorkspaceManifestFieldRequest`
- `AnalyzeWorkspaceManifestFields`
- manifest filename allowlisting
- a `16 KB` read cap
- non-recursive, no-symlink, no-command safety invariants

## Allowed filenames

- `package.json`
- `pyproject.toml`
- `Cargo.toml`
- `go.mod`
- `Package.swift`

## Safe fields per manifest type

The reader extracts only allowlisted summary fields such as project name, version, description, dependency names, script names, target names, product names, platform names, and package-manager/framework hints where they are obvious.

## Server/service behavior

The server now exposes a narrow `POST /api/analyze-workspace/manifest-fields` route that:

- validates top-level filenames
- rejects symlinks
- keeps reads inside the selected workspace
- reads at most `16 KB`
- rejects binary-like content
- returns structured extracted fields instead of raw file content

## Parser behavior and limitations

- `package.json` uses JSON parsing
- `pyproject.toml`, `Cargo.toml`, `go.mod`, and `Package.swift` use conservative line-based or regex-based extraction
- `Package.swift` is never executed
- uncertainty is reflected through partial fields and lower confidence

## UI behavior

Setup Health now offers:

- `Read selected manifest fields`

The action is clearly optional and read-only. After a successful read, the UI shows:

- `Manifest fields read`
- filename
- bytes read
- selected field groups extracted

The summary card also updates its safety copy and approved read list.

## Result-builder changes

The result builder now accepts optional manifest fields in addition to metadata and README evidence. Manifest fields can improve:

- detected languages
- framework hints
- package-manager hints
- summary description
- `filesRead`
- `contentReads`

## Safety behavior

Phase 5N still does not:

- run commands
- use AI
- scan recursively
- read arbitrary files
- expose raw manifest content by default

## Tests run

`pnpm exec vitest run src/lib/setup-health.test.ts src/pages/SetupHealth.test.tsx src/__tests__/analyze-workspace-metadata.test.ts`

## Typecheck result

- `pnpm exec tsc --noEmit` passed in the UI package
- `pnpm exec tsc --noEmit` passed in the server package

## What remains unwired

- AI-assisted summary synthesis
- manifest excerpts beyond selected fields
- dependency health analysis
- code editing and execution workflows

## Recommended next experiment

Phase 5O should focus on packaging this first-user flow into something that can be launched and demonstrated more easily, rather than broadening technical capability too quickly.
