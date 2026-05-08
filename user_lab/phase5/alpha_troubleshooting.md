# Paperclip Private Alpha Troubleshooting

## App does not open

Report that the app did not reach Setup Health and include a screenshot if possible.

## Startup status feels stuck

Capture the startup panel, note which step appears stuck, and report whether the app ever reached `Startup complete`.

## Setup Health looks incomplete

Capture the visible readiness cards and note which expected sections are missing or unclear.

## Workspace is not selected

The first successful run cannot complete until a workspace is visible in Setup Health.

## Path health warning appears

This is not always blocking. Note the warning text and continue the read-only flow if the app still allows it.

## Metadata collection fails

Capture the error copy shown in the app. The current alpha should still make it clear that no files were changed and no commands were run.

## README cannot be read

Capture the message shown in the approved README step. Paperclip should not open any other files in this case.

## Manifest cannot be read

Capture the message shown in the approved manifest step. Paperclip should not expose raw manifest content in this case.

## First summary looks weak

Note whether the weakness came from missing README content, missing manifest fields, unclear copy, or simply too little useful information.

## What logs or screenshots to send back

- startup status panel
- Setup Health overview
- first summary card
- first successful run checklist state
- any visible error state
- brief note about what you clicked before the issue appeared
