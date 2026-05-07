# Local Fallback Policy for `gemma4:e4b`

## 1. Model Summary

- Model name: `gemma4:e4b`
- Provider/runtime: `ollama`
- Local endpoint: `http://127.0.0.1:11434`
- Family: `gemma4`
- Parameter size: `8.0B`
- Quantization: `Q4_K_M`
- Approximate size: `9.6 GB`
- Benchmark source: Experiment `4b`
- Benchmark date: `2026-05-03`

## 2. Evidence Summary

- Run count: `10`
- Success rate: `10 / 10`
- Median duration: `5147 ms`
- Median tokens/sec: `16.94`
- Quality pass rate: `6 / 10`
- Per-task suitability:
- `local_short_summary`: suitable
- `local_small_code_explanation`: suitable
- `local_short_policy_text`: suitable
- strict JSON classification: not suitable
- structured extraction: not suitable

## 3. Suitable Task Classes

Candidate only.

### `local_short_summary`

Use for:

- short summaries under a small context budget
- privacy-sensitive notes
- local-only draft summaries

Constraints:

- not for legal, medical, financial, or other high-stakes summaries
- not for long-context document analysis
- not for repo-wide or multi-file summarization

### `local_small_code_explanation`

Use for:

- explaining small code snippets
- describing simple helper functions
- local-only code comments or notes

Constraints:

- not for multi-file debugging
- not for code changes
- not for security-sensitive review
- not for architecture-wide reasoning

### `local_short_policy_text`

Use for:

- short local policy drafts
- local recommendation text
- internal notes under roughly `120–200` words

Constraints:

- not for final high-impact user-facing decisions without review
- not for contractual, compliance, legal, or security policy output

## 4. Not Eligible Task Classes

- strict JSON extraction
- classification requiring exact schema
- structured data extraction
- multi-file coding
- repo-wide analysis
- security analysis
- financial, legal, or medical advice
- external provider routing decisions
- long-context summarization
- autonomous code edits
- command execution planning
- anything requiring high factual precision

## 5. Required Prompt Settings

Recommended benchmark-aligned options:

```json
{
  "temperature": 0.1,
  "think": false
}
```

Observed benchmark note:

- `think: false` materially improved visible output quality versus earlier empty visible responses.
- If `think: false` is not supported in a future runtime path, this policy should not assume equivalent behavior without revalidation.

## 6. Guardrails

Future routing must include:

- a local-only privacy benefit label
- explicit task class match
- max input size gate
- max output size gate
- no strict JSON requirement
- user-visible confidence
- fallback to a stronger model on low confidence or malformed output
- no automatic code edits

## 7. Decision

Candidate for narrow local fallback, not default route.
