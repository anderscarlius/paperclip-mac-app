# Paperclip Startup Transparency Note

## What startup now shows

Paperclip now shows a compact startup panel before the full Setup Health experience is ready. It explains what the app is checking and whether readiness is still loading or complete.

## What it means when Paperclip is checking services

Checking means Paperclip is still gathering local readiness signals such as runtime health and local AI availability. It does not mean the app is already analyzing a workspace.

## What it means when Setup Health is ready

When startup is marked complete, Setup Health has enough readiness information to guide the first safe run and show concrete cards instead of only fallback loading states.

## What startup does not do

- it does not modify project files
- it does not run AI analysis
- it does not automatically use local AI in the alpha flow
- it does not analyze the workspace during startup

## What to report if startup feels slow or unclear

Report:

- which startup step looked unclear
- whether the delay felt normal or suspicious
- whether the local AI wording felt understandable
- a screenshot of the startup panel if possible
