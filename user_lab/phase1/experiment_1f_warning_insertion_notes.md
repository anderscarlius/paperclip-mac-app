# Experiment 1f Warning Insertion Notes

## 1. Where warnings can be attached with smallest diff

- The smallest stable attachment point is inside `toResult(...)` in:
  - `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`
- That function already assembles `resultJson` for successful and failed post-launch Codex runs.
- This makes it possible to attach a structured `warnings` array without changing execution control flow.

## 2. Whether `resultJson` can carry a `warnings` array

- Yes.
- `resultJson` is already a free-form record in adapter results.
- Adding:
  - `resultJson.warnings = [...]`
  is compatible with current result construction and test expectations.

## 3. Whether logs should also receive the warning

- Yes, for discoverability.
- A short `stdout` warning line is useful because:
  - it is visible during the run
  - it does not require downstream consumers to inspect structured JSON
- The warning must remain informational only and must not change behavior.

## 4. Whether full workspace paths are currently exposed

- Yes.
- Current diagnostics and run metadata already expose full workspace paths in several places, including:
  - `cwd` in adapter metadata
  - `PAPERCLIP_WORKSPACE_CWD` and related env values in logged metadata
  - session and workspace context
  - agent-visible command results such as `pwd`
- Because of that, the new warning does not need to repeat the full path.

## 5. Safest insertion point

- Safest insertion sequence:
  1. derive `cwd`
  2. classify the workspace path with a pure helper
  3. build a warning object only if:
     - `runtimeContext.modelHosting === "cloud"`
     - path risk is `medium`
  4. let auth preflight run first
  5. only if execution continues, emit one informational `stdout` warning line
  6. carry the structured warning into `resultJson.warnings`

## 6. Why this is safe

- No filesystem mutation
- No path rewriting
- No auth or provider changes
- No model routing changes
- No forced HTTP fallback
- No blocking behavior
