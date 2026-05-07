# Experiment 1h User Impact Review

## 1. What does the user experience today?

- For affected non-ASCII/decomposed Unicode workspace paths, cloud-hosted `codex_local` runs can show websocket/header diagnostics during startup.
- Paperclip now warns the user before the run continues when the path class is medium-risk.
- The run still proceeds and may complete successfully through HTTP fallback.

## 2. Does the task still complete?

- Yes, in the authenticated cloud-hosted reproductions captured so far.
- Experiment 1c completed successfully after websocket failure and HTTP fallback.
- Experiment 1d showed both the non-ASCII and ASCII runs completing successfully, with the difference being latency and diagnostics.

## 3. How much latency overhead was observed?

Observed artifact values:

- Experiment 1d non-ASCII run:
  - `27,529 ms`
- Experiment 1d ASCII run:
  - `15,788 ms`
- Difference:
  - about `11,741 ms` slower on the non-ASCII path
- Experiment 1a no-auth baseline before preflight:
  - about `14.8 s`
- Experiment 1a after auth preflight:
  - `4 ms`

Interpretation:

- The current path-class issue adds noticeable latency, but much less than the old no-auth failure path that 1a removed.
- The warning-first mitigation helps explain the latency but does not reduce it.

## 4. How noisy are logs?

- Moderately noisy for affected runs.
- The non-ASCII authenticated run shows repeated:
  - `x-codex-turn-metadata` UTF-8/header conversion errors
  - reconnect-loop messages
  - HTTP fallback notices
- This is meaningful diagnostic noise, not silent degradation.

## 5. Does the warning help?

- Yes.
- The warning improves user understanding before the noisy startup path happens.
- It sets an honest expectation:
  - the run may still work
  - startup may be slower
  - logs may contain connection warnings

## 6. Is stronger mitigation justified now?

- Not yet.
- Current evidence supports warning-first mitigation because:
  - tasks still complete
  - Paperclip does not yet have a proven low-risk local workaround
  - stronger options such as normalization or shadow workspaces carry meaningful safety risk

## 7. What evidence would justify stronger mitigation later?

- Higher user impact than currently observed, such as:
  - tasks failing outright instead of completing
  - repeated user confusion despite the warning
  - materially worse latency in broader real usage
  - a verified supported Codex flag/config to avoid websocket/prewarm safely
  - proof that Paperclip directly controls the failing metadata payload and can sanitize it safely

## Conclusion

- The user impact is real but not severe enough yet to justify risky local path workarounds.
- Warning-first mitigation is proportionate for now.
