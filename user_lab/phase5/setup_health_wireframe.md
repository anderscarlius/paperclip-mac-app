# Setup Health Wireframe

## Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Setup Health                                                        │
│ Check that Paperclip is ready to analyze your local workspace.      │
│                                                                      │
│ Overall: Ready to start                                              │
│ Paperclip is ready to analyze this workspace.                        │
│ [Analyze this workspace] [Open diagnostics]                          │
│                                                                      │
│ ┌──────────────────────────┐  ┌───────────────────────────────────┐ │
│ │ Cloud AI                 │  │ Local AI                          │ │
│ │ Ready                    │  │ Optional                          │ │
│ │ Cloud AI is connected    │  │ Local AI is optional. You can    │ │
│ │ and ready.               │  │ set it up later.                 │ │
│ │ [Manage connection]      │  │ [Learn about local AI]           │ │
│ │ Advanced details ▾       │  │ Advanced details ▾               │ │
│ └──────────────────────────┘  └───────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────┐  ┌───────────────────────────────────┐ │
│ │ Workspace                │  │ Developer Tools                   │ │
│ │ Warning                  │  │ Ready                             │ │
│ │ This workspace path may  │  │ Required developer tools are     │ │
│ │ slow some cloud runs,    │  │ available.                       │ │
│ │ but tasks should work.   │  │ [View tools]                     │ │
│ │ [View path details]      │  │ Advanced details ▾               │ │
│ │ Advanced details ▾       │  │                                   │ │
│ └──────────────────────────┘  └───────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ Runtime                                                          │ │
│ │ Ready                                                            │ │
│ │ Runtime diagnostics look healthy.                                │ │
│ │ [Open diagnostics]                                               │ │
│ │ Advanced details ▾                                               │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Advanced details may include provider, model, Ollama, PATH, and     │
│ runtime terms.                                                       │
└──────────────────────────────────────────────────────────────────────┘
```

## Narrow/mobile wireframe

```text
┌──────────────────────────────────────────────┐
│ Setup Health                                 │
│ Check that Paperclip is ready...             │
│                                              │
│ Overall: Needs attention                     │
│ [Analyze this workspace] [Open diagnostics]  │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Cloud AI                                 │ │
│ │ Needs attention                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Local AI                                 │ │
│ │ Optional                                 │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Workspace                                │ │
│ │ Needs attention                          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Developer Tools                          │ │
│ │ Ready                                    │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ Runtime                                  │ │
│ │ Ready                                    │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

## Layout notes

- keep the first glance answer above the fold
- make the primary CTA visible without scrolling on a typical laptop screen
- keep advanced details collapsed
- do not mix setup health with the full dashboard metrics on this screen
