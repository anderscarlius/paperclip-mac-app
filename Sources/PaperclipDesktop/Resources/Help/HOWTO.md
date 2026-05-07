# How To

This guide covers the most common everyday tasks in Paperclip Desktop.

## Create Another Company

1. Open the main Paperclip Desktop window
2. Start the company wizard
3. Choose a template such as `Software Company`
4. Adjust roles, instructions, and the default model
5. Finish the wizard and open the company dashboard

## Find Company Files in Finder

Company files live in:

`~/Documents/Paperclip Desktop/Companies/`

Inside each company folder, you will find:

- agent instruction files
- company metadata
- a normal `Files/` folder for documents and supporting material

Use `Settings > Help` or `Settings > Advanced` if you want a Finder shortcut.

## Add Skills to an Agent

Open `Settings > Skills`.

From there you can:

- choose a company and agent
- open the agent's Skills folder in Finder
- draft a new skill with local AI
- review a starter skill before installing it
- paste an imported skill and review it before copying it into an agent

Starter skills can also be added to the shared skill library in:

`~/Documents/Paperclip Desktop/Skill Library/`

## Start, Stop, or Restart the Server

Open `Settings > Server`.

From there you can:

- start the server
- stop the server
- restart the server
- review log output
- confirm which port the app is using

## Turn On Local Gemma 4

Open `Settings > Models`.

1. Turn on local Gemma 4 for this Mac
2. Choose how much memory you want to allow
3. Pick a Gemma 4 model
4. Choose whether new agents should start with local AI
5. Click `Set Up Local AI`

Paperclip Desktop can install Ollama automatically, start it, and download the selected Gemma 4 model.

## Update Ollama

Open `Settings > Models`.

1. Click `Check for Updates`
2. Review the installed version and the latest version checked
3. Click `Update Ollama` if you want the newer release

Ollama is managed separately from the main Paperclip runtime so local AI can stay current over time.

## Update Paperclip from GitHub

Open `Settings > Advanced`.

Under `Upstream GitHub`, you can:

1. check for the latest Paperclip commit
2. read the update recommendation shown by the app
3. install the latest snapshot from GitHub if you want it

For most people, the bundled Paperclip version is still the safest choice unless you specifically want the newest upstream changes.

## Reinstall the Bundled Paperclip Version

Also in `Settings > Advanced`, use the `Bundled Runtime` section if you want to reinstall the Paperclip version that shipped with your current app build.

## If Something Feels Wrong

Start here:

1. `Settings > Server` for server status and logs
2. `Settings > Models` for local AI and Ollama
3. `Settings > Skills` for starter skills, local drafting, and skill review
4. `Settings > Help` for file locations and everyday guidance
5. `Settings > Advanced` for Paperclip runtime version details
