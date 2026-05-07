import AppKit
import SwiftUI

private struct CapabilityStatus {
    let title: String
    let detail: String
    let tone: CapabilityTone
    let systemImage: String
    let lastChecked: Date?
    let latestResult: String?
    let latestError: String?
}

private enum CapabilityTone {
    case good
    case working
    case warning
    case bad
    case neutral

    var color: Color {
        switch self {
        case .good:
            .green
        case .working:
            .blue
        case .warning:
            .orange
        case .bad:
            .red
        case .neutral:
            .secondary
        }
    }

    var label: String {
        switch self {
        case .good:
            "Ready"
        case .working:
            "Working"
        case .warning:
            "Needs Setup"
        case .bad:
            "Failed"
        case .neutral:
            "Unknown"
        }
    }
}

struct DiagnosticsSettingsView: View {
    @Bindable var model: DesktopAppModel
    @State private var selectedRunID: String?

    private let columns = [GridItem(.adaptive(minimum: 310, maximum: 420), spacing: 16)]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                overviewBand
                capabilityGrid
                watchdogSection
                runtimeSection
                runDiagnosticsSection
            }
            .padding(24)
            .frame(maxWidth: 980, alignment: .leading)
        }
        .background(Color(nsColor: .windowBackgroundColor))
        .task {
            model.refreshRuntimeStatus()
            await model.refreshDesktopSidebar()
            await model.refreshPluginHealth()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Control Center")
                .font(.largeTitle.bold())

            Text("Check what is installed, what is running, what was last tested, and what Paperclip can do next without leaving the app.")
                .foregroundStyle(.secondary)
        }
    }

    private var overviewBand: some View {
        HStack(spacing: 12) {
            overviewPill(
                title: "Paperclip Server",
                value: paperclipServerStatus.title,
                tone: paperclipServerStatus.tone,
                systemImage: paperclipServerStatus.systemImage
            )
            overviewPill(
                title: "Ollama",
                value: ollamaCapabilityStatus.title,
                tone: ollamaCapabilityStatus.tone,
                systemImage: ollamaCapabilityStatus.systemImage
            )
            overviewPill(
                title: "Watchdog",
                value: watchdogCapabilityStatus.title,
                tone: watchdogCapabilityStatus.tone,
                systemImage: watchdogCapabilityStatus.systemImage
            )
            Spacer()
            Text(lastRefreshSummary)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private var capabilityGrid: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Capabilities")
                .font(.title3.weight(.semibold))

            LazyVGrid(columns: columns, alignment: .leading, spacing: 16) {
                capabilityCard(status: paperclipServerStatus) {
                    HStack {
                        Button("Refresh") {
                            model.refreshRuntimeStatus()
                            Task { await model.refreshDesktopSidebar() }
                        }

                        if case .running = model.processManager.runtimeState {
                            Button("Restart") {
                                Task { await model.restartServer() }
                            }
                        } else if case .starting = model.processManager.runtimeState {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Button("Start") {
                                Task { await model.startServer() }
                            }
                        }
                    }
                }

                capabilityCard(status: ollamaCapabilityStatus) {
                    HStack {
                        Button("Refresh") {
                            Task {
                                await model.refreshOllamaStatus()
                                await model.refreshModelInventory()
                                await model.refreshDesktopSidebar()
                            }
                        }

                        if model.ollamaControlSummary.canRestartManagedOllama {
                            Button("Restart Ollama") {
                                Task { await model.restartOllamaFromDiagnostics() }
                            }
                        }
                    }
                }

                capabilityCard(status: localModelCapabilityStatus) {
                    HStack {
                        Button("Refresh") {
                            model.refreshLocalModelRuntime()
                            Task {
                                await model.refreshOllamaStatus()
                                await model.refreshModelInventory()
                            }
                        }

                        Button("Test") {
                            Task { await model.testLocalModel() }
                        }
                        .disabled(model.isTestingLocalModel)
                    }
                }

                capabilityCard(status: webSearchCapabilityStatus) {
                    HStack {
                        Button("Refresh") {
                            Task { await model.refreshPluginHealth() }
                        }
                        .disabled(model.isRefreshingPluginHealth)

                        Button("Test") {
                            Task { await model.testWebSearch() }
                        }
                        .disabled(model.isTestingWebSearch)
                    }
                }

                capabilityCard(status: codexCapabilityStatus) {
                    HStack {
                        Button("Repair Agents") {
                            Task { await model.repairBrokenRuntimeAgents() }
                        }
                        .disabled(model.isRepairingRuntimeAgents)

                        Button("Refresh") {
                            Task { await model.refreshDesktopSidebar() }
                        }
                    }
                }

                capabilityCard(status: filesCapabilityStatus) {
                    HStack {
                        Button("Open Workspace") {
                            NSWorkspace.shared.activateFileViewerSelecting([DesktopPaths.paperclipHomeDirectory])
                        }

                        if let selectedCompanyDirectory {
                            Button("Open Company") {
                                NSWorkspace.shared.activateFileViewerSelecting([selectedCompanyDirectory])
                            }
                        }
                    }
                }
            }
        }
    }

    private var watchdogSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Watchdog")
                .font(.title3.weight(.semibold))

            HStack(alignment: .top, spacing: 16) {
                capabilityCard(status: watchdogCapabilityStatus) {
                    HStack {
                        Button("Refresh") {
                            Task { await model.refreshDesktopSidebar() }
                        }

                        Button("Restart Ollama") {
                            Task { await model.restartOllamaFromDiagnostics() }
                        }
                        .disabled(!model.ollamaControlSummary.canRestartManagedOllama)
                    }
                }
                .frame(maxWidth: 420)

                VStack(alignment: .leading, spacing: 10) {
                    Text("Latest Watchdog Event")
                        .font(.headline)

                    if let event = model.latestWatchdogEvent {
                        Text("\(event.action.displayName) at \(timeLabel(for: event.occurredAt))")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                        Text(event.reason)
                            .font(.body)
                        Text(event.detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                    } else {
                        Text("No watchdog actions recorded in this app session.")
                            .foregroundStyle(.secondary)
                    }

                    Text(model.ollamaControlSummary.policyDetail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)

                    if !model.recentWatchdogEvents.isEmpty {
                        Divider()

                        ForEach(model.recentWatchdogEvents.prefix(4)) { event in
                            VStack(alignment: .leading, spacing: 3) {
                                Text("\(event.action.displayName) · \(timeLabel(for: event.occurredAt))")
                                    .font(.caption.weight(.semibold))
                                Text(event.reason)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                Text(event.detail)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var runtimeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Runtime")
                .font(.title3.weight(.semibold))

            Grid(alignment: .leading, horizontalSpacing: 18, verticalSpacing: 8) {
                runtimeRow("Installed revision", model.runtimeStatus?.installedRevision ?? "Not installed")
                runtimeRow("Installed source", model.runtimeStatus?.installedOriginDisplay ?? "Unknown")
                runtimeRow("Bundled revision", model.runtimeStatus?.bundledSourceMetadata.revision ?? model.runtimeStatus?.bundledSourceSignature ?? "Unknown")
                runtimeRow("Current workspace", DesktopPaths.paperclipHomeDirectory.path)
                runtimeRow("Latest sidebar refresh", model.lastSidebarRefreshAt.map(relativeTimestamp) ?? "Not checked yet")
            }

            if let message = model.runtimeStatusMessage {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }
        }
    }

    private var runDiagnosticsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Run Diagnostics")
                .font(.title3.weight(.semibold))

            if model.latestRunDiagnostics.isEmpty {
                Text("No run diagnostics yet. Start an agent run and this panel will show the latest timeline, timing, tool calls, and result summary.")
                    .foregroundStyle(.secondary)
            } else {
                Picker("Run", selection: selectedRunBinding) {
                    ForEach(model.latestRunDiagnostics, id: \.runId) { diagnostic in
                        Text(runPickerLabel(for: diagnostic)).tag(diagnostic.runId)
                    }
                }
                .pickerStyle(.menu)
                .frame(maxWidth: 420, alignment: .leading)

                if let selectedRunDiagnostic {
                    RunDetailView(
                        diagnostic: selectedRunDiagnostic,
                        runSummary: selectedRunSummary,
                        formatDuration: formatDuration
                    )
                }
            }
        }
    }

    @ViewBuilder
    private func capabilityCard<Actions: View>(
        status: CapabilityStatus,
        @ViewBuilder actions: () -> Actions
    ) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: status.systemImage)
                    .foregroundStyle(status.tone.color)
                    .frame(width: 18)

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text(statusTitle(for: status))
                            .font(.headline)
                        Text(status.title)
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 3)
                            .background(Capsule().fill(status.tone.color.opacity(0.14)))
                            .foregroundStyle(status.tone.color)
                    }

                    Text(status.detail)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .textSelection(.enabled)
                }
            }

            if let lastChecked = status.lastChecked {
                metaRow("Last checked", relativeTimestamp(lastChecked))
            }

            if let latestResult = status.latestResult, !latestResult.isEmpty {
                metaRow("Latest result", latestResult)
            }

            if let latestError = status.latestError, !latestError.isEmpty {
                metaRow("Last error", latestError, color: .red)
            }

            Divider()

            HStack {
                actions()
                Spacer()
            }
        }
        .padding(16)
        .background(RoundedRectangle(cornerRadius: 8).fill(Color.secondary.opacity(0.07)))
    }

    @ViewBuilder
    private func runtimeRow(_ label: String, _ value: String) -> some View {
        GridRow {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption)
                .textSelection(.enabled)
        }
    }

    @ViewBuilder
    private func metaRow(_ label: String, _ value: String, color: Color = .secondary) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(label)
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption)
                .foregroundStyle(color)
                .textSelection(.enabled)
        }
    }

    private func overviewPill(title: String, value: String, tone: CapabilityTone, systemImage: String) -> some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.caption2)
                Text(value)
                    .font(.caption.weight(.semibold))
            }
        } icon: {
            Image(systemName: systemImage)
                .foregroundStyle(tone.color)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(Capsule().fill(tone.color.opacity(0.10)))
    }

    private var selectedRunBinding: Binding<String> {
        Binding(
            get: { selectedRunID ?? model.latestRunDiagnostics.first?.runId ?? "" },
            set: { selectedRunID = $0 }
        )
    }

    private var selectedRunDiagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic? {
        let resolvedID = selectedRunID ?? model.latestRunDiagnostics.first?.runId
        return model.latestRunDiagnostics.first(where: { $0.runId == resolvedID })
    }

    private var selectedRunSummary: DesktopSidebarRunSummary? {
        guard let selectedRunID = selectedRunDiagnostic?.runId,
              model.sidebarSnapshot?.latestLocalRun?.runID == selectedRunID else {
            return nil
        }
        return model.sidebarSnapshot?.latestLocalRun
    }

    private var selectedCompanyDirectory: URL? {
        guard let companyID = model.selectedCompanyID ?? model.companies.first?.id else {
            return nil
        }
        return DesktopPaths.companyFilesDirectory(id: companyID)
    }

    private var lastRefreshSummary: String {
        let sidebar = model.lastSidebarRefreshAt.map(relativeTimestamp) ?? "not checked"
        let plugin = model.lastPluginHealthRefreshAt.map(relativeTimestamp) ?? "not checked"
        return "Sidebar \(sidebar) · plugin health \(plugin)"
    }

    private var paperclipServerStatus: CapabilityStatus {
        switch model.processManager.runtimeState {
        case .running(let url):
            return CapabilityStatus(
                title: "Running",
                detail: "Server is live at \(url.absoluteString).",
                tone: .good,
                systemImage: "server.rack",
                lastChecked: model.lastSidebarRefreshAt,
                latestResult: model.runtimeStatusMessage,
                latestError: nil
            )
        case .starting:
            return CapabilityStatus(
                title: "Starting",
                detail: "Paperclip server is starting and preparing local services.",
                tone: .working,
                systemImage: "server.rack",
                lastChecked: model.lastSidebarRefreshAt,
                latestResult: model.runtimeStatusMessage,
                latestError: nil
            )
        case .failed(let message):
            return CapabilityStatus(
                title: "Failed",
                detail: "Paperclip server is not available right now.",
                tone: .bad,
                systemImage: "server.rack",
                lastChecked: model.lastSidebarRefreshAt,
                latestResult: model.runtimeStatusMessage,
                latestError: message
            )
        case .stopped:
            return CapabilityStatus(
                title: "Stopped",
                detail: "Start the server to use agents, plugins, and live runs.",
                tone: .warning,
                systemImage: "server.rack",
                lastChecked: model.lastSidebarRefreshAt,
                latestResult: model.runtimeStatusMessage,
                latestError: nil
            )
        }
    }

    private var ollamaCapabilityStatus: CapabilityStatus {
        let summary = model.ollamaControlSummary
        let latestResult = relevantMessage(
            primary: model.localModelMessage,
            secondary: model.diagnosticsMessage,
            containsAny: ["ollama", "local model"]
        )

        return CapabilityStatus(
            title: summary.title,
            detail: "\(summary.detail) \(summary.policyDetail)",
            tone: tone(for: summary),
            systemImage: "cpu",
            lastChecked: model.lastSidebarRefreshAt,
            latestResult: latestResult,
            latestError: summary.state == .offline ? latestResult : nil
        )
    }

    private var localModelCapabilityStatus: CapabilityStatus {
        guard model.config.localModel.isEnabled else {
            return CapabilityStatus(
                title: "Off",
                detail: "Local AI is disabled. Turn it on in Models to run through Ollama.",
                tone: .neutral,
                systemImage: "memorychip",
                lastChecked: model.lastLocalModelTestAt ?? model.lastSidebarRefreshAt,
                latestResult: nil,
                latestError: nil
            )
        }

        let selected = LocalModelCatalog.option(for: model.config.localModel.selectedModelID)
        let isInstalled = model.installedOllamaModels.contains(where: { $0.name == selected.ollamaTag })
        let isLoaded = model.sidebarSnapshot?.ollamaStatus?.runningModels.contains(where: { $0.name == selected.ollamaTag }) == true
        let title = isLoaded ? "Loaded" : (isInstalled ? "Installed" : "Needs Download")
        let detail = isInstalled
            ? "\(selected.displayName) is available on this Mac."
            : "\(selected.displayName) is selected but not installed yet."

        return CapabilityStatus(
            title: title,
            detail: detail,
            tone: isInstalled ? .good : .warning,
            systemImage: "memorychip",
            lastChecked: model.lastLocalModelTestAt ?? model.lastSidebarRefreshAt,
            latestResult: relevantMessage(
                primary: model.diagnosticsMessage,
                secondary: model.modelManagerMessage ?? model.localModelMessage,
                containsAny: ["local model", "ollama responded", "test passed", "test failed"]
            ),
            latestError: errorMessage(
                from: relevantMessage(
                    primary: model.diagnosticsMessage,
                    secondary: model.modelManagerMessage ?? model.localModelMessage,
                    containsAny: ["local model", "test failed", "could not"]
                )
            )
        )
    }

    private var webSearchCapabilityStatus: CapabilityStatus {
        CapabilityStatus(
            title: model.webSearchCapabilitySummary.title,
            detail: model.webSearchCapabilitySummary.detail,
            tone: tone(for: model.webSearchCapabilitySummary.state),
            systemImage: "globe",
            lastChecked: model.lastWebSearchTestAt ?? model.lastPluginHealthRefreshAt,
            latestResult: relevantMessage(
                primary: model.diagnosticsMessage,
                secondary: model.pluginHealthMessage,
                containsAny: ["web search", "plugin", "worker"]
            ),
            latestError: errorMessage(
                from: relevantMessage(
                    primary: model.diagnosticsMessage,
                    secondary: model.pluginHealthMessage,
                    containsAny: ["failed", "error", "not healthy"]
                )
            )
        )
    }

    private var codexCapabilityStatus: CapabilityStatus {
        let detail: String
        let tone: CapabilityTone

        if let runtimeAgentMessage = model.runtimeAgentMessage {
            detail = runtimeAgentMessage
            tone = runtimeAgentMessage.localizedCaseInsensitiveContains("no supported") ? .warning : .working
        } else if model.config.localModel.useAsPrimaryModel {
            detail = "Compatible agents are repaired toward local Codex and Ollama settings when the server is running."
            tone = .working
        } else {
            detail = "Local Codex repair becomes active if you switch Models to local AI."
            tone = .neutral
        }

        return CapabilityStatus(
            title: model.config.localModel.useAsPrimaryModel ? "Local Mode" : "Cloud Mode",
            detail: detail,
            tone: tone,
            systemImage: "terminal",
            lastChecked: model.lastSidebarRefreshAt,
            latestResult: model.runtimeAgentMessage,
            latestError: errorMessage(from: model.runtimeAgentMessage)
        )
    }

    private var filesCapabilityStatus: CapabilityStatus {
        let exists = FileManager.default.fileExists(atPath: DesktopPaths.paperclipHomeDirectory.path)
        return CapabilityStatus(
            title: exists ? "Available" : "Not Created",
            detail: exists
                ? DesktopPaths.paperclipHomeDirectory.path
                : "The workspace directory will be created during setup or server startup.",
            tone: exists ? .good : .warning,
            systemImage: "folder",
            lastChecked: nil,
            latestResult: selectedCompanyDirectory?.path,
            latestError: nil
        )
    }

    private var watchdogCapabilityStatus: CapabilityStatus {
        CapabilityStatus(
            title: model.watchdogStatusSummary.title,
            detail: model.watchdogStatusSummary.detail,
            tone: tone(for: model.watchdogStatusSummary.state),
            systemImage: "waveform.path.badge.exclamationmark",
            lastChecked: model.lastSidebarRefreshAt,
            latestResult: model.latestWatchdogEvent?.summary,
            latestError: model.latestWatchdogEvent?.action == .failed ? model.latestWatchdogEvent?.detail : nil
        )
    }

    private func runPickerLabel(for diagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic) -> String {
        let shortID = String(diagnostic.runId.prefix(8))
        return "\(shortID) · \(diagnostic.status) · \(diagnostic.adapterType ?? "unknown")"
    }

    private func statusTitle(for status: CapabilityStatus) -> String {
        switch status.systemImage {
        case "server.rack":
            "Paperclip Server"
        case "cpu":
            "Ollama"
        case "memorychip":
            "Local Model"
        case "globe":
            "Web Search"
        case "terminal":
            "Codex"
        case "folder":
            "Files / Workspace"
        case "waveform.path.badge.exclamationmark":
            "Watchdog"
        default:
            status.tone.label
        }
    }

    private func relevantMessage(primary: String?, secondary: String?, containsAny tokens: [String]) -> String? {
        let candidates = [primary, secondary].compactMap { $0 }
        guard !tokens.isEmpty else { return candidates.first }
        return candidates.first { message in
            let lowercased = message.lowercased()
            return tokens.contains(where: { lowercased.contains($0) })
        } ?? candidates.first
    }

    private func errorMessage(from message: String?) -> String? {
        guard let message else { return nil }
        let lowered = message.lowercased()
        guard lowered.contains("failed")
                || lowered.contains("error")
                || lowered.contains("not healthy")
                || lowered.contains("could not")
                || lowered.contains("not responding")
        else {
            return nil
        }
        return message
    }

    private func formatDuration(_ seconds: Double) -> String {
        let rounded = max(0, Int(seconds.rounded()))
        if rounded < 60 {
            return "\(rounded)s"
        }
        return "\(rounded / 60)m \(rounded % 60)s"
    }

    private func relativeTimestamp(_ date: Date) -> String {
        let seconds = max(0, Int(Date.now.timeIntervalSince(date)))
        if seconds < 60 {
            return "\(seconds)s ago"
        }
        if seconds < 3600 {
            return "\(seconds / 60)m ago"
        }
        return "\(seconds / 3600)h ago"
    }

    private func timeLabel(for date: Date) -> String {
        date.formatted(date: .omitted, time: .standard)
    }

    private func tone(for summary: OllamaControlSummary) -> CapabilityTone {
        switch summary.state {
        case .managed:
            return model.sidebarSnapshot?.ollamaStatus?.isReachable == true ? .good : .working
        case .external:
            return .working
        case .offline:
            return .warning
        }
    }

    private func tone(for state: DesktopCapabilityHealthState) -> CapabilityTone {
        switch state {
        case .ready:
            .good
        case .working:
            .working
        case .warning:
            .warning
        case .bad:
            .bad
        case .neutral:
            .neutral
        }
    }

    private func tone(for state: DesktopWatchdogState) -> CapabilityTone {
        switch state {
        case .healthy:
            .good
        case .slowNoOutput:
            .warning
        case .ollamaNotResponding, .failedRecovery:
            .bad
        case .restartingManagedOllama:
            .working
        case .recovered:
            .good
        case .unavailable:
            .neutral
        }
    }
}
