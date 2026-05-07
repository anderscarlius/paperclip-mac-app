# Target Workflow

## Workflow Selected

User asks Paperclip to analyze and diagnose a bug in a local repo.

## Step-by-Step User Journey

1. User opens the local Paperclip Desktop repository.
2. User asks Paperclip to inspect a runtime-related file and identify a likely bug or UX weakness.
3. Paperclip chooses the `codex_local` runtime path.
4. Paperclip builds the Codex prompt, injects runtime context, and prepares managed `CODEX_HOME`.
5. Paperclip launches Codex against the local workspace.
6. Codex attempts execution and returns a result or failure.
7. Paperclip surfaces logs, runtime details, and outcome back to the user.

## Ideal Flow

1. The user prompt is accepted immediately with no credential ambiguity.
2. Runtime context is injected in a compact, trustworthy way.
3. The selected model, provider, and local/cloud mode are explicit before the model starts.
4. Codex begins useful reasoning quickly and returns a concrete diagnosis.
5. Any failure is short, actionable, and attributed to the correct layer.

## Where Runtime Context Should Matter

- Before execution: to clarify whether the run is local execution with local model hosting or local execution with cloud model hosting.
- During execution: to influence how the agent reasons about auth, network expectations, and model-specific behavior.
- In the result: to let the user understand which provider/model actually handled the request.
- In failure reporting: to make it obvious whether the failure belongs to credentials, model routing, or local runtime setup.
