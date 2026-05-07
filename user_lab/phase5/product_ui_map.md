# Product UI Map

## Audit basis

This map is based on code inspection only.

Primary files inspected:

- `Sources/PaperclipDesktop/App/PaperclipDesktopApp.swift`
- `Sources/PaperclipDesktop/Views/RootView.swift`
- `Sources/PaperclipDesktop/Views/Main/MainWindowView.swift`
- `Sources/PaperclipDesktop/Views/Main/StatusBarView.swift`
- `Sources/PaperclipDesktop/Views/Setup/SetupWizardView.swift`
- `Sources/PaperclipDesktop/Views/Settings/*.swift`
- `vendor/paperclip/ui/src/App.tsx`
- `vendor/paperclip/ui/src/components/Layout.tsx`
- `vendor/paperclip/ui/src/components/OnboardingWizard.tsx`
- `vendor/paperclip/ui/src/pages/Dashboard.tsx`
- `vendor/paperclip/ui/src/pages/AgentDetail.tsx`
- `vendor/paperclip/ui/src/pages/IssueDetail.tsx`
- `vendor/paperclip/ui/src/pages/ProjectWorkspaceDetail.tsx`

## 1. Main screens/pages found

### Native macOS shell

#### Root gate

- `RootView` shows either:
  - `SetupWizardView` when `model.shouldPresentSetupWizard` is true
  - `MainWindowView` otherwise

Evidence:

- `Sources/PaperclipDesktop/Views/RootView.swift`
- `Sources/PaperclipDesktop/Stores/DesktopAppModel.swift`

#### Main window

- `MainWindowView` uses a `NavigationSplitView`
- left side is a native desktop overview sidebar
- right side shows:
  - `StatusBarView`
  - embedded `PaperclipWebView` when the local server is running
  - `OfflineDashboardView` when it is not
  - `StartupSplashView` during startup

Evidence:

- `Sources/PaperclipDesktop/Views/Main/MainWindowView.swift`
- `Sources/PaperclipDesktop/Views/Main/PaperclipWebView.swift`

#### Settings window

Native settings tabs:

- General
- API Keys
- Models
- Skills
- Server
- Runs
- Network
- Diagnostics
- Advanced
- Help
- Legal

Evidence:

- `Sources/PaperclipDesktop/Views/Settings/SettingsView.swift`

#### Other native windows

- About window
- Menu bar extra
- New Company wizard sheet
- Instruction editor sheet

Evidence:

- `Sources/PaperclipDesktop/App/PaperclipDesktopApp.swift`
- `Sources/PaperclipDesktop/Views/MenuBar/MenuBarView.swift`

### Native setup flow

The native setup wizard has five steps:

1. Welcome
2. Runtime
3. Model
4. Company
5. Test

Evidence:

- `Sources/PaperclipDesktop/Views/Setup/SetupWizardView.swift`

### Embedded web app

Top-level web areas found:

- Dashboard
- Companies
- Agents
- Agent detail
- Projects
- Project detail
- Project workspaces
- Issues
- Issue detail
- Routines
- Goals
- Approvals
- Costs
- Activity
- Inbox
- Company settings
- Company skills
- Instance settings
- Plugin management
- Auth / invite / CLI auth

Evidence:

- `vendor/paperclip/ui/src/App.tsx`

## 2. What each screen appears to do

### Native overview sidebar

Shows machine/runtime summary for:

- Paperclip server
- Ollama
- Web Search
- Local Model
- Current Run
- Watchdog

Also includes quick Finder links and company list.

Evidence:

- `Sources/PaperclipDesktop/Views/Main/MainWindowView.swift`

### Native status bar

Shows:

- server state
- local model picker/readiness
- Start/Stop server
- Settings entry

Evidence:

- `Sources/PaperclipDesktop/Views/Main/StatusBarView.swift`

### Native Diagnostics tab

Acts like a control center for:

- server status
- Ollama
- local model
- web search
- Codex/runtime compatibility
- files/workspace
- watchdog
- runtime metadata
- latest run diagnostics

Evidence:

- `Sources/PaperclipDesktop/Views/Settings/DiagnosticsSettingsView.swift`

### Native Models tab

Lets the user choose:

- cloud-first vs local AI on this Mac
- cloud default model
- local Gemma 4 memory/model settings
- Ollama install/update/setup

Evidence:

- `Sources/PaperclipDesktop/Views/Settings/ModelSettingsView.swift`

### Native Server tab

Lets the user:

- start/stop/restart server
- inspect compatibility message for agent runtimes
- repair broken agent adapters
- read log output

Evidence:

- `Sources/PaperclipDesktop/Views/Settings/ServerSettingsView.swift`

### Web dashboard

Company-level operational dashboard:

- metrics
- recent activity
- recent issues
- active agents
- charts

If there are no companies, it prompts company onboarding.

Evidence:

- `vendor/paperclip/ui/src/pages/Dashboard.tsx`

### Web onboarding wizard

Creates:

- company
- goal
- agent
- starter project/issue/task

This is company onboarding, not desktop setup.

Evidence:

- `vendor/paperclip/ui/src/components/OnboardingWizard.tsx`

### Web agent detail

Deep operator surface for:

- configuration
- instructions
- runs
- skills
- budget
- runtime diagnostics
- local fallback prototype card
- run invocation details
- workspace operations

Evidence:

- `vendor/paperclip/ui/src/pages/AgentDetail.tsx`

### Web issue detail

Issue execution surface for:

- chat thread
- approvals
- issue documents
- issue properties
- execution workspace card

Evidence:

- `vendor/paperclip/ui/src/pages/IssueDetail.tsx`
- `vendor/paperclip/ui/src/components/IssueWorkspaceCard.tsx`

### Web project workspace detail

Advanced workspace configuration screen for:

- local path
- repo URL
- refs
- runtime services JSON
- setup/cleanup commands

Evidence:

- `vendor/paperclip/ui/src/pages/ProjectWorkspaceDetail.tsx`

## 3. Where runtime diagnostics appear

Current runtime/setup diagnostics are spread across multiple places:

- native setup wizard test step
- native overview sidebar
- native status bar
- native Diagnostics settings tab
- native Server settings tab
- web Agent detail run diagnostics card
- web Agent detail run invocation card

Most complete current surfaces:

- `Sources/PaperclipDesktop/Views/Settings/DiagnosticsSettingsView.swift`
- `vendor/paperclip/ui/src/pages/AgentDetail.tsx`

## 4. Where workspace status appears

Two different workspace concepts appear:

### Desktop file locations

- native Advanced and Help tabs show:
  - Documents workspace root
  - Application Support root

Evidence:

- `Sources/PaperclipDesktop/Views/Settings/AdvancedSettingsView.swift`
- `Sources/PaperclipDesktop/Views/Settings/HelpSettingsView.swift`

### Project/execution workspaces

- web Project detail workspaces tab
- web Project workspace detail page
- web Issue workspace card
- web Execution workspace detail routes

Evidence:

- `vendor/paperclip/ui/src/pages/ProjectDetail.tsx`
- `vendor/paperclip/ui/src/pages/ProjectWorkspaceDetail.tsx`
- `vendor/paperclip/ui/src/components/IssueWorkspaceCard.tsx`

There is no simple first-run “choose a local code folder and check its health” screen.

## 5. Where user actions start

Current entry points for meaningful work:

- native setup wizard
- native toolbar `New Company`
- web onboarding wizard
- web `New Issue`
- web `Add Project`
- web `Create Agent`

The shipped action model starts from company/agent/task creation, not from selecting a local workspace and running one safe read-only analysis.

## 6. Where errors/warnings appear

### Native

- top-level alert via `RootView`
- setup verification failure copy
- server logs
- diagnostics cards
- status summaries/messages

### Web

- route-level error banners
- run diagnostics warnings in Agent detail
- local fallback prototype warnings in Agent detail
- form validation on project/workspace screens

Important limitation:

- path-risk warnings and resolved-model warnings exist, but they are mostly visible only after a run or in deeper diagnostics surfaces.

## 7. Whether there is any onboarding flow today

Yes, there are two onboarding flows today.

### Native desktop setup onboarding

Purpose:

- install/check runtime
- start server
- choose cloud-first or local AI
- create first company
- run a first verification issue

### Web company onboarding

Purpose:

- create company
- create goal/agent/task

Assessment:

- onboarding exists
- but it is not yet a clear productized first-run journey for “open a code workspace and get a useful result in 5 minutes”
- it is currently closer to internal/operator bootstrap than private-alpha product onboarding
