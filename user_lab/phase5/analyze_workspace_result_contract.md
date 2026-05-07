# Analyze Workspace Result Contract

## Goal

Define the future result shape for the first safe task:

`Analyze this workspace`

## Contract

```ts
type AnalyzeWorkspaceResult = {
  schemaVersion: 1;
  resultType: "analyze_workspace_result";
  workspace: {
    displayName?: string | null;
    pathHealth?: {
      risk: string;
      reasons: string[];
    };
  };
  summary: {
    title: string;
    description: string;
    confidence: "high" | "medium" | "low";
  };
  detected: {
    languages: string[];
    frameworks: string[];
    packageManagers: string[];
    importantFiles: Array<{
      path: string;
      reason: string;
    }>;
  };
  setupWarnings: Array<{
    severity: "info" | "warning" | "needs_attention";
    title: string;
    message: string;
    action?: string;
  }>;
  suggestedNextActions: Array<{
    label: string;
    description: string;
    risk: "low" | "medium" | "high";
    requiresApproval: boolean;
  }>;
  inspected: {
    filesListed: string[];
    filesRead: string[];
    commandsRun: string[];
  };
  notInspected: string[];
  safety: {
    readOnly: true;
    filesChanged: false;
    commandsRun: false;
  };
};
```

## Required User-Facing Sections

- Project summary
- Detected languages/tools
- Important files
- Setup warnings
- Suggested next actions
- What I inspected
- What I did not inspect

## Result Rules

- if no files were read, say so
- if no commands were run, say so
- never claim tests ran unless they actually ran later with approval
- never claim dependencies are safe unless inspected
- never claim security status from first metadata-only analysis
- use `low` or `medium` confidence when evidence is limited
- show path warning if relevant, but do not overstate it

## Confidence Guidance

### High

Use only when the result is grounded in clear and sufficient inspected evidence.

### Medium

Use when the project shape is plausible but not fully verified.

### Low

Use when the result relies mainly on top-level metadata with little or no file reading.

## Truthfulness Examples

- if `commandsRun` is empty, the result must explicitly show that no commands were run
- if `filesRead` is empty, the result must explicitly show that only file presence or listing was inspected
