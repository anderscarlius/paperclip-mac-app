# Experiment 1g Repro Plan

## Goal

Reproduce the Codex websocket metadata/header failure in a safe, sanitized way without depending on private repository contents.

## 1. Preconditions

- macOS
- Codex installed and authenticated
- ability to run cloud-hosted `codex exec`
- a small local test repo or directory tree with a few files

## 2. Create an ASCII workspace

Create a small test workspace under an ASCII-only path:

```bash
mkdir -p /tmp/codex_ascii_repro/PaperclipApp
cd /tmp/codex_ascii_repro/PaperclipApp
git init
printf 'hello\n' > README.md
printf '{ "name": "codex-ascii-repro" }\n' > package.json
```

## 3. Create a Unicode/decomposed workspace

Create an equivalent workspace under a path containing non-ASCII and decomposed Unicode:

```bash
mkdir -p '/tmp/codex_unicode_repro/Datorer och nätverk/PaperclipApp'
cd '/tmp/codex_unicode_repro/Datorer och nätverk/PaperclipApp'
git init
printf 'hello\n' > README.md
printf '{ "name": "codex-unicode-repro" }\n' > package.json
```

Notes:

- the path should contain a decomposed Unicode segment such as `nätverk`
- if needed, validate with a small Unicode normalization check before running Codex

## 4. Run the same authenticated cloud Codex command in both

Use the same command in both workspaces:

```bash
codex exec --json --skip-git-repo-check -
```

Provide the same prompt over stdin:

```text
Please inspect the repository root and report:
1. current working directory
2. whether package files exist
3. whether runtime context is visible
Do not modify files.
```

## 5. Capture logs

Capture:

- exit code
- duration
- stderr
- stdout JSON events
- whether `x-codex-turn-metadata` appears
- whether HTTP fallback appears

## 6. Compare signals

Compare the ASCII and Unicode runs for:

- websocket/header errors
- reconnect loop behavior
- HTTP fallback
- final task success
- observed working directory

## 7. Expected result table

| Signal | ASCII path | Unicode/decomposed path |
| --- | ---: | ---: |
| auth present | yes | yes |
| websocket metadata error | no | yes |
| `x-codex-turn-metadata` appears | no | yes |
| HTTP fallback | no | yes |
| final task success | yes | yes |

## Independence Notes

- This plan does not require the private Paperclip repo.
- It does assume a local authenticated Codex setup and a macOS environment similar to the observed runs.
- If the issue depends on decomposed Unicode specifically, reproduction quality may vary unless the Unicode path is constructed carefully.
