# Phase 5P First Successful Run Design

## Why 5P focuses on tester handoff

Paperclip already has enough safe capability to deliver a real private-alpha first run. The next bottleneck is not depth; it is whether a tester can tell if they actually completed the intended flow. Phase 5P therefore focuses on handoff clarity instead of deeper analysis.

## What counts as a successful private-alpha run

Required:

- workspace selected
- Analyze Workspace flow started
- read-only request prepared
- limited metadata collected
- first summary shown
- safety transparency visible

Optional:

- README excerpt read
- manifest fields read
- improved summary shown
- feedback questions answered

## Required steps

The app should treat the first private-alpha run as successful when the core safe flow is complete, even if the README and manifest steps are skipped.

## Optional steps

README and manifest reads are optional improvement steps. They can make the first summary better, but they must not block the first successful run state.

## What the app must not claim

- no claim that AI was used
- no claim that commands ran
- no claim that deeper repo inspection happened
- no claim that the user workspace was tested
- no claim of dependency health, security posture, or production readiness

## What the tester should report back

- whether the first successful run state felt believable
- whether the optional steps were clearly optional
- whether the safety model stayed understandable through the whole flow
- whether the first summary felt useful enough to justify trying the product again
