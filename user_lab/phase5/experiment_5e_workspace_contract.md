# Phase 5E Workspace Contract

## Objective

Define the minimum workspace contract Setup Health needs in order to:

- know whether a workspace is selected
- classify path health
- decide whether `Analyze this workspace` should be enabled

## Added Types

`vendor/paperclip/ui/src/lib/setup-health.ts` now defines:

```ts
export type WorkspacePathHealth = {
  risk: "none" | "low" | "medium" | "unknown";
  containsSpaces?: boolean;
  containsNonAscii?: boolean;
  containsDecomposedUnicode?: boolean;
  containsPercentEncoding?: boolean;
  reasons: string[];
};

export type SetupHealthWorkspaceDiagnostics = {
  selected: boolean;
  path?: string | null;
  displayName?: string | null;
  pathHealth?: WorkspacePathHealth | null;
};
```

`SetupHealthDiagnostics.workspace` now uses `SetupHealthWorkspaceDiagnostics`.

## Mapping Rules

### `selected === false`

- Workspace card status: `Needs attention`
- summary: `Choose a workspace before starting.`
- Analyze CTA: disabled

### `selected === true` and `pathHealth.risk === "none" | "low"`

- Workspace card status: `Ready`
- summary: `Workspace looks ready.`
- Analyze CTA: enabled

Important product rule:

- spaces-only paths are low risk and still count as ready

### `selected === true` and `pathHealth.risk === "medium"`

- Workspace card status: `Warning`
- summary: `This workspace path may slow some cloud runs, but tasks should still work.`
- Analyze CTA: enabled

Important product rule:

- path warnings do not block the first read-only analysis

### `selected === true` and `pathHealth.risk === "unknown"`

- Workspace card status: `Unknown`
- summary: `Workspace is selected, but path health is not known yet.`
- Analyze CTA: enabled

This keeps Setup Health honest without forcing an unnecessary block once a workspace exists.

## Advanced Details

The Workspace card can now show:

- workspace display name
- selected path
- path health
- spaces / non-ASCII / decomposed Unicode / percent encoding flags
- human-readable reasons

For medium-risk paths, advanced details also carry a calm advisory about slower cloud Codex websocket behavior and fallback.

## Why This Contract Is Safe

- it does not require a backend change
- it does not require runtime behavior changes
- it can accept a future native or backend bridge without changing the UI contract again
