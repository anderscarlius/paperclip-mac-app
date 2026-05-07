# App Store Launch Plan

Date: April 9, 2026

## Executive Recommendation

Use a two-track launch:

- Launch `Paperclip Mobile` on the Apple App Store.
- Launch `Paperclip Desktop` as a signed and notarized direct download outside the Mac App Store.

This is the safest commercial path for the product as it exists today.

## Why the Current macOS App Is Not Mac App Store Ready

The current desktop architecture conflicts with Apple’s current Mac App Store rules in a few important ways:

1. The app downloads and installs runtime code after shipping.
2. The app can install or update Ollama outside the app bundle.
3. The app can update Paperclip from GitHub.
4. The app writes to fixed paths in Documents and Application Support instead of living entirely inside a sandbox container plus user-selected locations.
5. The app starts and manages local server processes that are not yet packaged as a fully sandbox-compatible App Store design.

That matters because Apple’s current rules require:

- Mac App Store apps to support App Sandbox
- apps to be self-contained bundles
- apps not to download, install, or execute new code that changes app features after review
- Mac App Store updates to go through the App Store rather than a separate updater path

## Recommended Commercial Launch Plan

### Phase 1: Ship What Fits Today

#### Paperclip Mobile

- Ship on the Apple App Store
- Position it as the companion app for monitoring, approvals, tasks, and agent status
- Use TestFlight first, then App Store review

#### Paperclip Desktop

- Ship as a direct download from your own website
- Sign it with Developer ID
- Notarize it
- Distribute as a `.dmg`
- Keep the current local Paperclip runtime, Ollama integration, GitHub runtime update flow, and Finder-visible workspace

This gives you a launchable product without blocking on a major macOS rewrite.

### Phase 2: Decide Whether a Mac App Store Version Is Worth It

If you want a true Mac App Store edition later, treat it as a separate product variant, not just a packaging change.

## What Would Need to Change for a Mac App Store Desktop App

To pursue a Mac App Store version of `Paperclip Desktop`, we should plan a desktop re-architecture with these goals:

1. Remove GitHub runtime installation and updates from the app.
2. Remove automatic Ollama app installation and updating from the app.
3. Bundle all executable code that ships with the app inside the signed app bundle.
4. Replace fixed-file writes with sandbox-safe storage plus user-selected folders where needed.
5. Remove any custom update mechanism for the Mac App Store build.
6. Audit all helper tools and process-spawn behavior for sandbox compatibility.

## Practical Product Decision

There are really two viable launch options:

### Option A: Recommended

- `Paperclip Desktop` sold directly outside the Mac App Store
- `Paperclip Mobile` on the Apple App Store

This is the fastest path to revenue and the least risky operational path.

### Option B: Mac App Store Desktop Later

- keep the direct desktop edition as the full-power version
- build a separate Mac App Store edition only after we decide what features must be removed or redesigned

That App Store edition would likely need to focus on:

- bundled runtime only
- no GitHub-installed runtime
- no external app installation
- more limited local-runtime management
- stricter sandbox-safe file handling

## Launch Checklist

### Apple Developer and App Store Connect

1. Confirm Apple Developer Program enrollment
2. Create the app records in App Store Connect
3. Complete banking, tax, and Paid Applications paperwork
4. Set the intended price point for the mobile app

### Product Assets

1. Final app name
2. Subtitle and promo text
3. Privacy policy URL
4. Support URL
5. Marketing website URL
6. App screenshots for iPhone and iPad
7. App icon and launch visuals

### Review Readiness

1. Privacy answers and data-use disclosure
2. Demo account or review instructions if needed
3. A clean onboarding flow
4. Clear explanation that mobile connects to a Paperclip server

### Desktop Direct Launch Readiness

1. Developer ID signing
2. Notarization
3. DMG packaging
4. Update strategy for the direct-download build
5. Support and release notes page

## Pricing Note

If the `USD 20` price is meant for the desktop product, the cleanest plan is:

- keep `Paperclip Desktop` as the paid direct-download product
- keep `Paperclip Mobile` free or companion-priced on the App Store

That aligns better with the current architecture and avoids forcing the main desktop product into a Mac App Store rewrite before launch.

## Sources

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple App Sandbox: https://developer.apple.com/documentation/security/app_sandbox
- Apple notarization overview: https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution
- App Store Connect pricing and availability: https://developer.apple.com/help/app-store-connect/manage-app-pricing/set-a-price-for-an-app/
- TestFlight overview: https://developer.apple.com/testflight/
