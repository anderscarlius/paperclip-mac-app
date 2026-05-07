# Experiment 4e Result

## 1. Objective

- Design and prototype a non-default integration handshake between Paperclip-style task diagnostics and the manual local fallback prototype from 4d.

## 2. Contract created

- Created `user_lab/phase4/local_fallback_integration_contract.md`.
- The contract defines request and response shapes, eligible-offer conditions, must-not-offer conditions, suggested user-facing wording, and an explicit statement that automatic routing remains disabled.

## 3. Handshake prototype behavior

- Created `user_lab/phase4/scripts/local_fallback_handshake.sh`.
- Created `user_lab/phase4/scripts/local_fallback_handshake.py`.
- The handshake loads the 4c candidate policy, validates request shape and safety flags, rejects ineligible cases before inference, and reuses the 4d manual local fallback path for eligible cases only.

## 4. Demo results

- Canonical demo JSON: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T114723Z.json`
- Canonical demo markdown: `user_lab/phase4/reports/local_fallback_handshake_20260503T114723Z.md`
- Demo ran five synthetic cases:
- `eligible_summary`
- `eligible_code_explanation`
- `ineligible_strict_json_extraction`
- `ineligible_code_edit`
- `oversized_input`
- Demo summary:
- `5` total cases
- `2` eligible
- `3` rejected
- `2` inference calls
- Eligible demo outcomes:
- `eligible_summary` executed the local fallback path in `10917 ms` and passed its quality check
- `eligible_code_explanation` executed the local fallback path in `6943 ms` and passed its quality check
- Rejected demo outcomes:
- `ineligible_strict_json_extraction` was rejected before inference with `task_class_not_eligible`
- `ineligible_code_edit` was rejected before inference with `code_edit_not_supported`
- `oversized_input` was rejected before inference with `input_too_large`

## 5. Request-mode validation

- Eligible request JSON: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T114817Z.json`
- Eligible request markdown: `user_lab/phase4/reports/local_fallback_handshake_20260503T114817Z.md`
- The eligible request used `local_short_policy_text`, was accepted by the handshake, called the 4d local fallback path, finished in `2364 ms`, and passed its quality check.
- Rejected request JSON: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T114827Z.json`
- Rejected request markdown: `user_lab/phase4/reports/local_fallback_handshake_20260503T114827Z.md`
- The rejected request set `requiresCommandExecution: true` and was denied before inference with `command_execution_not_supported`.

## 6. Safety/rejection behavior

- The handshake rejects before inference for:
- unknown or ineligible task classes
- strict JSON requirements
- code-edit requirements
- command-execution requirements
- high-stakes tasks
- oversized inputs
- unavailable Ollama or missing `gemma4:e4b`
- All rejected cases return `recommendedFallback: "stronger_model"`.
- `routingEnabled: false` does not block manual lab execution, but it still blocks any automatic routing implication.

## 7. Files changed

- `user_lab/phase4/local_fallback_integration_contract.md`
- `user_lab/phase4/handshake_runs/.gitkeep`
- `user_lab/phase4/scripts/local_fallback_handshake.sh`
- `user_lab/phase4/scripts/local_fallback_handshake.py`
- `user_lab/phase4/experiment_4e_method.md`
- `user_lab/phase4/experiment_4e_result.md`
- `user_lab/phase4/experiment-log.md`
- Generated: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T114723Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_handshake_20260503T114723Z.md`
- Generated: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T114817Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_handshake_20260503T114817Z.md`
- Generated: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T114827Z.json`
- Generated: `user_lab/phase4/reports/local_fallback_handshake_20260503T114827Z.md`

## 8. Validation run

- Passed `bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo`
- Passed `python3 -m json.tool user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T114723Z.json`
- Passed request-mode validation for one eligible synthetic request and one rejected synthetic request
- Passed `bash user_lab/phase4/scripts/local_fallback_prototype.sh --demo` as a 4d regression check
- Passed `swift build`
- Attempted `pnpm --filter @paperclipai/server typecheck`, but it produced no output and did not complete after an extended wait, so it was interrupted
- Attempted `pnpm --filter @paperclipai/ui typecheck`, but it produced no output and did not complete after an extended wait, so it was interrupted

## 9. Keep or revert

- Keep.
- The handshake prototype is non-default, policy-gated, reversible, and useful for future operator-facing experiments without changing production routing.

## 10. Remaining unknowns

- The handshake is still a lab-only path and has not been integrated into production runtime diagnostics.
- We have not yet tested a user-confirmation loop or operator-surfaced prompt around this contract.
- We have not yet exercised a stronger-model fallback handoff after an eligible-but-low-quality local result.
- The `pnpm` typecheck commands need separate follow-up because they did not complete cleanly in this environment during 4e validation.

## 11. Recommended next experiment

- Recommend Experiment `4f`.
- The next safe step is to prototype how this explicit local fallback candidate could be surfaced through runtime diagnostics or operator tooling, while still keeping default routing unchanged and preserving the stronger-model fallback path.
