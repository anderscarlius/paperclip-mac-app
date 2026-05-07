# Experiment 1b Path Flow Notes

## 1. Where workspace path enters

- `RuntimeAgentAdapterService.swift` does not build or transform a workspace path for `codex_local`.
- The effective workspace path enters the adapter in `execute.ts` from:
  - `context.paperclipWorkspace.cwd`
  - `config.cwd`
  - fallback `process.cwd()`
- `execute.ts` resolves the final execution directory as:
  - `effectiveWorkspaceCwd || configuredCwd || process.cwd()`

## 2. Whether it is raw, decoded, encoded, or normalized

- In the Paperclip adapter layer, the workspace path is handled as a normal JavaScript string.
- The adapter does not percent-decode it.
- The adapter does not URL-encode it.
- The adapter does not apply Unicode normalization such as NFC or NFD.
- The path is passed through as provided, then validated with `ensureAbsoluteDirectory(...)`.

## 3. Whether it is used in headers

- No workspace-path-driven HTTP or websocket header construction was found in:
  - `RuntimeAgentAdapterService.swift`
  - `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`
  - `vendor/paperclip/packages/adapters/codex-local/src/server/index.ts`
- Adapter-side HTTP header creation does exist for the Paperclip web-search shim and Codex quota fetches, but those headers do not include workspace path values.
- The previously observed `x-codex-turn-metadata` failure string does not appear in the Paperclip adapter source inspected here, which weakens the hypothesis that Paperclip itself creates that header.

## 4. Whether it is used in env vars

- Yes.
- `execute.ts` exports workspace path values into env when present:
  - `PAPERCLIP_WORKSPACE_CWD`
  - `PAPERCLIP_WORKSPACE_WORKTREE_PATH`
  - plus related workspace metadata such as source, strategy, id, repo URL, repo ref, and branch.

## 5. Whether it is used in command args

- Not directly as a CLI arg.
- `codex_local` passes the effective workspace path to the child process as the subprocess `cwd`.
- Codex CLI args are built from execution flags, model flags, search/bypass flags, resume session data, and extra args, but not from the raw workspace path string itself.

## 6. Whether any value might violate HTTP header rules

- Within the Paperclip adapter layer inspected here, the workspace path is not inserted into HTTP or websocket headers, so the adapter itself does not currently create an obvious invalid-header value from workspace path.
- Raw non-ASCII or percent-like workspace values are still present in env and `cwd`, which is acceptable for local process execution but would be unsafe if another downstream layer serialized them into ASCII-only headers without encoding.
- Current evidence points to one of two outcomes:
  - the adapter is path-safe and any header issue lives downstream in Codex CLI/core, or
  - a downstream layer outside the inspected Paperclip adapter source derives header metadata from `cwd` or related context.
