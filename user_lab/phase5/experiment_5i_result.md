# Phase 5I Result

## 1. Objective

Define and implement the safe metadata snapshot contract for the future first `Analyze this workspace` analysis without enabling real collection or execution.

## 2. Metadata snapshot contract

Added `AnalyzeWorkspaceMetadataSnapshot` in `vendor/paperclip/ui/src/lib/setup-health.ts`.

The contract is fixture-only in Phase 5I and includes:

- workspace display name
- workspace path health
- top-level entry list
- manifest indicators by filename only
- strict collection limits
- redactions
- explicit `notCollected` notes
- safety invariants showing no execution occurred

## 3. Allowed metadata

Phase 5I allows only filename-level, top-level metadata based on explicitly provided entries.

Examples:

- README presence
- manifest presence
- lockfile presence
- source/test/docs directory indicators
- `.git` presence
- path health

No file contents are read in this phase.

## 4. Forbidden metadata

Phase 5I explicitly forbids:

- recursive scans
- file contents
- secrets
- `.env`
- credentials
- private keys
- shell commands
- network calls
- local fallback
- automatic routing
- AI inference

## 5. Redaction behavior

Sensitive-looking top-level entry names are not exposed raw.

Chosen behavior:

- include a placeholder top-level entry with `name: "[redacted]"`
- mark it as `redacted: true`
- include a reason
- record a matching redaction entry without exposing the raw filename

This keeps the snapshot transparent without leaking sensitive names.

## 6. Helpers added

Added pure helpers in `vendor/paperclip/ui/src/lib/setup-health.ts`:

- `isSensitiveWorkspaceEntryName()`
- `classifyManifestIndicator()`
- `buildAnalyzeWorkspaceMetadataSnapshotFromEntries()`
- `validateAnalyzeWorkspaceMetadataSnapshot()`

These helpers use only provided fixture entries.

They do not read the filesystem or run commands.

## 7. Validation behavior

Snapshot validation rejects:

- wrong schema version
- wrong snapshot type
- wrong collection mode for Phase 5I
- any recursive scan flag
- any file-contents-read flag
- any commands/network/agent/local-fallback/automatic-routing activity
- any unredacted sensitive-looking top-level entry names

Validation returns structured errors instead of throwing.

## 8. UI changes

Updated the prepared Setup Health state with a small non-executing preview:

- `Future safe metadata scope`
- `No file contents will be read in this phase.`
- `No commands will be run.`
- `No recursive scan will be performed.`
- `Secrets will not be read.`

The preview is clearly informational and labelled as example-only.

## 9. Tests run

Ran:

```bash
pnpm exec vitest run src/lib/setup-health.test.ts src/pages/SetupHealth.test.tsx
```

Observed result:

- 2 test files passed
- 43 tests passed

The new tests cover:

- sensitive-name detection
- manifest indicator classification
- fixture-only snapshot construction
- redaction behavior
- snapshot validation
- top-level entry limit enforcement
- existing Setup Health flow behavior

## 10. Runtime behavior confirmation

Phase 5I does not:

- read real workspace files
- run shell commands
- call backend analysis
- run an agent
- call cloud AI
- call local AI
- enable local fallback
- enable automatic routing

This phase remains pure-contract and fixture-only.

## 11. What remains unwired

- real safe filesystem collection
- backend submission
- metadata collection service boundary
- first-run analysis execution
- `AnalyzeWorkspaceResult` generation
- first-result rendering

## 12. Recommended next experiment

Phase 5J should introduce a tightly gated real collection boundary for top-level filename-only metadata, reusing the Phase 5I snapshot contract and preserving all current safety invariants.
