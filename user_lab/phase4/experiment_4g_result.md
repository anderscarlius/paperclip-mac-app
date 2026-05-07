# Experiment 4g Result

## 1. Objective

- Design the user/operator-facing offer flow for local fallback without changing runtime behavior or enabling automatic routing.

## 2. Product design summary

- Created:
- `user_lab/phase4/local_fallback_offer_design.md`
- `user_lab/phase4/local_fallback_offer_copy.md`
- `user_lab/phase4/local_fallback_offer_flow.md`
- `user_lab/phase4/local_fallback_ui_contract.md`
- The recommended product direction is a small manual offer:
- visible only for eligible tasks
- explicitly chosen by the user or operator
- always paired with a stronger-model fallback
- never framed as default routing

## 3. Offer eligibility

- Offer local fallback only if:
- `localFallbackStatus === "available_candidate"`
- task class is `local_short_summary`, `local_small_code_explanation`, or `local_short_policy_text`
- input stays within policy limits
- output is short
- no strict JSON, code edit, command execution, or high-stakes requirement exists
- stronger-model fallback remains available
- Current offer confidence is `medium`
- Automatic routing remains forbidden

## 4. User-facing copy summary

- Added calm, non-technical copy for:
- eligible offer
- local candidate badge
- after local result
- low-confidence local result
- not eligible
- Ollama unavailable
- privacy-focused offer
- The core framing is:
- private and free to run locally
- less capable than the cloud model
- always reversible to a stronger model

## 5. Flow summary

- Defined four flows in `local_fallback_offer_flow.md`:
- eligible manual offer
- ineligible task
- local failure
- future user preference
- The stronger model remains the normal and trusted fallback path in every flow.

## 6. UI/API contract summary

- Added a minimal offer contract, local result contract, and rejected-offer contract in `local_fallback_ui_contract.md`
- The contract preserves:
- `routingEnabled: false`
- explicit `run_locally` vs `use_stronger_model` actions
- local candidate framing instead of default-model framing
- a rule that local candidate model must never be confused with resolved cloud model

## 7. Minimal product version

- Recommended MVP:
- show the local fallback offer only in operator/run detail or the task composer
- require explicit user click
- run through the existing handshake
- show the local result
- offer `Improve with stronger model`
- keep routing disabled
- log the decision locally only

## 8. What explicitly should not be built yet

- Do not build yet:
- global auto-routing
- model marketplace
- complex preference engine
- telemetry upload
- multi-model local comparison
- automatic local-first mode
- broad settings redesign

## 9. Validation run

- Passed `python3 -m json.tool user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json`
- Passed `bash user_lab/phase4/scripts/local_fallback_status.sh`
- Passed `bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo`
- Passed `bash user_lab/phase4/scripts/run_validation_with_timeout.sh --commands minimal --timeout 300`
- Fresh validation artifacts:
- status JSON: `user_lab/phase4/status/local_fallback_status_20260503T125923Z.json`
- status markdown: `user_lab/phase4/reports/local_fallback_status_20260503T125923Z.md`
- handshake JSON: `user_lab/phase4/handshake_runs/local_fallback_handshake_20260503T125923Z.json`
- handshake markdown: `user_lab/phase4/reports/local_fallback_handshake_20260503T125923Z.md`
- minimal validation JSON: `user_lab/phase4/validation/validation_run_20260503T130150Z.json`
- minimal validation markdown: `user_lab/phase4/reports/validation_run_20260503T130150Z.md`
- Validation outcome:
- `localFallbackStatus` remained `available_candidate`
- minimal validation command set passed `3/3`
- no production routing change was introduced

## 10. Keep or revert

- Keep.
- This experiment adds only design and contract artifacts plus a lightweight validation trace.
- It narrows the future implementation scope instead of broadening it.

## 11. Remaining unknowns

- No user-tested UI copy review has happened yet.
- No actual UI implementation has been built yet.
- The local offer still depends on the current Ollama/model availability and existing handshake behavior.
- Broad repo validation remains separate from this design decision and is not required to proceed to a narrow UI prototype.

## 12. Recommended next experiment

- Recommend Experiment `4h`.
- The next safe step is a small operator-facing UI prototype or mock surface that implements only the MVP offer:
- eligible offer card or badge
- explicit local run button
- explicit stronger-model fallback
- no automatic routing
