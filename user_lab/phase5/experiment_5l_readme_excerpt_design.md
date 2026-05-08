# Phase 5L README Excerpt Design

## Why README excerpt is the first approved deeper read

README is the safest first content read because it is usually intended as project-facing documentation and often gives a clearer project name or purpose than filename-only metadata.

Phase 5L keeps the scope intentionally narrow:

- one top-level README-like file only
- explicit user approval
- hard byte cap
- no recursion
- no AI

## Why it must be explicit and user-triggered

The user should always understand when Paperclip moves from filename-only inspection to file-content inspection.

That means the product must show a clear action:

`Read small README excerpt`

Paperclip must not read README content automatically during first-run setup.

## Allowed filenames

Only these top-level filenames are allowed:

- `README`
- `README.md`
- `README.txt`
- `readme`
- `readme.md`
- `readme.txt`

## Max byte limit

The excerpt read is capped at `4096` bytes.

This keeps the first deeper read:

- small
- fast
- predictable
- easy to explain

## No symlink following

README symlinks are rejected.

Paperclip must read only a regular top-level file and must not follow links to other locations.

## No recursive search

Phase 5L does not search subdirectories.

Examples that must not be read:

- `docs/README.md`
- `src/README.md`
- any nested README

## No arbitrary path read

The request uses:

- current workspace path
- one approved top-level README filename

It must reject:

- path separators
- `..`
- null bytes
- non-README names

## How excerpt evidence improves summary

README evidence may:

- improve the summary description
- suggest a project title from a first Markdown heading
- make the result more understandable to a first user

README evidence must not:

- become an AI summary
- imply project health
- imply test status
- imply security posture

## Result transparency after read

After the approved README read, the result should say:

- one approved README excerpt was read
- which filename was read
- how many bytes were read
- whether it was truncated

It should also update:

- `inspected.filesRead`
- content read metadata
- summary explanation

## What remains for later phases

Later phases may add:

- approved manifest excerpt reads
- richer deterministic summarization
- AI-assisted summarization from approved evidence

Phase 5L stops at one explicit, capped top-level README excerpt.
