# Experiment 1b Result

## 1. Problem investigated

- Experiment 1b investigated whether `codex_local` fails or behaves differently when the workspace path contains spaces, Swedish characters, percent-like text, or decomposed Unicode.
- The goal was to isolate path/header behavior from the auth behavior already handled in Experiment 1a.

## 2. Hypothesis

- Initial hypothesis: a non-ASCII or encoded-looking workspace path might be handled unsafely somewhere in the `codex_local` execution path and contribute to the previously observed websocket/header noise.
- Null hypothesis: the Paperclip adapter itself passes these paths safely, and the observed failure lives either in downstream Codex internals or in a separate auth-related path.

## 3. Test cases added

- ASCII simple path: `paperclip-ascii`
- Space path: `paperclip with spaces`
- Swedish characters: `paperclip-nätverk`
- Decomposed Unicode characters: `paperclip-nätverk`
- Percent-like path: `paperclip%20encoded`

Each case was run with cloud-hosted runtime context and auth held constant through a fake native Codex auth file.

## 4. What failed / passed

- All five path-variant executions reached the mocked Codex execution point successfully.
- Runtime context remained present in `resultJson.runtimeContext`.
- Workspace path data exported through `PAPERCLIP_WORKSPACE_*` env vars preserved the original input string exactly, including spaces, Swedish characters, decomposed Unicode, and `%20`.
- Codex CLI args did not embed the raw workspace path.
- No adapter-side header construction using workspace path was found in the inspected source.
- One early test expectation failed before adjustment because macOS canonicalized `/var/...` to `/private/var/...` in the child process `cwd`.
- That behavior was traced to OS realpath canonicalization, not to Unicode or path-content corruption.

## 5. Fix applied, if any

- No runtime fix was applied.
- The evidence does not support an adapter-level path/header bug in the currently tested Paperclip code.
- Only focused diagnostics and reproduction tests were added.

## 6. Files changed

- `vendor/paperclip/server/src/__tests__/codex-local-execute.test.ts`
- `user_lab/phase1/experiment_1b_path_flow_notes.md`
- `user_lab/phase1/experiment_1b_result.md`
- `user_lab/phase1/experiment-log.md`

## 7. Tests run

- `swift build`
- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`

## 8. Measured result

- `codex-local-execute.test.ts`: 20/20 tests passed after adding the five path-variant cases.
- The new tests show:
  - adapter env preserves original workspace strings
  - child-process `cwd` may be realpath-canonicalized by macOS
  - no crash occurs before intended mocked execution
  - no Paperclip adapter code inspected here injects workspace path into HTTP or websocket headers

## 9. Keep or revert

- Keep.
- The added coverage weakens the adapter-level path/header hypothesis and improves future regression detection without changing runtime behavior.

## 10. Remaining unknowns

- This experiment does not prove that Codex CLI/core never serializes workspace-derived metadata into headers after process launch.
- The previously observed `x-codex-turn-metadata` failure still appears to originate downstream from the Paperclip adapter layer.
- A real authenticated cloud Codex run with the same non-ASCII workspace path has not yet been re-measured in this experiment.

## 11. Next recommended experiment

- Run Experiment 1c as a real authenticated cloud-hosted reproduction pass focused on downstream Codex behavior, with adapter diagnostics already in place and auth held stable.
