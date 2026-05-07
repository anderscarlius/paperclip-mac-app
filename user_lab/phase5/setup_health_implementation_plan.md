# Setup Health Implementation Plan

## Goal

Ship Setup Health as a small sequence of low-risk productization experiments, not as one large onboarding rewrite.

## 5C — Static Setup Health UI Mock

### Scope

- create a new Setup Health page or native view surface
- build the reusable Setup Health card component
- use mock data only
- validate layout, copy, and CTA placement

### Expected effect

- confirm the screen is understandable before connecting real signals

### Risks

- choosing the wrong host surface too early
- over-investing in polish before proving comprehension

### Non-goals

- no backend integration
- no runtime changes
- no workspace selection logic

### Exit criteria

- title/subtitle/overall summary feel correct
- five-card layout is legible
- CTA hierarchy feels right

## 5D — Connect Existing Runtime Diagnostics

### Scope

- connect Cloud AI, Local AI, Developer Tools, and Runtime cards to existing desktop/runtime signals
- reuse existing data where possible from:
  - `DesktopAppModel`
  - native diagnostics/runtime state
  - existing run diagnostics
  - runtime tool compatibility checks

### Expected effect

- make Setup Health truthful with minimal new plumbing

### Risks

- signal fragmentation between native and web layers
- exposing unstable or overly technical fields too directly

### Non-goals

- no behavior change
- no new auth system
- no full environment profiler integration

### Exit criteria

- four of five cards update from real signals
- advanced details show honest runtime terms
- no blocking dependency on new backend systems except small bridges

## 5E — Workspace Selection + Analyze CTA

### Scope

- introduce one selected local code workspace concept for Setup Health
- connect Workspace card to that selection
- enable `Analyze this workspace` only when minimum readiness is met

### Expected effect

- close the biggest product gap from Phase 5A

### Risks

- confusion between Paperclip-managed folders and the user’s target code workspace
- surfacing path warnings without calm copy

### Non-goals

- no broad project/workspace model redesign
- no execution workspace system rewrite

### Exit criteria

- user can pick a folder
- workspace path health is shown
- CTA becomes meaningfully actionable

## 5F — First Safe Task Backend Contract

### Scope

- define the request/response contract for `Analyze this workspace`
- implement a read-only analysis path
- ensure truthfulness and explicit non-inspection sections

### Expected effect

- convert readiness into the first real product value moment

### Risks

- hidden command execution creep
- over-broad inspection causing latency or trust concerns
- mixing safe analysis with edit-capable flows too early

### Non-goals

- no edits
- no autonomous coding
- no local fallback routing

### Exit criteria

- task returns a useful structured result
- no runtime behavior surprises
- output clearly states what was inspected

## 5G — Onboarding Entry

### Scope

- decide where Setup Health lives first:
  - first-launch replacement step
  - pre-dashboard screen
  - dashboard card entry
- choose the lowest-risk rollout path

### Expected effect

- place the screen where new users actually benefit from it

### Risks

- forcing too much routing change too early
- duplicating the setup wizard instead of improving the first-run path

### Non-goals

- no full onboarding rewrite in this experiment
- no account flow redesign

### Exit criteria

- one clear entry point chosen
- rollout plan documented

## Recommended order

Recommended sequence:

1. 5C — Static Setup Health UI Mock
2. 5D — Connect Existing Runtime Diagnostics
3. 5E — Workspace Selection + Analyze CTA
4. 5F — First Safe Task Backend Contract
5. 5G — Onboarding Entry

## Why this sequence

- 5C proves the product language
- 5D proves signal reuse
- 5E makes the screen actionable
- 5F creates first-run value
- 5G places it safely in the journey

## What should not be built yet

- no automatic local routing
- no installer/notarization work here
- no telemetry upload
- no broad dashboard redesign
- no preference engine
- no full local AI education flow

## Recommended next experiment

Recommended next experiment:

`Phase 5C — Static Setup Health UI Mock`

Reason:

- it is the smallest safe build step
- it validates the screen shape and copy before real integration
- it does not require runtime changes
