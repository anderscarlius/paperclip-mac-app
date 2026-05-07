# Experiment 1g Decision Gate

## Question

Should Paperclip do more locally now than the warning-first mitigation already implemented in Experiment 1f?

## Option A — Stop at warning-first mitigation for now

Pros:

- low risk
- truthful to the actual current behavior
- no path rewriting or aliasing
- preserves visibility of the upstream bug
- users still get successful completion through HTTP fallback in observed cases

Cons:

- affected users may still experience slower cloud Codex runs
- logs may still be noisy on impacted paths

## Option B — Implement optional HTTP-only workaround if supported

Status:

- not currently justified

Why:

- a real supported Codex switch has not been verified
- `codex exec --help` did not expose a public websocket-disable or HTTP-only flag

## Option C — Implement ASCII shadow workspace

Status:

- not recommended now

Why:

- too much source-of-truth complexity
- edit mapping and git-state risks are too high
- overkill for a bug that currently still completes via fallback

## Option D — Implement path normalization

Status:

- not recommended now

Why:

- path identity safety is not proven
- could break trust config, tool expectations, or file resolution
- risks hiding the actual upstream bug behind Paperclip-side mutation

## Option E — Implement metadata sanitization

Status:

- not recommended now

Why:

- Paperclip ownership of the exact failing websocket metadata payload is not proven
- could create mismatch between real cwd and reported metadata

## Decision

Continue with warning-first mitigation and upstream report. Do not implement a stronger local workaround until:

- user impact data shows the warning is insufficient, or
- Codex exposes a supported websocket-disable / HTTP-only path, or
- Paperclip proves it directly controls the failing metadata payload safely

## Why this is the right gate

- It keeps Paperclip honest about the defect location.
- It minimizes the chance of introducing path or file-safety bugs.
- It preserves the successful fallback path already observed in authenticated runs.
- It still gives users useful warning context today.
