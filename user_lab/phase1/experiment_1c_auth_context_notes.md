# Experiment 1c Auth Context Notes

## Auth presence

- `~/.codex/auth.json` exists and is readable.
- Auth presence was confirmed by structure only, not by printing any token values.
- The auth file contains expected high-level keys for a signed-in Codex environment, including token-related structure and auth mode metadata.

## Cloud/runtime expectations before run

- `~/.codex/config.toml` reports a cloud model configuration:
  - `model = "gpt-5.4"`
  - `model_reasoning_effort = "medium"`
- The trusted project list in the same config includes the Paperclip Desktop repo path:
  - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
- The repo path being tested contains:
  - spaces
  - Swedish `ä` represented in decomposed form

## Workspace-path shape

- Current repo path:
  - `/Users/anderscarlius/SynologyDrive/Hemmabasen/Datorer och nätverk/PaperclipApp`
- A quick normalization check showed:
  - NFC equality: `false`
  - NFD equality: `true`
- This means the live workspace path already reproduces the decomposed-Unicode path class of interest.

## Expected preflight outcome

- Experiment 1a preflight should not fail here because the run uses the user’s normal authenticated `HOME` rather than an isolated temp `HOME`.
- Expected runtime context before execution:
  - `execution_runtime: local`
  - `model_hosting: cloud`
  - `provider: openai`
  - `biller: chatgpt`
  - `billing_type: subscription`
- `model` may still surface as `unknown` from the adapter-side runtime context, even when `~/.codex/config.toml` names a cloud model.
