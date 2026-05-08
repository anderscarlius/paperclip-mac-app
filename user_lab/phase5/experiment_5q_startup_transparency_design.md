# Phase 5Q Startup Transparency Design

## Why startup transparency matters for trust

Startup is the first trust-sensitive moment in the private alpha. If the app appears busy without explanation, testers may assume it is touching their workspace, hanging, or silently using local AI. Clear startup visibility lowers that uncertainty.

## Which startup states the user should see

- desktop app started
- checking Paperclip runtime
- checking local AI runtime
- loading workspace state
- Setup Health ready

The UI should distinguish checking, waiting, ready, and needs attention.

## What the app can honestly claim

- Paperclip is checking local readiness signals.
- Setup Health is still loading or is ready.
- Local AI appears available, unavailable, or still being checked.
- Project files are not modified during startup.

## What the app must not imply

- that Ollama is definitely started unless explicitly known
- that local AI is being used automatically
- that startup is analyzing the workspace
- that startup modifies project files

## How Ollama and local service checks should be described

Use conservative language:

- `Checking local AI runtime`
- `Local AI runtime appears available`
- `Local AI runtime is not available`
- `Paperclip will not use local AI automatically`

If Paperclip cannot prove a service is fully ready, describe it as checking or waiting, not ready.

## What counts as ready for Setup Health

Setup Health is ready once live readiness queries are no longer loading and diagnostics are available for the page to render concrete health cards instead of fallback loading states.

## What slow-start copy should say

If startup takes longer than expected, Setup Health will remain read-only until readiness is clear.

This is calm, honest, and does not imply failure.

## Future work

- richer desktop runtime-state bridging into the web UI
- explicit managed-versus-unmanaged Ollama startup visibility
- clearer differentiation between runtime-starting and runtime-checking when a stronger signal exists
