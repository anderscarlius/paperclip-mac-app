# Local Fallback Offer Copy

## State A — Eligible Offer

Short version:

```text
Run locally instead?
This task looks suitable for your local model. It keeps data on this Mac and avoids cloud cost, but quality may be lower.
```

Buttons:

```text
Run locally
Use stronger model
Cancel
```

## State B — Local Candidate Badge

```text
Local fallback candidate · Medium confidence
```

Tooltip:

```text
Best for short summaries, small code explanations, and short internal drafts. Not recommended for complex coding, strict JSON, or high-stakes work.
```

## State C — After Local Result

```text
Completed locally with gemma4:e4b.
```

Actions:

```text
Use stronger model instead
Retry locally
Accept result
```

## State D — Local Result Low Confidence

```text
The local result may be incomplete or low confidence.
```

Actions:

```text
Improve with stronger model
Retry locally
Accept anyway
```

## State E — Not Eligible

```text
This task is not suitable for the current local model.
Use a stronger model for better reliability.
```

## State F — Ollama Unavailable

```text
Local model is currently unavailable.
Open Ollama or use a stronger model.
```

## State G — Privacy-Focused Offer

```text
This looks like a good local-only task. Running locally keeps the input on this Mac.
```

## Copy Principles

- Keep copy calm and clear
- Avoid technical jargon unless it helps the operator
- Never imply the local model is equally capable as the stronger model
- Always preserve the stronger-model option
