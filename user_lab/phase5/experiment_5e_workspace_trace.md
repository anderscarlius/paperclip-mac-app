# Phase 5E Workspace Trace

## Purpose

Trace whether Paperclip already exposes a reusable workspace-selection signal for Setup Health and identify the smallest safe 5E implementation path.

## Findings

### 1. Does the UI already know a selected workspace path?

Not as a first-run Setup Health signal.

What exists today:

- `vendor/paperclip/ui/src/pages/ProjectWorkspaceDetail.tsx` reads and edits project workspace fields such as `cwd`, `repoUrl`, `repoRef`, and related runtime config.
- `vendor/paperclip/ui/src/components/IssueWorkspaceCard.tsx` reads issue-scoped execution workspace state and can display `cwd`, `repoUrl`, and linked workspace details.

These are real workspace concepts, but they belong to project and issue flows, not to a simple “workspace to analyze first” product surface.

### 2. Does the app have a concept of current workspace/project/repo?

Yes, but it is contextual.

- Project workspaces are tied to projects and can represent local paths, non-git paths, repo URLs, or remote-managed workspaces.
- Execution workspaces are tied to issues and project execution policies.

This means the app already understands workspaces deeply, but only inside existing project/issue models.

### 3. Is this tied to company / issue / project today?

Yes.

Current workspace path ownership is tied to:

- project workspace configuration
- execution workspace records
- issue-level workspace selection

Setup Health does not currently own or receive one selected first-run workspace independently of those systems.

### 4. Does the native shell expose a selected folder?

No clean reusable first-run selected-folder signal was found in the inspected code.

What was found:

- the UI offers `ChoosePathButton` help in several places, including project workspace forms and adapter config forms
- this helper provides copy-path instructions rather than a real file-picker or globally selected folder source

No dedicated `NSOpenPanel`-style first-run folder selection bridge was found for Setup Health.

### 5. Can Setup Health safely receive a selected workspace as props or diagnostics?

Yes.

This is the smallest safe path for 5E:

- define a workspace diagnostics contract in `setup-health.ts`
- allow Setup Health to render selected/missing/warning states from that contract
- keep the real source bridge deferred until a product owner decides where the workspace should come from

### 6. Can path health be computed in UI?

Yes, for the product-facing warning level only.

5E safely ports the product meaning of the phase 1 detector into a small pure UI helper:

- no filesystem access
- no path mutation
- no external calls
- no runtime adapter import

This helper is appropriate for Setup Health because it only classifies the path string itself.

### 7. Smallest safe 5E implementation path

The smallest safe path is:

1. define `SetupHealthWorkspaceDiagnostics`
2. define `WorkspacePathHealth`
3. add `classifyWorkspacePathForSetupHealth(path)`
4. let Setup Health use that workspace contract when provided
5. keep live diagnostics mode honest when no real workspace source exists
6. add a local read-only Analyze preview that does not execute anything

## 5E Conclusion

Paperclip already has strong project and execution workspace models, but not a simple first-run selected workspace signal. 5E therefore uses a clean contract plus a pure classifier now, and leaves the real workspace bridge for the next phase.
