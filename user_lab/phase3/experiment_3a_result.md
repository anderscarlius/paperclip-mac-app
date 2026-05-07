# Experiment 3a Result

## 1. Objective

- Create the first read-only baseline profiler for the user's local AI and development environment.

## 2. What was implemented

- Added a Phase 3 folder with read-only profiling scripts and documentation.
- Added a shell entrypoint that generates timestamped JSON and markdown outputs.
- Added a Python profiler that gathers safe local environment signals and degrades gracefully when tools are absent.
- Added local-only validation that checks required top-level JSON keys, report generation, and that watched secret env var values are not written into outputs.

## 3. Data collected

- System summary:
  - macOS `26.3.1`
  - Apple Silicon `arm64`
  - machine model `Mac16,12`
  - CPU `Apple M4`
  - 10 CPU cores reported through hardware-profile fallback
  - 32 GB memory
  - about 123.6 GB free disk on the repo volume at the final run
- Repo path classification:
  - contains spaces
  - contains non-ASCII
  - contains decomposed Unicode
  - risk level `medium`
- Local AI stack:
  - Ollama installed, client version `0.21.2`
  - Ollama not reachable during profiling, so no model names were available
  - no LM Studio / Open WebUI / llama.cpp / Python transformers detected
  - Metal availability inferred on Apple Silicon
- Dev stack:
  - git, Swift, node, pnpm, npm, python3, poetry, cargo, rustc detected
  - Docker installed and running
  - VS Code and Cursor detected
- External LLM configuration presence:
  - no watched API-key env vars present in the current shell
  - no watched base-URL env vars present in the current shell
- Paperclip runtime signals from lab artifacts:
  - last known provider `openai`
  - last known `modelHosting` `cloud`
  - `modelInfo` appears in recent artifacts
  - warnings appear in recent artifacts

## 4. Data explicitly not collected

- API key values
- token values
- source file contents
- personal document contents
- browser data
- credentials and SSH keys

## 5. Generated files

- Canonical validated profile:
  - `user_lab/phase3/profiles/environment_profile_20260502T194254Z.json`
  - `user_lab/phase3/reports/environment_baseline_20260502T194254Z.md`
- Earlier local iterations retained as artifacts:
  - `user_lab/phase3/profiles/environment_profile_20260502T193948Z.json`
  - `user_lab/phase3/reports/environment_baseline_20260502T193948Z.md`
  - `user_lab/phase3/profiles/environment_profile_20260502T194102Z.json`
  - `user_lab/phase3/reports/environment_baseline_20260502T194102Z.md`

## 6. Validation run

- Passed:
  - `bash user_lab/phase3/scripts/profile_environment.sh`
  - `python3 -m json.tool user_lab/phase3/profiles/environment_profile_20260502T194254Z.json`
  - `swift build`
  - `pnpm --filter @paperclipai/server typecheck`
  - `pnpm --filter @paperclipai/ui typecheck`

## 7. Result

- Success.
- Experiment 3a produced a read-only local environment baseline with JSON + markdown outputs, captured useful environment facts without collecting secret values, and degraded gracefully where the machine did not expose everything directly.

## 8. Keep or revert

- Keep.
- Reason:
  - read-only
  - low-risk
  - useful baseline for Phase 3 optimization work
  - no runtime behavior changes
  - validation passed

## 9. Remaining unknowns

- Ollama is installed but was not reachable during profiling, so this baseline cannot yet say which local models are currently available.
- Docker was running, but the lightweight server-version query still returned `unknown`.
- Metal support was inferred from Apple Silicon rather than extracted directly from `system_profiler`.
- The absence of watched LLM env vars reflects the current shell/session only; it does not prove they are absent from all user launch contexts.

## 10. Recommended next experiment

- Experiment 3b: controlled Paperclip latency baseline on the current repo path versus an ASCII-only comparison workspace, with startup timing, warning incidence, and first-useful-output timing captured side by side.
