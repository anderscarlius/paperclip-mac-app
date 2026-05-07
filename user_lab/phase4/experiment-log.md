# Phase 4 Experiment Log

Time:
- 2026-05-03 00:00 CEST

Change:
- Created the Phase 4 scaffold for local AI stack reachability checks.

Expected effect:
- Establish a safe starting point for measuring Ollama availability before any local-model optimization work.

Observed result:
- Pending implementation and execution of Experiment 4a.

Next action:
- Implement the Ollama reachability checker, generate JSON + markdown outputs, and validate the results.

Time:
- 2026-05-03 10:16 CEST

Change:
- Implemented the Phase 4a Ollama reachability checker, then corrected its classification logic to prioritize `/api/tags`, add `lsof` port-binding detection, and use `ollama list` only as a fallback when direct API evidence is inconclusive.

Expected effect:
- Produce an accurate read-only baseline for whether Ollama is installed, locally reachable, and backed by at least one installed model, without starting or modifying the service.

Observed result:
- Ollama was confirmed installed and reachable at `127.0.0.1:11434`. The service was bound by `ollama` on port `11434`, the API returned HTTP `200`, and one local model was detected: `gemma4:e4b` with family `gemma4`, parameter size `8.0B`, and quantization `Q4_K_M`. The earlier unreachable classification was therefore stale or insufficiently classified.

Next action:
- Proceed to Experiment 4b for a lightweight local model smoke benchmark or capability inventory, with no routing changes yet.

Time:
- 2026-05-03 10:44 CEST

Change:
- Implemented a local-only Ollama smoke benchmark for `gemma4:e4b`, ran a full `2 x 5` synthetic task set, then refined the harness to use direct-answer mode and clearer quality checks before regenerating the final benchmark artifacts.

Expected effect:
- Produce a truthful first baseline for whether the detected local model is usable for low-risk Paperclip tasks such as short summaries, small code explanations, structured extraction, and local fallback recommendation text.

Observed result:
- The final benchmark completed `10/10` runs successfully. `gemma4:e4b` looked suitable for short summarization, very small code explanation, and short local recommendation writing, but not suitable for the strict JSON-only classification and structured-extraction tasks used here. The benchmark also revealed an important operational nuance: direct-answer mode (`think: false`) materially improved visible output quality compared with an earlier run that produced mostly empty visible responses.

Next action:
- Recommend Experiment 4c to test a narrow local fallback path for only the task classes that looked suitable, without changing the general routing policy yet.

Time:
- 2026-05-03 10:50 CEST

Change:
- Created an evidence-based local fallback candidate policy and a machine-readable config stub for `gemma4:e4b`, using the final 4b benchmark as the only source of eligibility evidence.

Expected effect:
- Establish a safe routing-policy foundation that keeps local fallback narrow, truthful, and disabled by default until a later experiment explicitly tests integration behavior.

Observed result:
- The policy marks `gemma4:e4b` as a candidate only for short summaries, very small code explanations, and short local recommendation text. Strict JSON tasks, structured extraction, multi-file coding, repo-wide analysis, and other high-precision or high-impact classes remain explicitly ineligible. Routing remains disabled.

Next action:
- Recommend Experiment 4d for an optional non-default local fallback prototype limited to the eligible task classes and guarded by explicit fallback behavior.

Time:
- 2026-05-03 10:55 CEST

Change:
- Implemented a manual, policy-gated local fallback prototype for `gemma4:e4b`, including demo mode for all eligible task classes plus explicit rejection paths for ineligible task classes and oversized inputs.

Expected effect:
- Demonstrate that the 4c candidate policy can be enforced mechanically without enabling any production routing, while still allowing controlled local prototype runs for the narrow task classes that looked suitable in 4b.

Observed result:
- The demo ran successfully for all three eligible task classes, each returning an acceptable local output under the policy limits. Rejection behavior also worked as intended: `strict_json_extraction` was denied before inference, and oversized input for `local_short_summary` was rejected before inference. Routing remained disabled throughout.

Next action:
- Recommend Experiment 4e for a non-default integration handshake that can surface this local fallback path explicitly while preserving stronger-model fallback behavior.

Time:
- 2026-05-03 13:59 CEST

Change:
- Implemented a non-default local fallback integration handshake contract and prototype, added demo mode plus request-file mode, reused the 4d local fallback path for eligible requests, and added explicit pre-inference rejection gates for ineligible or unsafe requests.

Expected effect:
- Show how Paperclip could explicitly offer a narrow local fallback option for `gemma4:e4b` without changing production routing, while preserving operator control, truthful confidence labels, and stronger-model fallback recommendations.

Observed result:
- The 4e demo produced `5` synthetic cases with `2` eligible local executions and `3` pre-inference rejections. Request mode also validated both paths: one eligible `local_short_policy_text` request was accepted and executed locally, and one request requiring command execution was rejected before inference with a stronger-model recommendation. Routing remained disabled throughout. `swift build` passed, but both requested `pnpm` typechecks hung without output and had to be interrupted after extended waits.

Next action:
- Recommend Experiment 4f for controlled operator-facing or diagnostics-facing surfacing of this explicit local fallback handshake, still without enabling automatic routing.

Time:
- 2026-05-03 14:28 CEST

Change:
- Implemented an operator-facing local fallback status tool and a timeout-based validation wrapper, generated fresh status and validation artifacts, and reran the local fallback prototype and handshake demos as practical regression checks.

Expected effect:
- Give operators a truthful one-file summary of local fallback readiness and prevent future validation runs from hanging indefinitely without evidence.

Observed result:
- The operator status report classified the local fallback path as `available_candidate`: Ollama was reachable, `gemma4:e4b` was detected, the 4c policy remained `candidate`, routing stayed disabled, and benchmark plus handshake evidence were present. The timeout wrapper also worked as intended: it captured a `swift build` failure tied to sandbox/cache write restrictions and converted both hanging `pnpm` typechecks into explicit `timed_out` results instead of indefinite waits. Fresh 4d and 4e demo reruns also passed.

Next action:
- Recommend Experiment 4g for an operator-facing diagnostics or review surface that can present this manual local fallback candidate and its evidence without enabling automatic routing.

Time:
- 2026-05-03 14:36 CEST

Change:
- Performed 4f.1 validation diagnostics, reproduced the validation commands manually, improved the timeout wrapper with command-set selection and command-availability reporting, and reran the local fallback status plus prototype/handshake regressions.

Expected effect:
- Separate real code failures from wrapper or shell-environment problems and decide whether Phase 4 is clean enough to continue to 4g.

Observed result:
- `swift build` passed manually but still failed inside the wrapper process environment, pointing to a wrapper or shell-environment issue rather than a local fallback regression. Both `pnpm` typecheck commands failed immediately as `command not found` when run manually, and the improved wrapper now reports them as `failed` with `baseCommandAvailable: false` instead of misleading `timed_out` results. The local fallback status tool still reported `available_candidate`, and both prototype and handshake demos still passed.

Next action:
- Proceed to Experiment 4g. The remaining validation issues are classified as validation hygiene or environment issues, not blockers in the local fallback work itself.

Time:
- 2026-05-03 15:03 CEST

Change:
- Produced the 4g offer-design specification for local fallback, including offer eligibility rules, user-facing copy, flow design, minimal UI/API contract, MVP boundaries, and explicit non-goals. Also ran the requested lightweight validation set with fresh status, handshake, and minimal wrapper artifacts.

Expected effect:
- Define the smallest useful user/operator offer for the local fallback candidate path so a later experiment can build a narrow UI prototype without drifting into automatic routing or platform overbuild.

Observed result:
- The design converged on a small explicit offer: `Run locally instead?`, shown only for eligible short summaries, small code explanations, and short policy text. Stronger-model fallback remained mandatory in all flows, and automatic routing stayed forbidden. Validation also stayed green for the narrow gate: the policy JSON was valid, the status tool still reported `available_candidate`, the handshake demo still passed, and the minimal validation wrapper passed `swift build`, prototype demo, and handshake demo.

Next action:
- Recommend Experiment 4h for a small operator-facing UI prototype that implements only the MVP offer surface and preserves the stronger-model fallback path.

Time:
- 2026-05-03 22:06 CEST

Change:
- Implemented a minimal operator-facing local fallback UI prototype in the existing run-detail diagnostics area, added a small helper for demo offer data, added a narrow render test file, and reran the lightweight validation set after the UI change.

Expected effect:
- Make the local fallback candidate visible to operators in a truthful, optional way without introducing routing behavior, settings complexity, or UI-triggered local execution.

Observed result:
- The run detail view now contains a prototype preview card below runtime diagnostics with the 4g copy, medium-confidence badge, explicit `Run locally`, `Use stronger model`, and `Cancel` actions, plus a clear note that automatic routing is disabled. The prototype uses lab/demo data rather than real task classification, which kept the change low-risk. Lightweight validation also stayed green: status remained `available_candidate`, the handshake demo still passed, and the minimal validation wrapper passed `3/3`.

Next action:
- Recommend Experiment 4i for narrow real-signal wiring into this offer surface or a closely related operator-facing diagnostics payload, while still keeping execution opt-in and automatic routing disabled.

Time:
- 2026-05-03 22:44 CEST

Change:
- Replaced the unconditional 4h demo rendering path with a minimal local fallback candidate-signal contract, wired the run-detail UI card to render only when that signal is present, added a diagnostic-only state for unknown task class, and documented the real data-trace limits for future backend work.

Expected effect:
- Make the local fallback card appear from a narrow, truthful signal path instead of always-on demo data, while preserving prototype-only actions, stronger-model fallback messaging, and automatic routing disabled.

Observed result:
- `AgentDetail` runtime diagnostics now gate the local fallback UI preview through `getLabLocalFallbackCandidateSignal(...)` instead of unconditional demo data. Because no real task-class payload is available yet, the default 4i run-detail state is a diagnostic-only availability card with no `Run locally` action. Fresh narrow validation also passed: the status tool still reported `available_candidate`, the handshake demo still passed, and the minimal validation wrapper passed `3/3`. A targeted UI test command was attempted but remained blocked by the known non-interactive PATH issue for `pnpm`.

Next action:
- Recommend Experiment 4j for the smallest real backend/runtime candidate payload so the UI can surface eligible local-fallback offers without depending on a lab-fixture signal.

Time:
- 2026-05-03 23:03 CEST

Change:
- Added a minimal real local-fallback candidate payload path in the `codex-local` adapter, normalized explicit payload or 4e-style handshake request metadata into `runtimeContext.localFallbackCandidate`, preserved a compact copy in heartbeat-visible runtime diagnostics, and rewired the UI to consume real payloads instead of lab-fixture signals by default.

Expected effect:
- Let the UI show a true eligible local-fallback offer only when explicit safe metadata exists, while keeping diagnostic-only and not-eligible states conservative and preserving automatic routing disabled.

Observed result:
- The backend now emits a real `localFallbackCandidate` payload when explicit metadata is supplied through adapter context. The UI consumes that payload and now cleanly distinguishes `eligible`, `diagnostic_only`, `not_eligible`, and missing-payload states. No prompt guessing, local inference, or routing changes were introduced. Fresh narrow validation also passed: the status tool still reported `available_candidate`, the handshake demo still passed, and the minimal validation wrapper passed `3/3`. The targeted UI test command was attempted again but remained blocked by the known non-interactive `pnpm` PATH issue.

Next action:
- Recommend Experiment 4k for the smallest real producer of explicit local-fallback candidate metadata in an operator-facing flow, so a real narrow task path can surface an eligible offer end-to-end.
