# Phase 5D Diagnostics Trace

## Purpose

Trace which existing diagnostics can already feed Setup Health without changing runtime behavior.

## Trace Table

| Card | Signal | Source | Available now? | Notes |
| ---- | ------ | ------ | -------------- | ----- |
| Cloud AI | Auth readiness | `vendor/paperclip/ui/src/api/health.ts` via `/api/health` | Yes | This is the safest current app-level sign-in signal. In 5D it is used conservatively as a Cloud AI readiness hint, not as a full provider account contract. |
| Cloud AI | Provider | latest heartbeat run `resultJson.runtimeDiagnostics.provider` or `resultJson.runtimeContext.provider` | Yes | Already summarized on the server and already read in `AgentDetail`. |
| Cloud AI | Model hosting | latest heartbeat run `resultJson.runtimeDiagnostics.modelHosting` or `resultJson.runtimeContext.modelHosting` | Yes | Used to distinguish latest known cloud vs local execution context. |
| Cloud AI | Model info | latest heartbeat run `runtimeDiagnostics` / `runtimeContext.modelInfo` | Yes | Requested/resolved/reported model, source, confidence, and unknown reason are already preserved. |
| Cloud AI | Billing type | no clean product/UI source found | Future | Still not surfaced in a way that makes sense for Setup Health. |
| Local AI | Local fallback candidate | `vendor/paperclip/ui/src/lib/local-fallback-offer.ts` reading latest heartbeat run result | Yes | Available as a run-scoped diagnostic. Good enough for advanced details and optional status hints. |
| Local AI | Local model/runtime | latest heartbeat run `localFallbackCandidate` or local `modelHosting` context | Yes | In 5D this is used only to say Local AI is available for small private drafts. |
| Local AI | Ollama reachability as a standalone top-level app signal | native/local app model surfaces, not bridged into this page | Needs small backend bridge | The native app knows more here than the web preview route currently does. |
| Workspace | Selected first-run workspace | none for Setup Health preview route | Future | There is still no dedicated “workspace to analyze” concept on this screen. |
| Workspace | Path risk / path class | phase 1/3 logic exists, but not exposed to this UI route | Needs small backend bridge | 5D keeps the card honest by leaving it in needs-attention/unknown fallback states unless mock mode is selected. |
| Developer Tools | Tool-by-tool availability | phase 3 profiling and native runtime adapter checks | Needs small backend bridge | No existing product-facing payload currently feeds git/node/pnpm/swift status into the web route. |
| Developer Tools | PATH issue detected | native runtime adapter/environment tests | Needs small backend bridge | Logic exists, but not in a reusable UI payload yet. |
| Runtime | Last run status | latest heartbeat run status | Yes | Mapped from `succeeded` / `failed` / `cancelled` / `timed_out` into Setup Health runtime states. |
| Runtime | Run warnings | latest heartbeat run `resultJson.warnings` | Yes | Already summarized on the server. 5D maps these to degraded runtime copy. |
| Runtime | Diagnostics available | latest heartbeat run result presence plus `/api/health` availability | Yes | Used as a lightweight advanced-detail signal only. |

## What Setup Health Reads Directly Today

- `/api/health` through the existing `healthApi.get()` client
- recent heartbeat runs through the existing `heartbeatsApi.list()` client when a company is selected
- latest run runtime diagnostics through the already-existing summarized heartbeat payload
- local fallback candidate diagnostics through the existing UI helper

## What Still Needs a Bridge

- first-run workspace selection and path health
- developer tool availability in a product-facing payload
- native Ollama/app runtime signals that are currently outside the web preview route

## 5D Conclusion

5D successfully connects the cards that already have safe read-only sources:

- Cloud AI
- Local AI
- Runtime

Workspace and Developer Tools intentionally remain honest fallback states until a small bridge exists.
