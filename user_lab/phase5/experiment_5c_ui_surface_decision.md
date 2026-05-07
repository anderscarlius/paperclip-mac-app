# Phase 5C UI Surface Decision

## 1. Where Setup Health lives for the static mock

For Phase 5C, Setup Health lives as a web UI page:

- `vendor/paperclip/ui/src/pages/SetupHealth.tsx`

It is route-wired under the existing UX preview family:

- `/:companyPrefix/tests/ux/setup-health`

An unprefixed redirect was also added to match the current app pattern for other UX lab pages:

- `/tests/ux/setup-health`

## 2. Whether it is route-wired or component-only

It is both:

- component/page exists as a standalone React page
- route wiring is included because it was trivial and follows the existing `tests/ux/chat` and `tests/ux/runs` pattern

## 3. Why this is low-risk

- it uses mock data only
- it introduces no backend dependency
- it changes no runtime behavior
- it sits inside an existing low-risk preview route family
- it does not replace onboarding, diagnostics, or dashboard entry points

## 4. What is intentionally not connected

The static mock does not connect to:

- backend diagnostics data
- auth/session state
- real workspace selection
- real runtime health
- real tool detection
- real `Analyze this workspace` execution

All actions are local static UI feedback only.

## 5. How a human can preview it

Preferred preview path:

- open the app web UI
- navigate to `/tests/ux/setup-health`

Expected behavior:

- app redirects to the selected company prefix path when needed
- Setup Health renders using local mock scenario state

Alternative preview path:

- `/:companyPrefix/tests/ux/setup-health`

## 6. What is deferred to 5D

Deferred intentionally:

- backend wiring
- real status derivation
- first-safe-task enablement rules from live data
- diagnostics integration beyond static CTA copy
