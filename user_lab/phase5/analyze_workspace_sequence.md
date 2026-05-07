# Analyze Workspace Sequence

## Intended Sequence

```text
User clicks Analyze this workspace
↓
Setup Health opens read-only confirmation
↓
User clicks Continue
↓
Frontend creates AnalyzeWorkspaceRequest
↓
Future backend validates safety contract
↓
Future backend gathers safe metadata
↓
Future agent produces AnalyzeWorkspaceResult
↓
UI shows first result
```

## Phase 5F Stop Point

```text
Phase 5F stops at contract and copy. No request is created in runtime and no agent is executed.
```

## Future Test Cases

1. No workspace -> request not created.
2. Workspace warning -> request allowed with warning.
3. File writes forbidden.
4. Command execution forbidden.
5. Network access forbidden.
6. Local fallback disabled for first analysis.
7. Automatic routing disabled.
8. Result includes inspected / not inspected.
9. Result must not claim tests ran.
10. Missing Cloud AI blocks cloud first analysis.
11. Developer tools partial does not block read-only analysis.
12. Path warning does not block read-only analysis.
