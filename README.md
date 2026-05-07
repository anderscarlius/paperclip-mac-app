# Paperclip Apple Apps

This repository is a Swift-first implementation scaffold for the Paperclip Apple apps spec:

- `PaperclipDesktop`: a buildable macOS SwiftUI shell with setup, settings, menu bar, local company templates, and server-process integration points.
- `PaperclipMobile`: a shared SwiftUI feature module for the iOS companion app screens.
- `PaperclipShared`: shared models, API client, keychain service, and template catalog.

## Current State

This first pass focuses on architecture and app shells that match the product specification:

- shared domain models and REST client
- desktop onboarding flow
- desktop settings surfaces
- local company template creation into Application Support
- desktop process manager and vendored Paperclip bootstrap flow
- iOS feature-module views for dashboard, tasks, approvals, and agents

The desktop app is the buildable entrypoint today via Swift Package Manager. The iOS side is scaffolded as a reusable module so it can be wrapped in a native Xcode iOS app target in the next pass.

## Documentation

- [Quick Start](docs/QUICKSTART.md)
- [How To](docs/HOWTO.md)
- [App Store Launch Plan](docs/APP_STORE_LAUNCH_PLAN.md)
- [Legal](docs/LEGAL.md)

## File Layout

- private runtime files stay in `~/Library/Application Support/PaperclipDesktop/`
- user-facing company files live in `~/Documents/Paperclip Desktop/Companies/`
- each company gets a dedicated `Files/` folder for documents and other materials users want to manage in Finder

## Vendored Paperclip Runtime

The real upstream Paperclip monorepo is vendored under `vendor/paperclip`.

The macOS shell now bootstraps against that source snapshot:

1. copy vendored Paperclip into `~/Library/Application Support/PaperclipDesktop/paperclip/`
2. write the Paperclip runtime `.env` into `~/Library/Application Support/PaperclipDesktop/paperclip-home/instances/default/.env`
3. run `pnpm install --frozen-lockfile` inside the copied Paperclip source when needed
4. build the required workspace artifact with `pnpm --filter @paperclipai/plugin-sdk build`
5. run `pnpm paperclipai onboard --yes --data-dir <paperclip-home>` on first launch
6. run `pnpm paperclipai run --data-dir <paperclip-home>` to start the real server/UI

This means the app is now wired to the actual Paperclip codebase, though production packaging still needs bundled Node.js/pnpm and a release-grade install strategy.

From the app's Advanced settings:

- `Install Bundled Runtime` reinstalls the Paperclip snapshot shipped with this app
- `Check for Upstream Update` checks GitHub for the latest Paperclip commit
- `Install Latest from GitHub` downloads and installs the latest upstream snapshot while keeping the Paperclip data directory intact

## Local Gemma 4 Support

The desktop app now includes a first local-model path for Gemma 4 through Ollama:

- the app inspects available system memory
- the user can choose a memory budget in Settings -> Models
- the app recommends a Gemma 4 variant based on that budget
- if Ollama is missing when a local model is prepared, the app can install Ollama automatically
- the app can check GitHub for the latest Ollama release and reinstall or update it from Settings -> Models
- once Ollama is available, the app can pull the selected Gemma 4 model automatically
- when local mode is marked as the primary model, the desktop app points OpenAI-compatible traffic at Ollama on `http://127.0.0.1:11434/v1`

This gives the project a practical local-model starting point while keeping the Paperclip runtime wiring simple.

## Run

```bash
./script/build_and_run.sh
```
