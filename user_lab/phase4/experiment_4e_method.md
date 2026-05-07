# Experiment 4e Method

## 1. Why This Is A Handshake And Not Routing

- This experiment defines an explicit opt-in handoff path for the existing local fallback prototype.
- It does not change Paperclip production routing.
- `routingEnabled: false` remains in force, and manual execution is allowed only for lab validation.

## 2. Contract Shape

- The handshake accepts a structured request describing task class, input, safety flags, and whether the user explicitly requested local execution.
- The handshake returns either:
- an eligible response that records manual local fallback execution through the 4d prototype, or
- a rejection response with a stronger-model recommendation.

## 3. Eligible Offer Rules

- task class must be in the 4c eligible list
- input must fit the policy limit
- requested output budget must fit the policy limit
- Ollama must be reachable
- `gemma4:e4b` must be installed
- the user must explicitly request or confirm local execution
- a privacy or local-only benefit must be present
- the task must not require strict JSON, code edits, command execution, or a high-stakes domain

## 4. Must-Not-Offer Rules

- strict JSON or exact schema work
- structured extraction
- multi-file coding or repo-wide analysis
- autonomous code edits
- command execution planning
- high-stakes legal, medical, or financial tasks
- long-context or high-precision tasks

## 5. Demo Cases

- eligible summary
- eligible code explanation
- ineligible strict JSON extraction
- ineligible code edit
- oversized input

## 6. Safety Constraints

- synthetic input only
- no automatic routing
- no private repository data
- no command execution planning by the local model
- reject before inference whenever the request violates policy gates

## 7. How To Run

Demo mode:

```bash
bash user_lab/phase4/scripts/local_fallback_handshake.sh --demo
```

Request mode:

```bash
bash user_lab/phase4/scripts/local_fallback_handshake.sh --request path/to/request.json
```

## 8. What Success Means

- The integration contract is documented.
- Eligible requests can reuse the 4d manual local fallback path.
- Ineligible requests are rejected before inference.
- Routing remains disabled.
- Structured JSON and markdown artifacts are generated for demo or request mode.
