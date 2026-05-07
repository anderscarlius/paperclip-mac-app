# Setup Health Data Sources

## Purpose

Map each Setup Health card to real existing signals and label each source as:

- `available now`
- `needs small backend bridge`
- `future`

## Cloud AI

### Candidate sources

#### Auth preflight result

- Status: needs small backend bridge
- Why: Phase 1 confirms missing-auth preflight exists, but it is not surfaced today as a standalone health signal in the current desktop UI.
- Likely source area:
  - Phase 1 runtime changes
  - runtime/setup failure handling

#### `runtimeContext.provider`

- Status: available now
- Why: model/provider diagnostics are already preserved in run detail from Phase 2 and surfaced in `AgentDetail`.
- Current surfaces:
  - `user_lab/phase2/experiment_2b_result.md`
  - `vendor/paperclip/ui/src/pages/AgentDetail.tsx`

#### `runtimeContext.modelHosting`

- Status: available now
- Why: same preserved runtime diagnostics path as provider/model info.

#### `runtimeContext.modelInfo`

- Status: available now
- Why: Phase 2 explicitly preserved this into heartbeat-visible diagnostics.

#### billing type

- Status: future
- Why: no clear product/backend surface for this was found in current app code inspected for Phase 5A/5B.

### MVP recommendation

For MVP Cloud AI, use:

- latest known provider
- latest known model hosting
- auth preflight bridge if added

Do not block MVP on billing type.

## Local AI

### Candidate sources

#### Ollama reachability

- Status: available now
- Why: native app already tracks Ollama state in `DesktopAppModel`, native sidebar, models settings, and diagnostics.

#### detected model

- Status: available now
- Why: installed/loaded model tracking already exists in the native shell.

#### Phase 4 local fallback status

- Status: available now for lab/operator use, needs small backend bridge for product UI
- Why: the Phase 4 status script/report exists and can report candidate/manual-offer status, but it is not a clean always-live app state surface yet.

#### local fallback candidate status

- Status: needs small backend bridge
- Why: local fallback candidate logic exists and is surfaced in `AgentDetail` for runs, but not yet as a top-level setup health input.

### MVP recommendation

For MVP Local AI, use:

- Ollama reachable/unreachable
- selected local model
- installed/loaded state

Treat fallback-candidate data as optional detail, not required for the first version.

## Workspace

### Candidate sources

#### selected workspace path

- Status: future for this exact screen
- Why: project/workspace paths exist in advanced project flows, but the first-run Setup Health screen does not yet have its own selected local code workspace concept.

#### path-class detector

- Status: needs small backend bridge
- Why: Phase 1 and Phase 3 prove the signal exists in lab/runtime work, but it is not surfaced as a dedicated first-run card today.

#### current workspace availability

- Status: available now for Paperclip-managed folders, future for first-safe-task workspace
- Why:
  - native app already knows Paperclip Documents/Application Support locations
  - but the new “workspace to analyze” still needs a dedicated binding

#### path warning

- Status: needs small backend bridge
- Why: run warnings exist today, but pre-run workspace health is not surfaced directly.

### MVP recommendation

For MVP Workspace, the minimum new bridge is:

- one selected local code workspace path
- one path-health result derived from existing detector logic

This is the most important new data connection needed for productization.

## Developer Tools

### Candidate sources

#### environment profiler

- Status: available now in lab artifacts, needs small backend bridge for product UI
- Why: Phase 3 has strong environment data, but it is not currently a live product card.

#### validation wrapper / compatibility checks

- Status: partially available now
- Why: runtime compatibility messaging already exists in desktop runtime/server flows.

#### PATH availability

- Status: available now
- Why: runtime tool detection is already happening through `RuntimeAgentAdapterService`.

#### git / Swift / Node / pnpm

- Status: lab available now, needs small backend bridge for product UI
- Why: Phase 3 environment profile includes these, but the app does not currently show them as a single readiness card.

### MVP recommendation

For MVP Developer Tools, use:

- compatible runtime tool present or missing
- PATH-visible result
- optional detail rows for `git`, `node`, `pnpm`

Do not block MVP on full environment-profiler integration.

## Runtime

### Candidate sources

#### server state

- Status: available now
- Why: native app already tracks stopped/starting/running/failed server state.

#### latest run status

- Status: available now
- Why: desktop sidebar snapshot and run diagnostics already exist.

#### warnings

- Status: available now
- Why: Phase 2 preserved warnings into visible run diagnostics.

#### heartbeat/run diagnostics

- Status: available now
- Why: native diagnostics and web run detail already expose this family of signals.

#### installed runtime revision/source

- Status: available now
- Why: runtime status is already surfaced in native settings/diagnostics.

### MVP recommendation

Runtime is the easiest card to build first because most signals already exist in the desktop app model.

## Honest MVP source table

### Available now

- latest provider/model-hosting/model-info diagnostics
- Ollama reachable state
- selected/install/loaded local model state
- server state
- latest run diagnostics
- runtime warnings
- runtime revision/source
- compatible runtime tool presence

### Needs small backend bridge

- auth preflight as a clean health signal
- workspace path health before a run
- local fallback candidate as a setup-health detail
- environment-profiler/tool summary in a product-facing payload

### Future

- billing type
- full “workspace to analyze” persistence if not introduced in 5E
- richer tool installation guidance
- historical trend/telemetry summaries

## MVP conclusion

The Setup Health MVP does not require new runtime behavior.

It mostly requires:

1. a unified desktop/UI-facing data model
2. one small bridge for auth/workspace/tool summaries
3. a new selected-workspace concept for the first safe task flow
