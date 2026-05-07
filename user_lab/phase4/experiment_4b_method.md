# Experiment 4b Method

## Why This Is Local-Only

- The benchmark talks only to the local Ollama API at `127.0.0.1:11434`.
- It uses only synthetic prompts.
- No private repository code, user secrets, or external model providers are involved.

## Tasks Included

- short summary
- classification
- small code explanation
- structured extraction
- local fallback policy writing

Each task is run twice unless the model is too slow to justify the full `2 x 5` sample.

## Metrics Captured

- duration
- HTTP status
- success/failure
- output character count
- Ollama evaluation counters and durations when returned
- approximate tokens per second when derivable
- JSON validity when applicable
- simple task-specific quality-check notes

The harness requests direct answers with `think: false` so the smoke test measures visible short-form output rather than hidden reasoning tokens that do not surface usable text.

## Quality Checks

- Summary: exactly two bullet-like lines
- Classification: valid JSON with a `classification` field
- Code explanation: about three concise sentences mentioning non-ASCII and percent detection
- Structured extraction: valid JSON with correct model and quantization
- Fallback policy: under 120 words and mentions privacy, latency, cost, and quality

## Limitations

- Small synthetic smoke benchmark only
- No private source files tested
- No cloud-model comparison
- No long-context stress test
- No routing changes or Paperclip integration changes

## How To Rerun

```bash
bash user_lab/phase4/scripts/benchmark_ollama_smoke.sh
```
