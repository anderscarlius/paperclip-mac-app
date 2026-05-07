import AppKit
import SwiftUI

struct AdvancedSettingsView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        Form {
            Section("Workspace") {
                Text(DesktopPaths.workspaceRoot.path)
                    .font(.system(.caption, design: .monospaced))
                    .textSelection(.enabled)

                Text("Company files and agent instruction files live here so users can browse them in Finder, add supporting files, and manage them like normal folders.")
                    .foregroundStyle(.secondary)

                Button("Open Workspace in Finder") {
                    NSWorkspace.shared.activateFileViewerSelecting([DesktopPaths.workspaceRoot])
                }
            }

            Section("Application Support") {
                Text(DesktopPaths.root.path)
                    .font(.system(.caption, design: .monospaced))
                    .textSelection(.enabled)

                Text("Private runtime files, logs, and the embedded Paperclip server install stay here.")
                    .foregroundStyle(.secondary)

                Button("Open Application Support in Finder") {
                    NSWorkspace.shared.activateFileViewerSelecting([DesktopPaths.root])
                }
            }

            Section("Data") {
                Text("Paperclip Desktop keeps its database, runtime state, and backup-ready files in Application Support. This area is reserved for maintenance tasks such as backup, restore, import, and reset.")
                    .foregroundStyle(.secondary)
            }

            Section("Bundled Runtime") {
                if let runtimeStatus = model.runtimeStatus {
                    LabeledContent("Bundled Snapshot", value: runtimeStatus.bundledSignatureDisplay)
                    LabeledContent("Installed Snapshot", value: runtimeStatus.installedSignatureDisplay)
                    LabeledContent("Installed Source", value: runtimeStatus.installedOriginDisplay)

                    Text(runtimeStatus.statusSummary)
                        .foregroundStyle(.secondary)

                    if let runtimeStatusMessage = model.runtimeStatusMessage {
                        Text(runtimeStatusMessage)
                            .foregroundStyle(.green)
                    }

                    HStack {
                        Button(runtimeStatus.actionTitle) {
                            Task {
                                await model.installBundledRuntimeUpdate()
                            }
                        }
                        .disabled(model.isInstallingRuntimeUpdate)

                        if model.isInstallingRuntimeUpdate {
                            ProgressView()
                                .controlSize(.small)
                        }

                        Button("Refresh Status") {
                            model.refreshRuntimeStatus()
                        }
                        .disabled(model.isInstallingRuntimeUpdate)
                    }

                    Text("This installs the Paperclip snapshot bundled with the app into Application Support. It does not fetch from GitHub directly, and it keeps your Paperclip data directory intact.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("The bundled Paperclip runtime could not be inspected yet.")
                        .foregroundStyle(.secondary)

                    Button("Retry Runtime Check") {
                        model.refreshRuntimeStatus()
                    }
                }
            }

            Section("Upstream GitHub") {
                if let upstreamRelease = model.upstreamRelease {
                    LabeledContent("Latest Commit", value: upstreamRelease.shortRevision)
                    LabeledContent("Default Branch", value: upstreamRelease.defaultBranch)

                    if let publishedAt = upstreamRelease.publishedAt {
                        LabeledContent("Published", value: publishedAt.formatted(date: .abbreviated, time: .shortened))
                    }

                    Text(upstreamRelease.message)
                        .foregroundStyle(.secondary)

                    if let htmlURL = upstreamRelease.htmlURL {
                        Link("View Commit on GitHub", destination: htmlURL)
                    }
                } else {
                    Text("No upstream Paperclip release has been checked yet.")
                        .foregroundStyle(.secondary)
                }

                recommendationView(model.upstreamUpdateRecommendation)

                if let upstreamReleaseMessage = model.upstreamReleaseMessage {
                    Text(upstreamReleaseMessage)
                        .foregroundStyle(.green)
                }

                HStack {
                    Button("Check for Upstream Update") {
                        Task {
                            await model.checkForUpstreamRuntimeUpdate()
                        }
                    }
                    .disabled(model.isCheckingUpstreamRelease || model.isInstallingUpstreamRelease)

                    if model.isCheckingUpstreamRelease {
                        ProgressView()
                            .controlSize(.small)
                    }

                    Button("Install Latest from GitHub") {
                        Task {
                            await model.installLatestUpstreamRuntime()
                        }
                    }
                    .disabled(model.isCheckingUpstreamRelease || model.isInstallingUpstreamRelease || model.upstreamRelease == nil)

                    if model.isInstallingUpstreamRelease {
                        ProgressView()
                            .controlSize(.small)
                    }
                }

                Text("This checks GitHub for the latest Paperclip commit, downloads the source snapshot directly, and installs it locally without overwriting your Paperclip data directory.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .formStyle(.grouped)
        .task {
            model.refreshRuntimeStatus()
        }
    }

    @ViewBuilder
    private func recommendationView(_ recommendation: UpstreamUpdateRecommendation) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(recommendation.title)
                .font(.headline)

            Text(recommendation.message)
                .foregroundStyle(recommendationColor(for: recommendation.tone))
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            RoundedRectangle(cornerRadius: 12)
                .fill(.quaternary.opacity(0.35))
        }
    }

    private func recommendationColor(for tone: UpstreamUpdateRecommendation.Tone) -> Color {
        switch tone {
        case .neutral:
            return .secondary
        case .positive:
            return .green
        case .caution:
            return .orange
        }
    }
}
