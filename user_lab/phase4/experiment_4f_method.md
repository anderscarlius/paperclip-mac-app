# Experiment 4f Method

## 1. Why Operator Status Is Useful

- Phase 4 now has enough local-fallback artifacts that an operator needs a single read-only status view instead of checking multiple benchmark, prototype, and handshake files by hand.
- The operator status report makes current readiness easier to inspect without changing routing behavior.

## 2. Why Automatic Routing Remains Disabled

- The local fallback path is still limited to a narrow candidate policy for `gemma4:e4b`.
- Benchmark evidence remains synthetic and incomplete for higher-risk or high-precision tasks.
- This experiment surfaces status only; it does not integrate local fallback into production routing.

## 3. What Artifacts Are Summarized

- `user_lab/phase4/configs/local_fallback_policy.gemma4-e4b.json`
- newest Ollama reachability profile
- newest Ollama smoke benchmark
- newest local fallback prototype demo artifact
- newest local fallback handshake demo artifact

## 4. How Status Is Classified

- `available_candidate` when Ollama is reachable, `gemma4:e4b` is detected, the policy exists with `status: candidate`, routing remains disabled, and at least one benchmark or prototype artifact exists
- `degraded` when the policy exists but Ollama or the model is missing
- `incomplete` when key artifacts are missing
- `unavailable` when Ollama is not reachable and no local fallback evidence exists

## 5. Why Validation Timeout Hygiene Was Added

- Experiment 4e showed that `pnpm --filter ... typecheck` can hang without output.
- The timeout wrapper prevents indefinite waits, records timeouts explicitly, and keeps validation evidence honest.

## 6. How To Rerun Status And Validation

Status:

```bash
bash user_lab/phase4/scripts/local_fallback_status.sh
```

Validation:

```bash
bash user_lab/phase4/scripts/run_validation_with_timeout.sh
```

Override timeout:

```bash
bash user_lab/phase4/scripts/run_validation_with_timeout.sh --timeout 300
```
