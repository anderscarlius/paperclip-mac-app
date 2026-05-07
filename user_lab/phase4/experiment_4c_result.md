# Experiment 4c Result

## 1. Objective

- Define a narrow, truthful local fallback candidate policy for `gemma4:e4b` without changing actual Paperclip routing.

## 2. Evidence used from 4b

- Model: `gemma4:e4b`
- Source experiment: `4b`
- Run count: `10`
- Success rate: `10 / 10`
- Quality pass rate: `6 / 10`
- Median duration: `5147 ms`
- Median tokens/sec: `16.94`
- Suitable task classes from the benchmark: short summarization, small code explanation, short local recommendation or policy text
- Not suitable from the benchmark: strict JSON classification and structured extraction
- Important benchmark note: `think: false` materially improved visible output quality

## 3. Policy created

- Human-readable policy: `user_lab/phase4/local_fallback_policy_gemma4_e4b.md`
- Machine-readable config stub: `user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json`
- Status: `candidate`
- Routing enabled: `false`

## 4. Eligible task classes

- `local_short_summary`
- `local_small_code_explanation`
- `local_short_policy_text`

These remain intentionally narrow and capped by small input and output budgets.

## 5. Ineligible task classes

- strict JSON extraction
- classification requiring exact schema
- structured extraction
- multi-file coding
- repo-wide analysis
- security analysis
- financial, legal, or medical advice
- external provider routing decisions
- long-context summarization
- autonomous code edits
- command execution planning
- anything requiring high factual precision

## 6. Guardrails

- local-only privacy benefit label required
- explicit task class match required
- maximum input and output size required
- no strict JSON requirement allowed
- user-visible confidence required
- fallback to a stronger model on low confidence or malformed output
- no automatic code edits
- benchmark-aligned recommended options recorded as `temperature: 0.1` and `think: false`

## 7. Files changed

- `user_lab/phase4/local_fallback_policy_gemma4_e4b.md`
- `user_lab/phase4/configs/.gitkeep`
- `user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json`
- `user_lab/phase4/experiment_4c_result.md`
- `user_lab/phase4/experiment-log.md`

## 8. Validation run

- Passed `python3 -m json.tool user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json`
- Passed `swift build`
- Passed `pnpm --filter @paperclipai/server typecheck`
- Passed `pnpm --filter @paperclipai/ui typecheck`

## 9. Keep or revert

- Keep.
- The policy is evidence-based, routing remains disabled, and no runtime behavior changed.

## 10. Remaining unknowns

- The policy is based only on a small synthetic local benchmark.
- No private repository workflows were tested.
- No cloud comparison or cost comparison was performed.
- The practical behavior of `think: false` may differ across future code paths unless revalidated.
- Actual routing outcomes remain untested because 4c intentionally stopped at policy design.

## 11. Recommended next experiment

- Recommend Experiment `4d`.
- The next safe step is to test an optional, non-default local fallback prototype against only the eligible task classes defined here.
