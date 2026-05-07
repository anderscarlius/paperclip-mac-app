# Phase 1 Summary

## Persona

Anders is an advanced local developer using Paperclip as a coding and debugging copilot on an Apple Silicon Mac, with low tolerance for setup friction and long ambiguous failures.

## Workflow

The studied workflow is: user asks Paperclip to analyze and diagnose a bug in a local repo via `codex_local`.

## Baseline Behavior

- Runtime context injection worked and was visible in prompt, env vars, and `resultJson.runtimeContext`.
- Local setup was fast: first log at 2ms, first Codex JSON event at 69ms.
- The controlled no-auth baseline run failed after ~14.8s with repeated websocket retries, HTTP fallback, and final `401 Unauthorized`.
- The runtime context reported `execution_runtime=local`, `model_hosting=cloud`, `provider=openai`, and `model=unknown`.

## Top 5 Frictions

1. Cloud auth failure is discovered too late.
2. Non-ASCII workspace path appears to break websocket metadata transport.
3. Runtime context says `model: unknown`.
4. Runtime context is clear, but overshadowed by larger guidance text.
5. Failure reporting is technically rich but operationally unclear.

## Best Hypothesis

The highest-confidence, lowest-risk first experiment is to fail fast when `codex_local` is about to use cloud-hosted OpenAI responses without valid Codex auth.

## Next Experiment

Add a minimal auth preflight in `codex-local` `execute.ts` so a cloud-hosted no-auth run returns one immediate actionable auth error instead of spending ~15 seconds in reconnect churn. Keep the workspace-path/header issue as a separate follow-up experiment.
