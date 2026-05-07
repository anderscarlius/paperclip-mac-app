# Quick Start

This is the fastest path to a working Paperclip Desktop setup.

## What You Get

- A native macOS app that runs the real Paperclip server locally
- A built-in dashboard inside the app window
- API key management in the app instead of manual `.env` editing
- Optional local Gemma 4 support through Ollama

## What You Need

- macOS 14 or later
- Internet access the first time Paperclip or Ollama needs to download what it uses

## First Launch

When the app opens for the first time, the setup wizard will guide you through:

1. Adding your API keys
2. Choosing how new agents should start
3. Naming your first company
4. Launching Paperclip Desktop

## If You Choose Cloud-first

Cloud-first is the simplest setup for most people.

1. Add at least one API key
2. Pick the cloud model you want for new agents
3. Finish setup and launch the app

## If You Choose Local AI on This Mac

The app can prepare local Gemma 4 for you.

1. Choose `Local AI on This Mac`
2. Pick the Gemma 4 model you want
3. Finish setup
4. Open `Settings > Models`
5. Click `Set Up Local AI`

If Ollama is not installed yet, Paperclip Desktop can install it automatically first.

## Where Your Files Go

- Visible workspace: `~/Documents/Paperclip Desktop/Companies/`
- Private app data: `~/Library/Application Support/PaperclipDesktop/`

Each company includes a normal Finder folder with a `Files/` directory you can use directly.

## If You Get Stuck

- Open `Settings > Server` to check server status and logs
- Open `Settings > Models` to check local AI and Ollama status
- Open `Settings > Skills` if you want help drafting, reviewing, or installing skills for an agent
- Open `Settings > Help` to find file locations and read the full guides
