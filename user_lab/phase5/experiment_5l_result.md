# Phase 5L Result

## 1. Objective

Add a tightly scoped, explicit, user-approved README excerpt read that improves the first workspace summary without using AI or running commands.

## 2. README excerpt contract

Phase 5L adds:

- `AnalyzeWorkspaceReadmeExcerptRequest`
- `AnalyzeWorkspaceReadmeExcerpt`

The request is:

- read-only
- top-level only
- non-recursive
- no symlink following
- no command execution
- no network access
- no AI

## 3. Allowed filenames

Allowed filenames are limited to:

- `README`
- `README.md`
- `README.txt`
- `readme`
- `readme.md`
- `readme.txt`

## 4. Server/service behavior

The server-side boundary:

- validates the filename
- rejects separators, `..`, and suspicious names
- verifies the workspace path is a directory
- verifies the target is a regular file
- rejects symlinks
- reads at most `4096` bytes
- returns a structured excerpt result

## 5. UI behavior

After metadata collection, Setup Health now offers:

`Read small README excerpt`

The UI explains:

- only the top-level README file will be read
- up to 4 KB will be read
- no commands will be run
- no AI will be used
- no other files will be opened

After a successful read, the UI shows:

- `README excerpt read`
- filename
- bytes read
- updated first summary

## 6. Result-builder changes

The metadata result builder can now accept an optional README excerpt.

If present, it:

- updates the summary description conservatively
- may use the first Markdown heading as a cautious title hint
- records the README filename in `inspected.filesRead`
- marks `safety.fileContentsRead` truthfully
- records one approved content read entry

## 7. Safety behavior

Phase 5L still does not:

- run an agent
- call cloud AI
- call local AI
- enable local fallback
- enable automatic routing
- run shell commands as product behavior
- recurse through the repository
- read arbitrary files

## 8. Tests run

Ran focused vitest coverage for:

- UI helpers
- Setup Health UI flow
- server metadata and README service behavior

## 9. Typecheck result

Ran `pnpm exec tsc --noEmit` for UI and server after the README additions.

## 10. What remains unwired

- manifest excerpt reads
- AI-assisted summary from approved evidence
- deeper project understanding
- follow-up actions after README-enhanced summary

## 11. Recommended next experiment

Phase 5M should add one equally narrow manifest excerpt step, likely selected fields from a detected top-level manifest file, while preserving the same approval and size limits.
