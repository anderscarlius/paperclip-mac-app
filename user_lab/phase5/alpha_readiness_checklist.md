# Alpha Readiness Checklist

## Internal Developer Alpha

### Required

- app launches
  - Status: partial
  - Notes: app entry and root routing are present in code, but this audit did not run a full app launch.
- runtime diagnostics visible
  - Status: ready
  - Notes: visible in native Diagnostics and in web Agent run detail.
- auth preflight works
  - Status: partial
  - Notes: Phase 1 implemented missing-auth preflight, but readiness is not summarized in one first-run surface.
- first read-only task works
  - Status: missing
  - Notes: current first task is a verification reply, not a safe workspace analysis.
- setup health screen exists or equivalent
  - Status: partial
  - Notes: equivalent signals exist across setup/runtime/diagnostics, but not as one simple screen.
- known warnings documented
  - Status: partial
  - Notes: warnings are documented in lab artifacts and some run detail UI, but not clearly productized.

## Power User Alpha

### Required

- first-run onboarding
  - Status: partial
  - Notes: native setup wizard exists, but it is company/runtime oriented rather than workspace/value oriented.
- setup health screen
  - Status: missing
  - Notes: should be built as a single product surface.
- workspace selection
  - Status: partial
  - Notes: project/workspace configuration exists later, but not as a first-run step.
- first safe task
  - Status: missing
  - Notes: recommended to add `Analyze this workspace`.
- user-friendly auth recovery
  - Status: partial
  - Notes: some auth/runtime recovery exists, but Cloud AI readiness is still fragmented.
- local AI optional
  - Status: partial
  - Notes: cloud-first exists, but local AI is still visually prominent in early flow.
- no terminal required for basic use
  - Status: partial
  - Notes: the intended app flow is GUI-first, but compatible runtime tool availability is still a likely setup dependency.

## Public Beta

### Required later

- installer
  - Status: missing
- signing/notarization
  - Status: missing
- update mechanism
  - Status: missing
- crash reporting policy
  - Status: missing
- privacy policy
  - Status: missing
- permissions UX
  - Status: partial
  - Notes: some trust/privacy copy exists, but not a full polished permissions story.
- polished settings
  - Status: partial
  - Notes: many settings exist, but they are operator-heavy.
- support docs
  - Status: partial
  - Notes: bundled Quick Start and How To exist, but private-alpha onboarding docs are not yet enough.

## Overall assessment

Current likely position:

- internal developer alpha: close, but still missing a useful first safe task and unified setup health view
- power user alpha: not ready yet
- public beta: not close enough to target in this phase

## Highest-value next build step

Build a simple first-run health + workspace + first-safe-task layer before broader UI polish.
