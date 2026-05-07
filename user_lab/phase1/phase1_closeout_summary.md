# Phase 1 Closeout Summary

## Phase 1 Goal

- Establish a stable, trusted baseline for User Environment Optimization before making broader behavior changes.

## What Was Found

- Auth friction:
  - cloud-hosted `codex_local` previously spent about `14.8 s` in noisy downstream failure paths when auth was missing
- Downstream Codex path-class issue:
  - authenticated cloud-hosted runs on non-ASCII/decomposed paths reproduced `x-codex-turn-metadata` websocket/header failures and HTTP fallback
- Paperclip adapter path flow:
  - adapter review found no evidence that Paperclip itself directly places workspace paths into the failing websocket/header payload
- Cloud warning mitigation:
  - Paperclip now detects medium-risk workspace path classes and emits a warning for affected cloud-hosted runs
- Upstream package:
  - a sanitized issue draft, repro plan, evidence bundle, and decision gate are ready

## What Was Fixed

- missing-auth preflight
- path-class warning for affected cloud-hosted runs

## What Was Not Fixed

- Codex websocket metadata/header bug
- `model: unknown`
- broader model routing behavior
- telemetry / richer observability layers
- full UI surfacing of warnings

## Evidence Table

| Experiment | Question | Result | Decision |
| --- | --- | --- | --- |
| 1a | Is missing cloud auth contaminating the issue? | Yes, and it now fails fast with `missing_auth_preflight`. | Keep auth preflight. |
| 1b | Does the Paperclip adapter itself break unusual paths? | No adapter-level header issue was found. | Do not blame or rewrite adapter path handling yet. |
| 1c | Does the authenticated non-ASCII path reproduce the issue? | Yes, websocket/header failure reproduced and HTTP fallback succeeded. | Treat as downstream Codex CLI/core behavior. |
| 1d | Is the issue path-class-specific? | Yes, strong A/B evidence: non-ASCII fails, ASCII does not. | Treat as path-class-specific. |
| 1e | What mitigation is safest? | Warning-first plus upstream issue package. | Do not implement risky local workaround yet. |
| 1f | Can Paperclip warn conservatively without changing behavior? | Yes, detector + warning implemented and tested. | Keep warning-first mitigation. |
| 1g | Is the upstream/reporting package ready, and should Paperclip do more locally now? | Yes, package is ready; no stronger workaround is justified yet. | Stop at warning-first for now. |
| 1h | Can Phase 1 close cleanly? | Yes, submission readiness, impact review, ADR, and Phase 2 recommendation are all in place. | Close Phase 1. |

## Current Status

- Phase 1 can close.
- The issue is sufficiently isolated, locally mitigated for now, and packaged for upstream reporting.
