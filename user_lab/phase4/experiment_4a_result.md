# Experiment 4a Result

## 1. Objective

- Establish a safe baseline for Ollama client detection, API reachability, installed model visibility, and next-step guidance without starting or modifying the local service.

## 2. What was implemented

- Created a Phase 4 Ollama reachability checker with shell entrypoint and Python collector in `user_lab/phase4/scripts/check_ollama_reachability.sh` and `user_lab/phase4/scripts/check_ollama_reachability.py`.
- Made `/api/tags` the primary health check.
- Added `lsof`-based port classification to distinguish whether port `11434` is unbound, bound by Ollama, or bound by some other process.
- Added fallback parsing for `ollama list` if direct API evidence is inconclusive.
- Generated timestamped JSON and markdown outputs under `user_lab/phase4/profiles` and `user_lab/phase4/reports`.

## 3. Ollama client result

- `ollama` command detected at `/usr/local/bin/ollama`
- Version command succeeded with exit code `0`
- Detected client version output: `ollama version is 0.21.2`

## 4. Ollama API result

- `GET http://127.0.0.1:11434/api/tags` succeeded
- `GET http://127.0.0.1:11434/` succeeded
- Both endpoints returned HTTP `200`
- Ollama should now be treated as reachable in this environment

## 5. Installed model result

- Detected local model: `gemma4:e4b`
- Family: `gemma4`
- Parameter size: `8.0B`
- Quantization: `Q4_K_M`
- Size: `9608350718` bytes
- Modified at: `2026-04-09T22:26:44.718594821+02:00`
- Paperclip can safely detect local model availability from the current Ollama API response shape

## 6. Failure classification

- Correct classification: `api_reachable_models_detected`
- The earlier `client_installed_api_unreachable` result should be treated as stale or insufficiently classified, because the follow-up run confirmed live API reachability and model presence
- Service clues aligned with that result:
- port `11434` listening: `true`
- port binding classification: `port_bound_by_ollama`
- listener name: `ollama`
- process running: `true`

## 7. Recommended manual action

- No corrective manual action is required to make Ollama reachable, because it is already reachable.
- The next minimal action is to proceed to Experiment 4b for a lightweight local model smoke benchmark or inventory pass.

## 8. Files changed

- `user_lab/phase4/README.md`
- `user_lab/phase4/experiment-log.md`
- `user_lab/phase4/experiment_4a_method.md`
- `user_lab/phase4/experiment_4a_result.md`
- `user_lab/phase4/scripts/check_ollama_reachability.sh`
- `user_lab/phase4/scripts/check_ollama_reachability.py`
- Generated: `user_lab/phase4/profiles/ollama_reachability_20260503T081514Z.json`
- Generated: `user_lab/phase4/reports/ollama_reachability_20260503T081514Z.md`

## 9. Validation run

- Passed `bash user_lab/phase4/scripts/check_ollama_reachability.sh`
- Passed `python3 -m json.tool user_lab/phase4/profiles/ollama_reachability_20260503T081514Z.json`
- Passed `swift build`
- Passed `pnpm --filter @paperclipai/server typecheck`
- Passed `pnpm --filter @paperclipai/ui typecheck`

## 10. Keep or revert

- Keep.
- The checker is read-only, low-risk, and now produces a more accurate classification of the local Ollama state.

## 11. Remaining unknowns

- This experiment did not run any inference, so throughput and first-token behavior remain unknown.
- `ollama list` fallback was not needed once direct API access succeeded.
- No Paperclip runtime routing changes have been tested against this local model yet.

## 12. Recommended next experiment

- Recommend Experiment 4b: lightweight local model smoke benchmark.

## 4a Follow-up: Corrected Ollama Reachability

Manual evidence:
- `ollama serve` reported port already in use
- `/api/tags` returned a model list
- `gemma4:e4b` was detected

Corrected classification:
- `api_reachable_models_detected`

Next step:
- Experiment 4b: lightweight local model smoke benchmark
