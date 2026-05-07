# Setup Health UI States

## 1. Loading state

### Screen headline

```text
Checking setup…
```

### Card statuses

- Cloud AI: unknown
- Local AI: unknown
- Workspace: unknown
- Developer Tools: unknown
- Runtime: unknown

### Primary CTA

- disabled `Analyze this workspace`

### Secondary CTA

- hidden or disabled `Open diagnostics`

### Expected user next action

- wait for the first health summary to load

## 2. First launch with no workspace

### Screen headline

```text
Needs attention
Fix the items below before starting your first analysis.
```

### Card statuses

- Cloud AI: ready or unknown
- Local AI: optional
- Workspace: needs_attention
- Developer Tools: ready or warning
- Runtime: ready

### Primary CTA

- disabled `Analyze this workspace`

### Secondary CTA

- `Open diagnostics`

### Expected user next action

- choose a local workspace

## 3. Cloud AI missing

### Screen headline

```text
Needs attention
Fix the items below before starting your first analysis.
```

### Card statuses

- Cloud AI: needs_attention
- Local AI: optional
- Workspace: ready or warning
- Developer Tools: ready or warning
- Runtime: ready

### Primary CTA

- disabled `Analyze this workspace`

### Secondary CTA

- `Open diagnostics`

### Expected user next action

- connect Cloud AI or repair the cloud path required for the first safe task

## 4. Cloud AI ready but workspace missing

### Screen headline

```text
Needs attention
Fix the items below before starting your first analysis.
```

### Card statuses

- Cloud AI: ready
- Local AI: optional
- Workspace: needs_attention
- Developer Tools: ready or warning
- Runtime: ready

### Primary CTA

- disabled `Analyze this workspace`

### Secondary CTA

- `Open diagnostics`

### Expected user next action

- choose workspace

## 5. Workspace warning

### Screen headline

```text
Optional improvements available
You can start now, or improve setup for a smoother experience.
```

### Card statuses

- Cloud AI: ready
- Local AI: optional
- Workspace: warning
- Developer Tools: ready or warning
- Runtime: ready

### Primary CTA

- enabled `Analyze this workspace`

### Secondary CTA

- `Open diagnostics`

### Expected user next action

- either inspect path details or continue with analysis

## 6. Local AI available

### Screen headline

```text
Ready to start
Paperclip is ready to analyze this workspace.
```

### Card statuses

- Cloud AI: ready
- Local AI: optional
- Workspace: ready or warning
- Developer Tools: ready
- Runtime: ready

### Primary CTA

- enabled `Analyze this workspace`

### Secondary CTA

- `Open diagnostics`

### Expected user next action

- start analysis; Local AI remains a side option, not the main path

## 7. Local AI unavailable

### Screen headline

```text
Optional improvements available
You can start now, or improve setup for a smoother experience.
```

### Card statuses

- Cloud AI: ready
- Local AI: optional
- Workspace: ready or warning
- Developer Tools: ready or warning
- Runtime: ready

### Primary CTA

- enabled `Analyze this workspace`

### Secondary CTA

- `Open diagnostics`

### Expected user next action

- ignore Local AI for now or open its details later

## 8. Runtime degraded

### Screen headline

```text
Optional improvements available
You can start now, or improve setup for a smoother experience.
```

### Card statuses

- Cloud AI: ready
- Local AI: optional
- Workspace: ready or warning
- Developer Tools: ready or warning
- Runtime: warning

### Primary CTA

- enabled `Analyze this workspace` only if the degraded state is not blocking

### Secondary CTA

- `Open diagnostics`

### Expected user next action

- review diagnostics if cautious, otherwise proceed

## 9. Ready to analyze

### Screen headline

```text
Ready to start
Paperclip is ready to analyze this workspace.
```

### Card statuses

- Cloud AI: ready
- Local AI: optional or warning
- Workspace: ready or warning
- Developer Tools: ready or warning
- Runtime: ready

### Primary CTA

- enabled `Analyze this workspace`

### Secondary CTA

- `Open diagnostics`

### Expected user next action

- start the first safe task

## State priority rules

If multiple states apply, use this precedence:

1. loading
2. needs attention
3. optional improvements available
4. ready to start

## CTA rules across states

- never hide `Analyze this workspace`; disable it when blocked
- keep `Open diagnostics` available in all loaded states
- never make Local AI the required next step for first-run success
