# Experiment 4a Method

## What Is Checked

- whether the `ollama` command exists
- where the `ollama` binary resolves
- whether `ollama --version` succeeds
- whether the local API responds at `http://127.0.0.1:11434`
- whether `GET /` and `GET /api/tags` succeed
- which installed model names are returned by `/api/tags`
- whether port `11434` appears to be listening
- whether an `ollama` or `Ollama` process appears to be running
- whether Docker appears to expose an Ollama-like container
- whether `OLLAMA_HOST` is present

## What Is Not Checked

- no inference requests
- no prompt submission
- no model pulls
- no model deletion
- no process start or stop
- no environment mutation
- no inspection of model files on disk

## Why No Inference Benchmark Runs Yet

- Reachability must be confirmed before any benchmark can be meaningful.
- A missing or unreachable Ollama API is a setup question, not a performance question.
- Experiment 4a keeps scope low-risk and read-only.

## Safety And Privacy Notes

- The checker stores only safe reachability signals and model metadata returned by the local Ollama API.
- No prompts, source code, auth tokens, API keys, or private documents are collected.
- Process checks are reduced to boolean presence rather than full command lines.
- `OLLAMA_HOST` is recorded only as an endpoint string when present, because host and port are operational diagnostics rather than secrets.

## How To Rerun

```bash
bash user_lab/phase4/scripts/check_ollama_reachability.sh
```
