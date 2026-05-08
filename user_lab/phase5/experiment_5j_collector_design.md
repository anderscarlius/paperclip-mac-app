# Phase 5J Collector Design

## 1. Why top-level filename-only collection is the first real collection step

Top-level filename-only collection is the smallest real workspace inspection step that still creates useful product value.

It helps Paperclip answer:

- what kind of project this appears to be,
- which major toolchains are visible,
- whether README and manifest signals exist,
- whether obvious setup structure is present.

It does this without opening files, traversing recursively, or running commands.

## 2. Chosen architecture

Chosen option: **Option C — Server-side local collector stub**

Rationale:

- the embedded web UI already talks to the local Paperclip server over `/api`,
- the server already has clear Express route and service patterns,
- the WebView does not currently expose a safe native JS filesystem bridge,
- a narrow local-only route can keep the collection boundary explicit and easy to test.

The UI keeps a separate clearly labelled example path for mock mode so it does not pretend mock metadata came from disk.

## 3. Exact allowed filesystem access

The real collector may only:

- inspect the selected workspace path,
- confirm the path exists,
- confirm the path is a directory,
- list immediate top-level children,
- record child name,
- record child kind as `file`, `directory`, or `unknown`,
- stop after `maxTopLevelEntries` entries,
- build a metadata snapshot from those names only.

## 4. Exact forbidden filesystem access

The real collector must not:

- open files,
- read file contents,
- traverse recursively,
- follow symlinks,
- inspect `.git` internals,
- inspect contents of `node_modules`,
- inspect contents of `dist`,
- inspect build artifacts,
- run shell commands,
- run agents,
- call cloud or local AI,
- enable local fallback,
- enable automatic routing.

## 5. Symlink handling

Symlinks are not followed.

If a top-level entry is a symlink or cannot be safely classified, it is returned as:

- `kind: "unknown"`

This preserves visibility without allowing traversal.

## 6. Sensitive filename handling

Sensitive-looking top-level names are redacted using the Phase 5I rules:

- the raw name is not exposed,
- a `[redacted]` placeholder entry is emitted,
- a redaction record is included,
- no file contents are read.

## 7. Max-entry limits

Default limit:

```text
50
```

Behavior:

- collect only the first `maxTopLevelEntries`,
- report truncation as a warning,
- never continue into nested paths.

## 8. UI state

The prepared Analyze flow now extends to a collected state:

```text
Analysis request prepared
→ Collect limited metadata
→ Limited read-only metadata collected
```

In diagnostics/live mode, the UI calls the local collector route.

In mock mode, the UI uses example-only fixture entries and labels them clearly as example data.

## 9. What remains for 5K

Phase 5K should build the next safe layer on top of this collector:

1. decide whether a tiny README/manfiest excerpt is allowed,
2. add explicit per-file safety gates,
3. keep top-level filename-only collection as the default first pass,
4. continue to avoid commands, recursive scans, and AI execution until the next boundary is proven.
