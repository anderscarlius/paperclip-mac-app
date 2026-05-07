# Current First-Run Journey

## Audit basis

This description is inferred from code and prior phase docs. It is not a recorded live walkthrough.

Primary evidence:

- `Sources/PaperclipDesktop/Views/RootView.swift`
- `Sources/PaperclipDesktop/Views/Setup/SetupWizardView.swift`
- `Sources/PaperclipDesktop/Stores/DesktopAppModel.swift`
- `Sources/PaperclipDesktop/Views/Main/MainWindowView.swift`
- `vendor/paperclip/ui/src/App.tsx`
- `vendor/paperclip/ui/src/components/Layout.tsx`
- `user_lab/phase1/phase1_closeout_summary.md`
- `user_lab/phase2/experiment_2b_result.md`

## 1. Launch app

Likely first-launch behavior:

- app opens `RootView`
- if `config.onboarding.hasCompletedSetup` is false, native setup wizard appears immediately
- main dashboard is blocked until setup is dismissed or completed

Evidence:

- `DesktopAppModel.shouldPresentSetupWizard`
- `RootView`

## 2. What screen appears first

Likely first screen:

- native `SetupWizardView`
- first step is `Welcome`

The copy promises:

- runtime checks
- Ollama/model setup
- first company creation

This is not a minimal “connect cloud, choose workspace, run read-only analysis” welcome.

## 3. What the user must already know

A new user likely must already understand at least some of the following:

- what Paperclip means by company
- what an agent is
- why Paperclip needs a local runtime server
- what Ollama is
- what Gemma 4 is
- what runtime tool will actually execute agents locally
- whether they want cloud-first or local AI

The wizard explains parts of this, but not at a simple product level.

## 4. How the user connects Codex/cloud

### Cloud/provider setup

- cloud-first setup is handled through API key entry
- keys are stored in Keychain
- this is visible in:
  - native setup model step
  - native API Keys settings tab

Evidence:

- `Sources/PaperclipDesktop/Views/Setup/ModelSelectionStepView.swift`
- `Sources/PaperclipDesktop/Views/Setup/APIKeyStepView.swift`
- `Sources/PaperclipDesktop/Views/Settings/APIKeysSettingsView.swift`

### Codex/runtime tool setup

- local agent runtime compatibility is checked later
- current code looks for `codex`, `claude`, or `gemini` on PATH
- this requirement is not presented as a dedicated first-run setup card
- it becomes visible through runtime compatibility messaging and setup failures

Evidence:

- `Sources/PaperclipDesktop/Services/RuntimeAgentAdapterService.swift`
- `DesktopAppModel.runSetupFlow(...)`

### Auth missing case

- Phase 1 added missing cloud auth preflight for cloud-hosted `codex_local`
- code/docs show this is handled at runtime, not with a simple product-facing setup health card

Evidence:

- `user_lab/phase1/phase1_closeout_summary.md`

Assessment:

- cloud/provider setup is partially visible
- Codex/cloud runtime readiness is not presented as one clear “ready / needs sign-in / needs tool install” state

## 5. How the user chooses workspace

There is no obvious first-run workspace chooser for a local code folder.

What exists today instead:

- desktop file location help for Paperclip-managed folders
- web project creation with optional `Repo URL` and `Local folder`
- web project workspace detail with absolute path/repo/runtime config fields
- issue-level execution workspace selection

Evidence:

- `Sources/PaperclipDesktop/Views/Settings/HelpSettingsView.swift`
- `vendor/paperclip/ui/src/components/NewProjectDialog.tsx`
- `vendor/paperclip/ui/src/pages/ProjectWorkspaceDetail.tsx`
- `vendor/paperclip/ui/src/components/IssueWorkspaceCard.tsx`

Assessment:

- workspace selection exists as an advanced project/workspace configuration feature
- it does not exist as a first-run product step

## 6. How the user runs the first task

Current first task in setup:

- native setup creates a real company
- waits for a runtime-capable agent
- creates a first verification issue
- invokes a run
- asks for a short confirmation reply under 120 words

The onboarding test prompt is:

- not a workspace analysis
- not obviously useful to the user
- mainly a runtime verification

Evidence:

- `DesktopAppModel.onboardingIssueDescription(...)`

After setup:

- user lands in main window with embedded web app
- likely default destination is the selected company dashboard
- further work happens through companies, agents, issues, and projects

## 7. What happens if auth is missing

Known current behavior from code/docs:

- missing cloud auth has preflight support from Phase 1
- friendly setup errors exist for runtime/API failures
- authenticated web deployments redirect to `/auth`

What is still unclear or fragmented:

- no single first-run health card says “Cloud AI is not connected”
- no simple desktop-first recovery step for Codex cloud auth is visible in the current setup wizard

Evidence:

- `user_lab/phase1/phase1_closeout_summary.md`
- `vendor/paperclip/ui/src/App.tsx`
- `vendor/paperclip/ui/src/pages/Auth.tsx`
- `DesktopAppModel.friendlySetupErrorMessage(...)`

## 8. What happens if local AI is unavailable

Current behavior:

- runtime step can refresh/install Ollama
- local AI setup can be prepared from wizard or settings
- cloud-first path can continue without local AI
- diagnostics/model settings expose more detail later

This is better than the cloud auth story, but still fairly technical.

Evidence:

- `Sources/PaperclipDesktop/Views/Setup/SetupWizardView.swift`
- `Sources/PaperclipDesktop/Views/Settings/ModelSettingsView.swift`
- `Sources/PaperclipDesktop/Views/Settings/DiagnosticsSettingsView.swift`

## 9. What happens if workspace path is risky

Current product-level behavior appears weak.

Known internal behavior:

- Phase 1 added path-class warning for affected cloud-hosted runs
- Phase 3 environment profiling shows this repo path is medium risk due to spaces/non-ASCII/decomposed Unicode

Visible UI behavior found in this audit:

- no dedicated first-run path health card
- no first-run warning when choosing a local folder
- warnings mainly appear later in run diagnostics

Evidence:

- `user_lab/phase1/phase1_closeout_summary.md`
- `user_lab/phase3/reports/environment_baseline_20260502T194102Z.md`
- `vendor/paperclip/ui/src/pages/AgentDetail.tsx`

## 10. What is confusing

Top current first-run confusions:

1. Product goal is unclear. The app feels like an operator console for Paperclip internals before it feels like a Mac app for inspecting local code.
2. “Workspace” is overloaded. It can mean Documents workspace, project workspace, execution workspace, or local code folder.
3. The setup story focuses on company/agent creation before the user sees a useful result from their own code.
4. Runtime readiness is fragmented across wizard, status bar, diagnostics, server settings, and run detail.
5. Local AI is highly visible even though Phase 4 says it should stay optional and non-default.
6. Codex/cloud readiness is not summarized in one calm setup surface.
7. The first successful run is a verification reply, not an obviously useful analysis output.

## Bottom line

The current first-run journey is technically rich but product-fragmented.

Likely current user path:

1. open app
2. complete a setup wizard centered on runtime, models, and first company creation
3. run a verification issue
4. open a broad dashboard
5. discover later how projects/workspaces/issues fit together

That journey can work for an internal developer, but it does not yet cleanly satisfy:

`New technical user gets first useful result within 5 minutes.`
