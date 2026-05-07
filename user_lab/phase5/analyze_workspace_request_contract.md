# Analyze Workspace Request Contract

## Goal

Define the first safe-task request behind:

`Analyze this workspace`

This contract is for product and implementation planning only in Phase 5F.

No request is executed yet.

## Contract

```ts
type AnalyzeWorkspaceRequest = {
  schemaVersion: 1;
  requestType: "analyze_workspace";
  workspace: {
    selected: true;
    path: string;
    displayName?: string | null;
    pathHealth?: {
      risk: "none" | "low" | "medium" | "unknown";
      containsSpaces?: boolean;
      containsNonAscii?: boolean;
      containsDecomposedUnicode?: boolean;
      containsPercentEncoding?: boolean;
      reasons: string[];
    };
  };
  safety: {
    readOnly: true;
    allowFileWrites: false;
    allowCommandExecution: false;
    allowNetworkAccess: false;
    requireUserApprovalForCommands: true;
  };
  runtimePreference: {
    preferredMode: "cloud" | "local" | "auto";
    allowLocalFallback: false;
    allowAutomaticRouting: false;
  };
  userIntent: {
    goal: "understand_workspace";
    firstRun: boolean;
  };
};
```

## Validation Rules

### Required

- `schemaVersion` must be `1`
- `requestType` must be `"analyze_workspace"`
- `workspace.selected` must be `true`
- `workspace.path` must be a non-empty string
- `safety.readOnly` must be `true`
- `safety.allowFileWrites` must be `false`
- `safety.allowCommandExecution` must be `false`
- `safety.allowNetworkAccess` must be `false`
- `safety.requireUserApprovalForCommands` must be `true`
- `runtimePreference.allowLocalFallback` must be `false`
- `runtimePreference.allowAutomaticRouting` must be `false`
- `userIntent.goal` must be `"understand_workspace"`

### Allowed Optional Fields

- `workspace.displayName`
- `workspace.pathHealth`

### Product Rules

- path warnings do not block request creation
- missing workspace blocks request creation
- first version must not embed file contents
- first version must not embed secret material
- request must be safe to show in diagnostics after path redaction if needed

## Notes

- `preferredMode` may still be present for future routing policy, but `allowAutomaticRouting` remains `false`
- `allowLocalFallback` remains `false` in the first product version
- this request describes intent and safety, not execution permission
