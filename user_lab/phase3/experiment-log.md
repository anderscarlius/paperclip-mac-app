# Phase 3 Experiment Log

Time:
- 2026-05-02 21:23 CEST

Change:
- Created Phase 3 baseline profiling scaffold for a read-only local environment profiler.

Expected effect:
- Establish a safe foundation for measuring the user's actual macOS, AI, and developer environment before any broader optimization work.

Observed result:
- Pending implementation and execution of Experiment 3a profiler.

Next action:
- Implement the profiler, generate the first baseline JSON + markdown report, and validate outputs.

Time:
- 2026-05-02 21:41 CEST

Change:
- Implemented and ran the read-only Phase 3 profiler, generated timestamped JSON + markdown outputs, added privacy notes, and validated the outputs with `json.tool`, `swift build`, and Paperclip server/UI typechecks.

Expected effect:
- Produce a trustworthy local-only baseline of system, path-class, AI stack, dev stack, external LLM presence booleans, and Paperclip runtime signals without modifying the machine.

Observed result:
- The profiler generated a successful baseline on the local machine. It identified an Apple Silicon macOS environment with a medium-risk repo path class, Docker available and running, Ollama installed but not reachable, no LLM API key env vars present in the current shell, and recent Paperclip artifacts still centered on `openai` + `cloud` runtime signals with `modelInfo` and warnings visible in the lab artifacts.

Next action:
- Recommend Experiment 3b as a controlled latency and friction measurement pass, starting with Paperclip cloud startup timing on the current path versus an ASCII-only comparison workspace.

Time:
- 2026-05-02 21:59 CEST

Change:
- Implemented the Phase 3b controlled latency harness, created an ASCII-only comparison workspace under `/private/tmp/paperclip_latency_baseline/PaperclipApp`, ran 2 + 2 real `codex_local` measurements with the fixed read-only prompt, and generated structured JSON + markdown baseline outputs.

Expected effect:
- Produce a trustworthy first latency comparison between the user's real medium-risk workspace path and an ASCII-only workspace, while capturing warnings, websocket/fallback signals, success rates, and runtimeContext/modelInfo visibility.

Observed result:
- All four runs completed successfully. The current path remained slower in median duration and produced the expected workspace-path warning on both runs, while the ASCII comparison workspace completed cleanly with no warnings. The earlier websocket/header fallback issue did not reproduce in this sample, and `runtimeContext` plus `modelInfo` were visible on every run.

Next action:
- Recommend Experiment 3c if we want a broader reliability sample or a deeper path-friction analysis before considering any stronger mitigation.

Time:
- 2026-05-02 22:12 CEST

Change:
- Expanded the 3b harness into a reliability mode, ran a balanced `5 + 5` controlled sample on the real medium-risk workspace path versus the ASCII-only comparison workspace, added aggregate statistics, and generated a reliability benchmark JSON + markdown report.

Expected effect:
- Determine whether the apparent 3b latency difference is stable, whether warnings remain consistent, and whether websocket/header or HTTP fallback failures recur often enough to justify a stronger mitigation track.

Observed result:
- All 10 runs completed successfully. The current path warning remained perfectly consistent at `5/5`, the ASCII path stayed warning-free at `0/5`, websocket/header errors and HTTP fallback stayed absent on both paths, and the larger sample reduced the median latency delta to `61 ms` with a mean delta of about `1.2 s`. This supports a warning-only outcome rather than a stronger mitigation proposal.

Next action:
- Recommend Phase 4a instead of 3d unless new evidence appears that reintroduces path-specific runtime failures.
