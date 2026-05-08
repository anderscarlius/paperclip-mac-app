# Phase 5Q Startup Findings

## What starts when the app launches

- `PaperclipDesktopApp` creates `DesktopAppModel` on launch.
- `DesktopAppModel` immediately refreshes runtime status and starts background refresh tasks for Ollama status, model inventory, and desktop sidebar data.
- `ProcessManager` owns the managed Paperclip runtime process and can also own a managed Ollama process.

## What readiness signals currently exist

- `ProcessManager.runtimeState` reports whether the Paperclip runtime is stopped, starting, running, or failed.
- `HealthCheckService` probes `http://localhost:<port>/api/health` and can wait for the server to become healthy.
- Setup Health in the web UI currently waits on `healthApi.get()` and recent heartbeat runs.
- The UI also derives local AI and runtime signals from those diagnostics.

## Whether Ollama/local AI is only checked or actually started

- Paperclip can start and manage Ollama in the desktop layer when local model support is enabled and the configuration requires it.
- Setup Health itself does not directly start Ollama.
- The web UI currently only receives derived readiness-style signals, so startup copy should describe local AI as being checked or appearing available unless a stronger explicit signal exists.

## Whether Setup Health currently waits on health, runs, or diagnostics

- Yes. Setup Health uses live health and heartbeat queries.
- While those queries are loading, the page currently falls back to generic loading language.
- Once diagnostics are available, the page can render more specific readiness cards.

## What can be shown honestly

- The desktop app has started.
- Paperclip is checking local readiness signals.
- Setup Health waits for health and recent run diagnostics.
- Local AI may appear available, unavailable, or still being checked.
- Project files are not modified during startup.

## What must not be claimed

- Do not claim local AI is being used.
- Do not claim Ollama started successfully unless an explicit signal proves that.
- Do not claim the workspace is being analyzed during startup.
- Do not claim project files are being modified.

## Whether any Swift changes are necessary

No Swift changes are necessary for 5Q. The current startup transparency layer can be built honestly from existing desktop runtime behavior and existing web readiness signals.
