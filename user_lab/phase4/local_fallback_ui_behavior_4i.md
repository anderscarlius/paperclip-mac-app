# Local Fallback UI Behavior 4i

## State 1 — Candidate Available

Show the offer card only when:

- candidate signal exists
- `available === true`
- task class is known and eligible
- routing remains disabled

Required wording:

```text
Run locally instead?
```

Show:

- model
- runtime
- confidence
- privacy/cost note
- quality warning
- routing disabled

## State 2 — Local Fallback Available But Task Class Unknown

Show a diagnostic-only card:

```text
Local fallback is available for some small tasks, but this run has not been classified as eligible.
```

Rules:

- do not show `Run locally`
- keep `Use stronger model` visible
- keep `Cancel` visible
- label lab/demo origin clearly if a lab fixture is used

## State 3 — Local Fallback Unavailable

Do not show the offer card by default.

Optional developer/operator diagnostic:

```text
Local fallback unavailable.
```

## State 4 — Demo/Lab Fixture

If a lab fixture is used, label it clearly:

```text
Lab preview
```

Rules:

- never make lab preview look like production eligibility
- never imply automatic routing is enabled
- never imply local inference is being run from the UI
