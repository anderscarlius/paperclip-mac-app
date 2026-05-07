# Experiment 4d Result

## 1. Objective

- Build a narrow, opt-in local fallback prototype for `gemma4:e4b` that obeys the 4c candidate policy while keeping all automatic routing disabled.

## 2. What was implemented

- A manual prototype entrypoint in `user_lab/phase4/scripts/local_fallback_prototype.sh`
- A policy-gated Python runner in `user_lab/phase4/scripts/local_fallback_prototype.py`
- Policy loading from `user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json`
- Model availability checks against local Ollama before inference
- Task class allow-list enforcement
- Input-size limit enforcement
- Demo mode covering the three eligible task classes with synthetic inputs

## 3. Policy enforcement behavior

- The prototype verifies:
- policy `status` is `candidate`
- `routingEnabled` is `false`
- model name is `gemma4:e4b`
- runtime is `ollama`
- Manual prototype execution is allowed even though routing remains disabled, because `routingEnabled: false` is treated as “no automatic integration,” not “no lab execution.”

## 4. Demo results

- Canonical demo JSON: `user_lab/phase4/prototype_runs/local_fallback_20260503T085353Z.json`
- Canonical demo markdown: `user_lab/phase4/reports/local_fallback_20260503T085353Z.md`
- Demo ran all three eligible task classes:
- `local_short_summary`
- `local_small_code_explanation`
- `local_short_policy_text`
- Demo result: `3 / 3` successful prototype runs
- All three demo quality checks passed
- Performance observations from the demo:
- summary: `1962 ms`, about `27.04` tokens/sec
- small code explanation: `6209 ms`, about `27.38` tokens/sec
- short policy text: `2008 ms`, about `27.56` tokens/sec

## 5. Rejection test results

- Ineligible task rejection passed:
- command used `--task-class strict_json_extraction`
- result file: `user_lab/phase4/prototype_runs/local_fallback_20260503T085152Z.json`
- returned `ok: false`
- returned `errorType: task_class_not_eligible`
- no Ollama call was required
- Oversized input rejection passed:
- command used `--task-class local_short_summary` with synthetic input length `4001`
- result file: `user_lab/phase4/prototype_runs/local_fallback_20260503T085236Z.json`
- returned `ok: false`
- returned `errorType: input_too_large`
- enforced `maxInputChars: 3000`
- no Ollama call was required

## 6. Performance observations

- The manual prototype is viable for the narrow eligible classes defined in 4c.
- The local demo outputs were fast enough for a lab prototype and stayed within the configured limits.
- The prototype continues to rely on the 4b observation that `think: false` materially helps visible-output behavior for this model.

## 7. Files changed

- `user_lab/phase4/prototype_runs/.gitkeep`
- `user_lab/phase4/experiment_4d_method.md`
- `user_lab/phase4/scripts/local_fallback_prototype.sh`
- `user_lab/phase4/scripts/local_fallback_prototype.py`
- `user_lab/phase4/experiment_4d_result.md`
- `user_lab/phase4/experiment-log.md`
- Generated: `user_lab/phase4/prototype_runs/local_fallback_20260503T085353Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_20260503T085353Z.md`

## 8. Validation run

- Passed `bash user_lab/phase4/scripts/local_fallback_prototype.sh --demo`
- Passed `python3 -m json.tool user_lab/phase4/prototype_runs/local_fallback_20260503T085353Z.json`
- Passed rejection test for `strict_json_extraction`
- Passed oversized-input rejection test for `local_short_summary`
- Passed `swift build`
- Passed `pnpm --filter @paperclipai/server typecheck`
- Passed `pnpm --filter @paperclipai/ui typecheck`

## 9. Keep or revert

- Keep.
- The prototype is manual, reversible, disabled by default, and useful as a safe stepping stone toward any future routing experiment.

## 10. Remaining unknowns

- No production Paperclip integration has been exercised yet.
- No private repository inputs were tested.
- No fallback-to-cloud handoff behavior has been implemented yet.
- The direct-answer setting may need additional validation if a future integration path encodes Ollama options differently.

## 11. Recommended next experiment

- Recommend Experiment `4e`.
- The next safe step is to design a non-default integration handshake for explicit local fallback selection and stronger-model fallback on low confidence or malformed output.
