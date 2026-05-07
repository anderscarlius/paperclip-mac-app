# Experiment 4d Method

## Why This Is A Prototype

- This experiment demonstrates a possible local fallback mechanism without touching production routing.
- It is manual, opt-in, policy-gated, and reversible.
- It exists to test enforcement behavior, not to enable local fallback globally.

## Why Routing Remains Disabled

- The 4c policy explicitly marks `gemma4:e4b` as a candidate rather than a default route.
- `routingEnabled: false` means no automatic integration into Paperclip runtime behavior.
- Manual lab execution is allowed so we can test the mechanism safely.

## Eligible Task Classes

- `local_short_summary`
- `local_small_code_explanation`
- `local_short_policy_text`

All other task classes are rejected before any Ollama call.

## Rejection Behavior

- Reject ineligible task classes with `errorType: task_class_not_eligible`
- Reject oversized inputs with `errorType: input_too_large`
- Reject missing or unreachable local model with `errorType: local_model_unavailable`
- Do not call Ollama for rejected task classes or oversized inputs

## Safety Constraints

- local-only Ollama API only
- no private repo files
- no command planning
- no autonomous code edits
- no automatic routing changes
- no model pull or service start/stop

## How To Run Demo Mode

```bash
bash user_lab/phase4/scripts/local_fallback_prototype.sh --demo
```

## How To Run A Manual Task

```bash
bash user_lab/phase4/scripts/local_fallback_prototype.sh \
  --task-class local_short_summary \
  --input "Paperclip is a local AI desktop environment that helps inspect repositories and optimize AI workflows."
```

Optional:

```bash
--word-limit 120
```

This only applies to `local_short_policy_text` and will be capped by the policy max output size.

## How To Interpret Results

- `ok: true` means the manual prototype ran and returned a model output.
- `qualityCheck.passed` means the simple smoke check passed for that task class.
- `routingEnabled: false` remains the key guardrail: the prototype is not production routing.
