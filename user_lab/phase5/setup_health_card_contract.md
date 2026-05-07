# Setup Health Card Contract

## Purpose

Define a reusable card model for the Setup Health screen so the MVP can be built with consistent structure and language.

## Proposed contract

```ts
type SetupHealthCard = {
  id:
    | "cloud_ai"
    | "local_ai"
    | "workspace"
    | "developer_tools"
    | "runtime";
  title: string;
  status: "ready" | "needs_attention" | "optional" | "warning" | "unknown";
  severity: "success" | "info" | "warning" | "error";
  summary: string;
  primaryAction?: {
    label: string;
    actionId: string;
  };
  secondaryAction?: {
    label: string;
    actionId: string;
  };
  advancedDetails: Array<{
    label: string;
    value: string;
    helpText?: string;
  }>;
};
```

## Status rules

### `ready`

Meaning:

- card requirement is satisfied for the first safe task

User-facing pill text:

- `Ready`

### `needs_attention`

Meaning:

- user action is required before the first safe task should be started

User-facing pill text:

- `Needs attention`

### `optional`

Meaning:

- this capability is useful but not required for the first safe task

User-facing pill text:

- `Optional`

### `warning`

Meaning:

- first safe task can still proceed, but there is a quality, speed, or reliability caveat

User-facing pill text:

- `Warning`

### `unknown`

Meaning:

- the app cannot currently determine the state

User-facing pill text:

- `Unknown`

## Severity rules

### `success`

Use when:

- card is healthy and actionable without caveat

### `info`

Use when:

- card is optional or currently informational

### `warning`

Use when:

- card allows progress but deserves caution

### `error`

Use when:

- card blocks or strongly degrades the first safe task

## Copy rules

- title must be plain and stable
- summary must be readable by a new technical user
- summary must not expose field names such as `runtimeContext`, `modelInfo`, or `billingType`
- advanced details may expose internal/runtime terms

## Action rules

- `primaryAction` should move the user toward readiness
- `secondaryAction` should either explain more or offer a lower-priority recovery path
- action labels must be verbs the user can understand immediately

Examples:

- `Connect Cloud AI`
- `Choose workspace`
- `View tools`
- `Open diagnostics`

## Advanced details rules

- advanced details are always available, but collapsed by default
- each detail row should be scannable
- avoid long paragraphs inside detail rows
- use `helpText` only when the label/value pair is otherwise unclear

## Blocking rules

No card should block the whole app unless it truly blocks the first safe task.

Blocking candidates:

- Workspace when no workspace is selected
- Runtime when server/runtime is unavailable
- Cloud AI when the chosen first-safe-task path requires it

Non-blocking by default:

- Local AI
- workspace warning-only path issues
- partial developer tools for read-only analysis

## Recommended derived helpers

```ts
type SetupHealthOverallState =
  | "ready_to_start"
  | "needs_attention"
  | "optional_improvements";

function cardStatusLabel(status: SetupHealthCard["status"]): string;
function cardSeverityTone(severity: SetupHealthCard["severity"]): string;
function isCardBlocking(card: SetupHealthCard): boolean;
function deriveOverallState(cards: SetupHealthCard[]): SetupHealthOverallState;
function canStartFirstSafeTask(cards: SetupHealthCard[]): boolean;
```

## Recommended action IDs

Suggested action IDs for the MVP:

- `connect_cloud_ai`
- `manage_cloud_ai`
- `check_cloud_ai_again`
- `view_local_model`
- `learn_local_ai`
- `open_ollama`
- `choose_workspace`
- `view_path_details`
- `analyze_workspace`
- `view_tools`
- `view_missing_tools`
- `fix_tool_path`
- `open_diagnostics`
- `view_diagnostics`
- `troubleshoot_runtime`

## Non-goals

- no attempt to encode every future state now
- no strong coupling to one visual design system
- no backend payload assumption beyond the fields above
