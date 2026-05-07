# Local Fallback Offer Design

## Purpose

Define the smallest useful user/operator-facing offer for the existing local fallback candidate path.

This is a product design specification only.

Automatic routing remains forbidden.

## Offer Eligibility

Paperclip may offer local fallback only if all of the following are true:

1. `localFallbackStatus === "available_candidate"`
2. task class is one of:
- `local_short_summary`
- `local_small_code_explanation`
- `local_short_policy_text`
3. input is under policy limits
4. output requirement is short
5. no strict JSON or exact schema requirement exists
6. no code edit requirement exists
7. no command execution requirement exists
8. no high-stakes domain is involved
9. the user can explicitly choose local or stronger model
10. stronger-model fallback remains available

## Do Not Offer

Do not offer local fallback for:

- repo-wide debugging
- multi-file coding
- autonomous code edit
- structured extraction
- exact classification
- security-sensitive analysis
- legal advice
- medical advice
- financial advice
- command planning
- long-context analysis
- anything where factual precision is critical

## Offer Confidence

- Current confidence level for `gemma4:e4b`: `medium`
- Do not use `high` confidence yet
- Confidence must be shown as candidate confidence, not as proof of equal capability to the stronger model

## Operator Framing

The offer should feel like a small optional lane:

- private
- free to run locally
- suitable only for short, narrow tasks
- always reversible to a stronger model path

It should not feel like a routing platform or a default model switch.

## Minimal Product Version

The smallest useful version is:

1. Show the local fallback offer only in operator/run detail or the task composer for eligible tasks.
2. Require an explicit user click.
3. Run local fallback through the existing handshake.
4. Show the local result.
5. Offer `Improve with stronger model`.
6. Keep routing disabled.
7. Log the decision locally only.

## What Should Not Be Built Yet

Do not build yet:

- global auto-routing
- model marketplace
- complex preference engine
- telemetry upload
- multi-model local comparison
- automatic local-first mode
- broad settings redesign
- hidden silent fallback

## Decision Gate Before Runtime Integration

A future integration experiment may proceed only if all of the following remain true:

1. status remains `available_candidate`
2. handshake demo still passes
3. user-facing copy is accepted
4. local result quality remains acceptable for eligible classes
5. stronger-model fallback is available
6. no production route is changed by default
7. operator can disable or ignore the offer

## Product Decision

Recommended product direction:

- Manual local option for eligible tasks, visible to the operator or user, with clear fallback to a stronger model.

Not recommended:

- Automatic model routing across all Paperclip tasks.
