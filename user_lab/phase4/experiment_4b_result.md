# Experiment 4b Result

## 1. Objective

- Measure whether the local Ollama model `gemma4:e4b` is suitable for a small set of low-risk synthetic Paperclip-like tasks.

## 2. Model tested

- Tested model: `gemma4:e4b`
- Verified via local Ollama `/api/tags` before benchmark
- Model metadata at benchmark time:
- family: `gemma4`
- parameter size: `8.0B`
- quantization: `Q4_K_M`
- size: `9608350718` bytes
- The final harness used direct-answer mode with `think: false` after an earlier probe showed that the model could otherwise spend its token budget on empty visible responses.

## 3. Run count

- `2` runs per task
- `5` tasks
- `10` total local benchmark runs completed

## 4. Aggregate performance

- Canonical benchmark JSON: `user_lab/phase4/benchmarks/ollama_smoke_20260503T084240Z.json`
- Canonical benchmark markdown: `user_lab/phase4/reports/ollama_smoke_20260503T084240Z.md`
- All `10 / 10` runs completed successfully
- Aggregate median duration: `5147 ms`
- Aggregate mean duration: `5211.8 ms`
- Aggregate median tokens/sec: `16.94`
- Aggregate mean tokens/sec: `18.27`
- Aggregate quality passes: `6 / 10`

## 5. Quality results

- Short summary: `2 / 2` quality passes
- Classification: `0 / 2` quality passes
- Small code explanation: `2 / 2` quality passes
- Structured extraction: `0 / 2` quality passes
- Local fallback policy: `2 / 2` quality passes
- The main failure mode was strict format obedience rather than total non-responsiveness:
- classification outputs used fenced JSON and chose `model_observability_problem` instead of the expected `local_model_problem`
- structured extraction outputs wrapped valid-looking JSON in code fences instead of returning raw JSON only

## 6. Suitability assessment

- Short summarization: `suitable`
- Simple classification: `not_suitable`
- Small code explanation: `suitable`
- Structured extraction: `not_suitable`
- Local fallback policy writing: `suitable`
- Recommended Paperclip use from this small benchmark:
- suitable for privacy-sensitive local summaries
- suitable for very small local code explanations
- suitable for drafting short local recommendation or policy text
- not yet suitable for strict JSON-only task contracts in its current prompt/configuration shape
- not yet proven for complex coding changes, long-context work, or as a general default model

## 7. Files changed

- `user_lab/phase4/scripts/benchmark_ollama_smoke.sh`
- `user_lab/phase4/scripts/benchmark_ollama_smoke.py`
- `user_lab/phase4/experiment_4b_method.md`
- `user_lab/phase4/experiment_4b_result.md`
- `user_lab/phase4/experiment-log.md`
- Generated: `user_lab/phase4/benchmarks/ollama_smoke_20260503T084240Z.json`
- Generated: `user_lab/phase4/reports/ollama_smoke_20260503T084240Z.md`

## 8. Validation run

- Passed `bash user_lab/phase4/scripts/benchmark_ollama_smoke.sh`
- Passed `python3 -m json.tool user_lab/phase4/benchmarks/ollama_smoke_20260503T084240Z.json`
- Passed `swift build`
- Passed `pnpm --filter @paperclipai/server typecheck`
- Passed `pnpm --filter @paperclipai/ui typecheck`

## 9. Keep or revert

- Keep.
- The harness is read-only, local-only, and gives a truthful first benchmark baseline for the detected Ollama model.

## 10. Remaining unknowns

- This was a small synthetic smoke benchmark only.
- No private repository code was tested.
- No cloud comparison was performed.
- No long-context or multi-file coding task was tested.
- Routing behavior remains unchanged.
- The model may perform differently under other prompting styles; in particular, direct-answer mode mattered materially for visible output quality.

## 11. Recommended next experiment

- Recommend Experiment 4c.
- The natural next step is to test whether Paperclip can consume this local model through a narrow, truthfully-labeled local fallback path for only the task classes that looked suitable here.
