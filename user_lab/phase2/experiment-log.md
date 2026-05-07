# Phase 2 Experiment Log

Time:
2026-04-30 22:55 CEST

Change:
Traced `runtimeContext.model` through Desktop adapter selection, `codex_local` execution, Codex JSONL parsing, and heartbeat persistence.

Expected effect:
Identify whether `model: unknown` came from missing config, missing parser output, or missing post-run plumbing.

Observed result:
Desktop only provides an explicit model in the local Codex + Ollama path. The adapter can see request/default model signals, but the Codex parser and heartbeat do not provide a reliable resolved cloud model.

Next action:
Define semantics that separate requested/default model signals from resolved model identity.

Time:
2026-04-30 23:04 CEST

Change:
Implemented `runtimeContext.modelInfo` with source, confidence, and unknown-reason classification. Restored `runtimeContext.model` to mean resolved/reported model only.

Expected effect:
Stop silent `unknown` in cloud-hosted runs without fabricating a `gpt-*` model.

Observed result:
Cloud-hosted runs now keep `model = unknown` when unresolved, but preserve requested/default model signals in structured diagnostics. Local explicit model runs still surface a concrete model.

Next action:
Update tests to cover unknown-with-reason, explicit cloud request preservation, and local known-model behavior.

Time:
2026-04-30 23:10 CEST

Change:
Ran verification commands for Experiment 2a.

Expected effect:
Confirm that the observability change is backward-compatible and does not break local or cloud adapter behavior.

Observed result:
`swift build` passed, targeted `codex_local` tests passed, and `@paperclipai/adapter-codex-local` typecheck passed.

Next action:
Keep the change and continue with the next detailed prompt.

Time:
2026-05-02 21:23 CEST

Change:
Implemented a constrained Experiment 2b follow-up: heartbeat run summaries now preserve compact runtime diagnostics and warnings, and the run detail summary card now surfaces model diagnostics with safe wording.

Expected effect:
Users should be able to see requested/configured model signals, resolved-model uncertainty, and runtime warnings without drilling into raw `resultJson`, while avoiding any UI claim that a configured model is the actual resolved cloud model.

Observed result:
Heartbeat summaries now retain `runtimeDiagnostics` plus trimmed `warnings`, the run detail view shows `Resolved model: unknown` when appropriate, and the old `adapterConfig.model` fallback no longer risks presenting a requested/default model as resolved.

Next action:
If this run-detail surfacing is sufficient, recommend Experiment 3a. If higher-level list or telemetry surfaces still need the same diagnostics language, recommend a narrower Experiment 2c follow-up.
