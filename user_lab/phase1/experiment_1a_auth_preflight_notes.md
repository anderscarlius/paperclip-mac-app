# Experiment 1a Auth Preflight Notes

## 1. How does `execute.ts` know cloud vs local?

- `execute.ts` resolves a provider with `resolveCodexProvider(...)`.
- It then derives `modelHosting` inside `buildRuntimeContext(...)`.
- Providers such as `ollama`, `lmstudio`, `llamacpp`, and `local` are treated as local-hosted.
- Everything else currently falls into the cloud-hosted path.

## 2. Where does auth/session data enter?

- API-key auth enters through `OPENAI_API_KEY` in adapter env or inherited process env.
- Native Codex login state enters through `auth.json` inside the effective `CODEX_HOME`.
- The effective `CODEX_HOME` is resolved and prepared before command execution.
- Session resume data is separate and comes from `runtime.sessionParams` / `runtime.sessionId`.

## 3. What currently happens if auth is missing?

- Before this experiment, `execute.ts` would still launch Codex.
- Missing auth was only discovered downstream through websocket / HTTP retries and parsed CLI failure output.
- This created slow and noisy failures for cloud-hosted runs.

## 4. Where is the safest preflight insertion point?

- After effective runtime env and effective `CODEX_HOME` are known.
- After the cloud/local runtime context has been derived.
- Before `runAttempt(...)` starts any Codex subprocess execution.
- This keeps the guard narrow, preserves local-hosted runs, and avoids websocket / HTTP retry noise when auth is clearly absent.
