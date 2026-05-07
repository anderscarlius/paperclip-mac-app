# Prioritized Hypotheses

## 1. Hypothesis

Paperclip should fail fast when `codex_local` is about to use cloud-hosted OpenAI responses without valid Codex auth.

Root cause:
- The adapter proceeds into websocket and HTTP execution even when the eventual result is a predictable `401 Unauthorized`.

Expected improvement:
- Much shorter failure loop and clearer user guidance.

Measurement method:
- Compare the controlled no-auth baseline run duration and error clarity before/after the preflight.
- Success signal: failure happens immediately with one actionable message instead of retry churn.

Risk level:
- Low

## 2. Hypothesis

The user workspace path with non-ASCII characters is destabilizing Codex websocket startup metadata.

Root cause:
- Codex transport appears to serialize workspace metadata into headers that fail UTF-8 conversion for this path.

Expected improvement:
- Fewer reconnect loops before model sampling begins.

Measurement method:
- Compare the same run from an ASCII-only workspace path and count websocket metadata failures, ideally while keeping auth state constant.

Risk level:
- Medium

## 3. Hypothesis

Runtime context is less useful because the actual model is not surfaced.

Root cause:
- The adapter does not provide a resolved model value when the run uses default cloud configuration.
- In the current baseline, the auth failure also prevented any successful end-to-end confirmation of the actual selected model.

Expected improvement:
- Better observability and better user trust in model selection.

Measurement method:
- Compare baseline metadata before/after explicit model resolution.
- Success signal: `model` is no longer `unknown` in prompt, env, and result.

Risk level:
- Medium

## 4. Hypothesis

The runtime-context block is being diluted by oversized generic runtime guidance.

Root cause:
- The prompt places a long web-search behavior block immediately after the context block.

Expected improvement:
- Better odds that the agent uses runtime context in its reasoning and summaries.

Measurement method:
- Compare prompt length ratios and run output references to runtime context before/after prompt tightening.

Risk level:
- Low

## 5. Hypothesis

Failure summaries should collapse multiple low-level transport errors into one Paperclip-owned diagnosis.

Root cause:
- Raw Codex transport failures reach the user almost ungrouped.

Expected improvement:
- Faster human understanding of what to fix next.

Measurement method:
- Compare run result summaries before/after diagnostic collapsing.
- Success signal: one short failure category plus one actionable next step.

Risk level:
- Medium
