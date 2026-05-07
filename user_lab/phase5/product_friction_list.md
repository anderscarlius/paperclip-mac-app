# Product Friction List

## Friction 1 — No obvious “analyze my local code folder” entry point

What the user experiences:
The app starts with company/agent/task concepts, not with selecting a local workspace and getting a safe result.

Why it matters:
This is the biggest mismatch with the stated product goal for technical Mac users.

Evidence:
`SetupWizardView`, `OnboardingWizard`, `NewProjectDialog`, `ProjectWorkspaceDetail`

Severity: high

Suggested fix:
Add a first-run workspace selection step and route the first task around that workspace, not around company bootstrap alone.

## Friction 2 — First successful run is verification, not usefulness

What the user experiences:
The setup test asks an agent to reply with a short confirmation that setup is working.

Why it matters:
It proves the pipeline, but it does not prove product value.

Evidence:
`DesktopAppModel.onboardingIssueDescription(...)`

Severity: high

Suggested fix:
Replace or follow the verification run with a safe read-only workspace analysis that produces a project summary and setup warnings.

## Friction 3 — Runtime readiness is fragmented

What the user experiences:
Setup state is split across the setup wizard, native sidebar, status bar, Diagnostics tab, Server tab, and run detail.

Why it matters:
A new user cannot quickly answer “Is Paperclip ready?”

Evidence:
`MainWindowView`, `StatusBarView`, `DiagnosticsSettingsView`, `ServerSettingsView`, `AgentDetail`

Severity: high

Suggested fix:
Create one setup health screen with clear Ready / Needs attention states and actions.

## Friction 4 — Cloud AI/Codex readiness is not summarized clearly

What the user experiences:
API key entry exists, authenticated web auth exists, and Phase 1 auth preflight exists, but there is no single product-facing cloud readiness card.

Why it matters:
Users need to know whether cloud runs will work before they hit a run failure.

Evidence:
`APIKeyStepView`, `APIKeysSettingsView`, `Auth.tsx`, `App.tsx`, `phase1_closeout_summary.md`

Severity: high

Suggested fix:
Add a Cloud AI card with explicit states such as Ready, Needs sign-in, and Unknown.

## Friction 5 — Required local runtime tool is partly hidden

What the user experiences:
Paperclip can require `codex`, `claude`, or `gemini` on PATH, but this is mostly exposed through compatibility messaging or setup failure.

Why it matters:
A new user may think Paperclip is ready because server/Ollama are ready, then fail on actual agent execution.

Evidence:
`RuntimeAgentAdapterService`, `DesktopAppModel.runSetupFlow(...)`, `ServerSettingsView`

Severity: high

Suggested fix:
Add a Developer Tools card that explicitly checks runtime tools and explains which one Paperclip will use.

## Friction 6 — Path risk is known internally but hidden on first run

What the user experiences:
The app knows path class matters for some cloud Codex flows, but no first-run path health message is surfaced before work begins.

Why it matters:
A user can hit a known risk without understanding that their local path contributed to it.

Evidence:
`phase1_closeout_summary.md`, `environment_baseline_20260502T194102Z.md`, `AgentDetail.tsx`

Severity: medium

Suggested fix:
Surface path health as part of workspace setup with OK / Warning / Needs attention wording.

## Friction 7 — Local AI is too prominent for first-run productization

What the user experiences:
Ollama and Gemma 4 are visible very early in the wizard and in the native shell.

Why it matters:
Phase 4 explicitly decided local fallback should remain optional and non-default. Heavy early emphasis adds setup anxiety.

Evidence:
`SetupWizardView`, `ModelSelectionStepView`, `ModelSettingsView`, `local_fallback_offer_design.md`

Severity: medium

Suggested fix:
Keep Local AI available, but move it behind an optional step or a clearly secondary card after Cloud AI readiness.

## Friction 8 — “Workspace” language is overloaded

What the user experiences:
Workspace can refer to:
- Documents workspace
- Application Support area
- project workspace
- execution workspace
- a local code folder

Why it matters:
Users can misunderstand what Paperclip will read, where it will run, and what files are safe to edit.

Evidence:
`HelpSettingsView`, `AdvancedSettingsView`, `ProjectWorkspaceDetail`, `IssueWorkspaceCard`

Severity: medium

Suggested fix:
Standardize terms:
- `Paperclip files`
- `Local code workspace`
- `Execution workspace`

## Friction 9 — The main dashboard assumes a mature company model

What the user experiences:
After setup, the user lands in a broad operational dashboard with many sections and nav items.

Why it matters:
This is strong for ongoing operator use, but weak as the first “aha” moment.

Evidence:
`Dashboard.tsx`, `Sidebar.tsx`, `Layout.tsx`

Severity: medium

Suggested fix:
After first success, land the user in a focused first-result view or a compact “next step” panel instead of the full dashboard by default.

## Friction 10 — Warning surfaces are too deep and too technical

What the user experiences:
Important warnings exist, but they are often visible only in run detail, diagnostics, logs, or compatibility tools.

Why it matters:
Private alpha users need calm explanations before failure, not only after failure.

Evidence:
`DiagnosticsSettingsView`, `ServerSettingsView`, `AgentDetail.tsx`, `phase2/experiment_2b_result.md`

Severity: medium

Suggested fix:
Promote the most important warnings into a first-run health screen with simple copy and expandable advanced details.
