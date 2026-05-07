# Experiment 4h UI Surface Decision

## 1. UI Surface Inspected

- Inspected `vendor/paperclip/ui/src/pages/AgentDetail.tsx`
- Focused on the existing `RunDetail` diagnostics area near runtime diagnostics and warnings

## 2. Smallest Useful Offer Placement

- Chosen placement: run detail summary card, directly below the existing runtime diagnostics card
- This keeps the prototype close to model diagnostics, warning context, and other run-level operator cues

## 3. Why This Surface Is Low Risk

- It already exists
- It already presents model diagnostics and warning information
- It does not require a global composer or settings integration
- It does not require changing routing behavior

## 4. Data Source Choice

- The prototype uses lab/demo offer data shaped from the 4g UI contract
- It is not wired to real task classification
- It is shown only in the inspected run-detail diagnostics surface as a narrow preview

## 5. What Is Intentionally Not Wired Yet

- no automatic routing
- no real runtime classification of task eligibility
- no UI-triggered local inference execution
- no persistent preference system
- no telemetry

## Decision

- The run detail diagnostics area in `AgentDetail` is the best low-risk MVP surface for 4h.
