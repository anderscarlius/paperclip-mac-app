# Local Fallback Offer Flow

## Flow 1 — Eligible Manual Offer

1. User enters a task.
2. Paperclip classifies the task or receives a task class from upstream diagnostics.
3. The local fallback handshake checks policy and local readiness.
4. UI shows the local option only if the handshake says the task is eligible.
5. User chooses one of:
- `Run locally`
- `Use stronger model`
- `Cancel`
6. If the user chooses local:
- run local fallback
- show the local result
- offer stronger-model follow-up

## Flow 2 — Ineligible Task

1. Task fails a policy gate.
2. No local offer is shown, or a muted diagnostic explains why.
3. Stronger model remains the normal path.

## Flow 3 — Local Failure

1. Local model is unavailable, times out, or returns malformed or weak output.
2. UI shows a calm failure or low-confidence state.
3. User can choose the stronger model immediately.

## Flow 4 — User Preference

Do not build a full preference system yet.

Future setting only:

```text
Offer local fallback for eligible tasks: on/off
```

Default should remain off or conservative until real UI integration is proven.

## Stronger-Model Follow-Up

After any local result, the user should still be able to:

- accept the result
- retry locally
- improve with stronger model

The stronger model remains the trusted default lane whenever the user wants higher confidence.
