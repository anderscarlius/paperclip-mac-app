# Phase 5D Mapping Contract

## Objective

Define the input contract and pure mapping rules that convert safe diagnostics into the Setup Health view model.

## Input Contract

`vendor/paperclip/ui/src/lib/setup-health.ts` now defines:

```ts
export type SetupHealthDiagnostics = {
  cloudAi?: {
    authStatus?: "connected" | "missing" | "unknown";
    provider?: string | null;
    modelHosting?: "local" | "cloud" | "unknown" | null;
    billingType?: string | null;
    model?: string | null;
    modelInfo?: {
      requestedModel?: string | null;
      resolvedModel?: string | null;
      reportedModel?: string | null;
      modelSource?: string | null;
      confidence?: string | null;
      unknownReason?: string | null;
    } | null;
  };

  localAi?: {
    status?: "available_candidate" | "available" | "optional" | "unavailable" | "unknown";
    runtime?: "ollama" | string | null;
    model?: string | null;
    confidence?: "medium" | "low" | "unknown" | null;
    routingEnabled?: boolean;
  };

  workspace?: {
    selected?: boolean;
    path?: string | null;
    pathRisk?: "none" | "low" | "medium" | "unknown";
    containsNonAscii?: boolean;
    containsDecomposedUnicode?: boolean;
    containsSpaces?: boolean;
    warningCode?: string | null;
  };

  developerTools?: {
    gitAvailable?: boolean | null;
    nodeAvailable?: boolean | null;
    pnpmAvailable?: boolean | null;
    swiftAvailable?: boolean | null;
    pathIssueDetected?: boolean | null;
  };

  runtime?: {
    lastRunStatus?: "success" | "failed" | "unknown" | null;
    warnings?: Array<{ code?: string; message?: string; severity?: string }>;
    diagnosticsAvailable?: boolean;
  };
};
```

## Pure Mapper

`vendor/paperclip/ui/src/lib/setup-health.ts` now exports:

```ts
export function buildSetupHealthViewModel(
  diagnostics?: SetupHealthDiagnostics,
): SetupHealthViewModel
```

This function is pure and has no fetches, no hooks, and no runtime side effects.

## Mapping Rules Implemented

### No diagnostics

- returns a safe fallback state
- Cloud AI becomes `Unknown`
- Workspace becomes `Needs attention`
- Runtime becomes `Unknown`
- primary CTA is disabled because the page cannot truthfully say a workspace is ready

### Cloud AI

- `authStatus === "connected"` -> `Ready`
- `authStatus === "missing"` -> `Needs attention`
- otherwise -> `Unknown`

Advanced details may expose:

- provider
- model hosting
- billing type
- requested model
- resolved model
- reported model
- model source
- confidence
- unknown reason

### Local AI

- `available` or `available_candidate` -> card status still `Optional`
- `unavailable`, `optional`, or `unknown` -> still non-blocking optional state

This keeps Local AI clearly non-required.

### Workspace

- `selected !== true` -> `Needs attention`
- `pathRisk === "medium"` -> `Warning`
- `pathRisk === "none"` or `"low"` -> `Ready`
- selected with no usable path-risk signal -> `Unknown`

### Developer Tools

- `pathIssueDetected === true` -> `Needs attention`
- known missing tools -> `Partial`
- all known tools available -> `Ready`
- no live tool signal -> `Unknown`

### Runtime

- `lastRunStatus === "failed"` -> `Needs attention`
- warnings present -> `Degraded`
- success with no warnings -> `Ready`
- no live runtime signal -> `Unknown`

## Overall Status Rules

- any blocking `Needs attention` card -> `Needs attention`
- non-blocking warnings / degraded / partial / unknown on non-Local-AI cards -> `Optional improvements available`
- otherwise -> `Ready to start`

Important detail:

- Local AI being optional does not prevent overall `Ready to start`
- Developer Tools do not block read-only analysis unless a true PATH issue is surfaced

## 5D Integration Rule

The page layer is allowed to infer a `SetupHealthDiagnostics` object from:

- `/api/health`
- latest heartbeat run summary

But the mapper itself stays ignorant of fetch details.
