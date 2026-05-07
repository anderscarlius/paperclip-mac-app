# Phase 2 Recommendation

## Candidate track review

### Track A — Model Observability Gap

Problem:

- Runtime context still reports `model: unknown` in cloud-hosted success paths.

Potential value:

- better diagnostics
- better routing decisions later
- better telemetry later
- better user trust in what Paperclip is actually running

Assessment:

- Highest leverage next step because it improves the quality of future optimization work without introducing risky execution behavior changes.

### Track B — Warning Surfacing in UI

Problem:

- `resultJson.warnings` and stdout warnings may not be sufficiently visible in Desktop UI surfaces.

Potential value:

- clearer user feedback
- lower confusion when latency/noisy logs occur
- makes the 1f mitigation more effective

Assessment:

- Strong secondary track because the warning now exists technically, but may still be easy to miss depending on UI surfacing.

### Track C — Full User Environment Profiler

Problem:

- The broader User Environment Optimization Lab vision still lacks structured baseline data for hardware, AI stack, local providers, Docker, dev tooling, and runtime services.

Potential value:

- better long-term optimization substrate
- more complete environment understanding

Assessment:

- Valuable, but better after core runtime observability is sharper.

### Track D — External LLM Traffic Optimizer

Problem:

- Cost/latency/privacy routing for external LLM traffic is not yet optimized.

Potential value:

- potentially high business and operational value

Assessment:

- Premature before runtime observability and user-visible diagnostics are more trustworthy.

## Recommendation

### Primary Phase 2 Track

- `Track A — Model Observability Gap`

Why:

- It fixes a direct observability blind spot already surfaced in Phase 1.
- It improves future debugging, routing, and trust without immediately expanding runtime complexity.
- It is the most natural continuation of the P1/P1-lab work.

### Secondary Phase 2 Track

- `Track B — Warning Surfacing in UI`

Why:

- Phase 1 already introduced warning-first mitigation technically.
- The next practical improvement is ensuring users can actually see and understand that warning in the Desktop experience.

## Recommended sequencing

1. Improve model observability so runtime context is more authoritative.
2. Surface warnings clearly in UI using the new `resultJson.warnings` signal.
3. Revisit the broader environment profiler once runtime truthfulness is stronger.
4. Delay external traffic optimization until the diagnostic foundation is better.
