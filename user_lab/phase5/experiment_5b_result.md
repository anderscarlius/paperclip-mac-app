# Phase 5B Result

## 1. Objective

Turn the Phase 5A Setup Health recommendation into a concrete MVP UI specification and implementation plan without changing runtime behavior.

## 2. MVP screen summary

The MVP screen is a single Setup Health surface with:

- title
- subtitle
- overall readiness summary
- primary CTA: `Analyze this workspace`
- secondary CTA: `Open diagnostics`
- five cards:
  - Cloud AI
  - Local AI
  - Workspace
  - Developer Tools
  - Runtime

It is designed to answer readiness at a glance and move the user toward the first safe task.

## 3. Card contract summary

A reusable `SetupHealthCard` contract was defined with:

- stable card IDs
- user-facing status
- severity
- summary
- primary/secondary actions
- advanced detail rows

The contract intentionally separates plain product copy from deeper runtime terms.

## 4. Copy summary

User-facing copy was written for:

- screen headline states
- each card state
- primary and secondary actions
- loading and screen-level error states

The copy keeps Local AI explicitly optional and avoids exposing internal field names in collapsed card summaries.

## 5. Data source summary

The MVP can reuse many existing signals now:

- runtime diagnostics
- provider/model-hosting/modelInfo signals
- Ollama reachability and model state
- runtime tool compatibility
- server and run health

The biggest small bridges still needed are:

- auth preflight as a clean health signal
- workspace path health before the first run
- a product-facing selected-workspace concept

## 6. UI states summary

Defined states include:

1. loading
2. first launch with no workspace
3. cloud AI missing
4. cloud AI ready but workspace missing
5. workspace warning
6. local AI available
7. local AI unavailable
8. runtime degraded
9. ready to analyze

These states make the first-run decision path explicit without requiring the full onboarding flow yet.

## 7. Implementation plan summary

Recommended build sequence:

1. 5C — Static Setup Health UI Mock
2. 5D — Connect Existing Runtime Diagnostics
3. 5E — Workspace Selection + Analyze CTA
4. 5F — First Safe Task Backend Contract
5. 5G — Onboarding Entry

This keeps the work incremental, low-risk, and documentation-driven.

## 8. Recommended next experiment

Recommended next experiment:

`Phase 5C — Static Setup Health UI Mock`

Reason:

- smallest safe implementation step
- validates layout and copy first
- requires no runtime behavior change
