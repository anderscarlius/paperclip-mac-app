# Phase 5J Result

## 1. Objective

Implement the first real top-level filename-only metadata collector for `Analyze this workspace` while preserving the strict non-executing safety boundary.

## 2. Collector helper summary

Added `collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries()` in `vendor/paperclip/ui/src/lib/setup-health.ts`.

This helper:

- uses only provided immediate top-level entries,
- builds an `AnalyzeWorkspaceMetadataSnapshot`,
- validates the snapshot,
- returns a structured collection result,
- adds warnings for truncation, redaction, medium path risk, filename-only collection, and no file-content reads.

## 3. Real filesystem boundary decision

Phase 5J implements a real local collector on the Paperclip server:

- route: `POST /api/analyze-workspace/collect-metadata`
- service: `vendor/paperclip/server/src/services/analyze-workspace-metadata.ts`

The collector is tightly scoped to:

- verifying the path exists,
- verifying the path is a directory,
- listing immediate top-level entries only,
- recording entry name and kind,
- stopping at `maxTopLevelEntries`.

It does not read file contents or traverse recursively.

## 4. Snapshot behavior

The real collector returns the existing `AnalyzeWorkspaceMetadataSnapshot` shape with:

- `collectionMode: "future_filesystem_read"`
- `recursiveScan: false`
- `fileContentsRead: false`
- `commandsRun: false`
- `networkAccessed: false`
- `agentStarted: false`
- `localFallbackUsed: false`
- `automaticRoutingUsed: false`

Mock/example collection in the UI still uses `collectionMode: "provided_fixture_only"`.

## 5. Redaction behavior

Sensitive-looking top-level names such as `.env`, `id_rsa`, and `credentials.json` are redacted.

The collector:

- replaces the raw name with `[redacted]`,
- marks the entry as redacted,
- records a reason,
- includes a warning that sensitive names were redacted.

## 6. UI behavior

Setup Health now supports:

```text
Analysis request prepared
→ Collect limited metadata
→ Limited read-only metadata collected
```

In live mode:

- the UI calls the local collector route.

In mock mode:

- the UI uses example-only fixture entries,
- the collected state is clearly labelled `Example only`.

The collected state explicitly says:

- no file contents were read,
- no commands were run,
- no recursive scan was performed,
- secrets were not read,
- no agent has been started.

## 7. Tests run

Ran UI tests:

```bash
pnpm exec vitest run src/lib/setup-health.test.ts src/pages/SetupHealth.test.tsx
```

Observed result:

- 2 test files passed
- 48 tests passed

Ran server collector tests:

```bash
pnpm exec vitest run src/__tests__/analyze-workspace-metadata.test.ts
```

Observed result:

- 1 test file passed
- 3 tests passed

Also ran narrow type checks:

```bash
pnpm exec tsc --noEmit
```

for both:

- `vendor/paperclip/server`
- `vendor/paperclip/ui`

## 8. Safety confirmation

Phase 5J does not:

- run an agent,
- call cloud AI,
- call local AI,
- enable local fallback,
- enable automatic routing,
- run shell commands as product behavior,
- read file contents,
- recurse into nested directories,
- inspect `.git` internals,
- inspect contents of `node_modules`,
- inspect contents of `dist`,
- claim analysis has run.

## 9. What remains unwired

- first-run manifest excerpt reads,
- README excerpt reads,
- backend-to-result generation,
- AI analysis execution,
- first-result rendering beyond raw limited metadata.

## 10. Recommended next experiment

Phase 5K should decide whether to allow one or two tiny, explicitly gated file-content excerpts such as `README.md` or a single manifest file, while preserving all current non-command, non-recursive, non-AI safety limits.
