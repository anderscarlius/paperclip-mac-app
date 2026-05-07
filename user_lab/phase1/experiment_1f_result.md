# Experiment 1f Result

## 1. Objective

- Implement a conservative workspace path-class detector and an informational warning for cloud-hosted `codex_local` runs that are likely to hit the known Codex websocket metadata issue.

## 2. Evidence basis

- Experiment 1c reproduced the websocket/header failure during an authenticated cloud run on the real non-ASCII repo path.
- Experiment 1d showed strong A/B evidence:
  - non-ASCII path reproduced `x-codex-turn-metadata` failures and HTTP fallback
  - ASCII path did not
- Experiment 1e recommended a warning-first mitigation that preserves existing execution behavior.

## 3. Implemented change

- Added a pure workspace path classifier in `execute.ts`.
- Added a structured warning object for affected cloud-hosted runs.
- Added a short informational `stdout` warning line when execution continues.
- Preserved:
  - auth behavior
  - provider/model routing
  - fallback behavior
  - path identity

## 4. Where detector lives

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`

## 5. Where warning is emitted

- Structured warning:
  - `resultJson.warnings`
- Informational runtime log:
  - one `stdout` warning line before Codex execution proceeds
- Emission conditions:
  - cloud-hosted `codex_local`
  - workspace path `riskLevel === "medium"`
  - execution continues past auth preflight

## 6. Path classification rules

- `asciiSafe`
  - true only for printable ASCII paths without percent-encoded byte patterns
- `containsSpaces`
  - true if whitespace is present
- `containsNonAscii`
  - true if any character is outside ASCII
- `containsDecomposedUnicode`
  - true if combining marks are present or the string differs under NFC/NFD normalization checks
- `containsPercentEncoding`
  - true if the path matches `%[0-9A-Fa-f]{2}`
- `riskLevel`
  - `none`: ASCII-safe with no spaces and no percent-encoding
  - `low`: spaces only
  - `medium`: non-ASCII, decomposed Unicode, or percent-encoding

## 7. Files changed

- `vendor/paperclip/packages/adapters/codex-local/src/server/execute.ts`
- `vendor/paperclip/server/src/__tests__/codex-local-execute.test.ts`
- `user_lab/phase1/experiment_1f_warning_insertion_notes.md`
- `user_lab/phase1/experiment_1f_result.md`
- `user_lab/phase1/experiment-log.md`

## 8. Tests run

- `pnpm test:run server/src/__tests__/codex-local-execute.test.ts`
- `pnpm --filter @paperclipai/adapter-codex-local typecheck`
- `swift build`

## 9. Measured result

- Test suite passed with `21/21` tests.
- Verified behaviors:
  - ASCII cloud path: no warning
  - spaces-only cloud path: no medium-risk warning
  - non-ASCII cloud path: warning emitted, execution continues
  - decomposed Unicode cloud path: warning emitted, execution continues
  - percent-encoded cloud path: warning emitted, execution continues
  - non-ASCII local-hosted path: no cloud warning
- Existing execution behavior remained unchanged.

## 10. Keep or revert

- Keep.
- This is a minimal observability/user-warning improvement with no execution workaround.

## 11. Remaining unknowns

- Whether Codex upstream will fix the websocket/header serialization issue directly
- Whether decomposed Unicode is the key trigger or just one member of a broader non-ASCII class
- Whether a future supported HTTP-only or websocket-disable Codex switch exists

## 12. Recommended next experiment

- `Experiment 1g — Upstream Issue Packaging / Submission Readiness`

Suggested scope:

1. tighten the sanitized repro package
2. capture the new warning behavior in the issue context
3. decide whether a stronger local mitigation is still needed after upstream acknowledgment
