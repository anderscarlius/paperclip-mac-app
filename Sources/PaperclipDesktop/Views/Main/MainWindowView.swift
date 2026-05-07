import AppKit
import PaperclipShared
import SwiftUI

struct MainWindowView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        NavigationSplitView {
            DesktopOverviewSidebar(model: model)
            .navigationSplitViewColumnWidth(min: 220, ideal: 260)
        } detail: {
            ZStack {
                VStack(spacing: 0) {
                    StatusBarView(model: model)
                    Divider()

                    if case .running(let url) = model.processManager.runtimeState {
                        PaperclipWebView(url: url)
                    } else {
                        OfflineDashboardView(model: model)
                    }
                }

                if model.shouldShowStartupSplash {
                    StartupSplashView(model: model)
                }
            }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    model.showNewCompanyWizard = true
                } label: {
                    Label("New Company", systemImage: "plus")
                }
            }
        }
        .task {
            await model.autoStartServerIfNeeded()
            while !Task.isCancelled {
                await model.refreshDesktopSidebar()
                try? await Task.sleep(for: .seconds(5))
            }
        }
    }
}

private struct DesktopOverviewSidebar: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        List(selection: $model.selectedCompanyID) {
            Section("This Mac") {
                sidebarStatRow(
                    title: "Paperclip",
                    detail: paperclipDetail,
                    systemImage: "desktopcomputer",
                    badge: model.processManager.runtimeState.title,
                    badgeTone: paperclipTone
                )

                sidebarStatRow(
                    title: "Ollama",
                    detail: ollamaDetail,
                    systemImage: "cpu",
                    badge: model.ollamaControlSummary.title,
                    badgeTone: ollamaTone
                )

                sidebarStatRow(
                    title: "Web Search",
                    detail: webSearchDetail,
                    systemImage: "globe",
                    badge: model.webSearchCapabilitySummary.title,
                    badgeTone: webSearchTone
                )

                if let localModelActivity = model.sidebarSnapshot?.localModelActivity {
                    sidebarStatRow(
                        title: "Local Model",
                        detail: localModelDetail(for: localModelActivity),
                        systemImage: localModelSystemImage(for: localModelActivity.state),
                        badge: localModelBadge(for: localModelActivity),
                        badgeTone: localModelTone(for: localModelActivity)
                    )

                    localModelChooserRow
                }

                sidebarStatRow(
                    title: "Current Run",
                    detail: currentRunDetail,
                    systemImage: "bolt.horizontal.circle",
                    badge: currentRunBadge,
                    badgeTone: currentRunTone
                )

                sidebarStatRow(
                    title: "Watchdog",
                    detail: watchdogDetail,
                    systemImage: "waveform.path.badge.exclamationmark",
                    badge: model.watchdogStatusSummary.title,
                    badgeTone: watchdogTone
                )
            }

            Section("Quick Links") {
                Button {
                    openDirectory(selectedCompanyFilesDirectory)
                } label: {
                    Label("Selected Company Files", systemImage: "folder")
                }
                .disabled(selectedCompanyFilesDirectory == nil)

                Button {
                    openDirectory(DesktopPaths.companiesDirectory)
                } label: {
                    Label("All Company Folders", systemImage: "building.2")
                }

                Button {
                    openDirectory(DesktopPaths.sharedSkillsDirectory)
                } label: {
                    Label("Skill Library", systemImage: "sparkles")
                }
            }

            Section("Companies") {
                if !model.runtimeCompanies.isEmpty {
                    ForEach(model.runtimeCompanies, id: \.id) { company in
                        VStack(alignment: .leading, spacing: 3) {
                            Text(company.name)
                                .lineLimit(1)
                            Text(companySubtitle(for: company.id))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                        .tag(company.id)
                    }
                } else if !model.companies.isEmpty {
                    ForEach(model.companies) { company in
                        VStack(alignment: .leading, spacing: 3) {
                            Text(company.name)
                                .lineLimit(1)
                            Text("\(company.agents.count) agents · \(company.tasksInProgress) tasks")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                        .tag(company.id)
                    }
                } else {
                    Text("The desktop overview will fill in here after the first company is available.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .listStyle(.sidebar)
    }

    private var ollamaDetail: String {
        let summary = model.ollamaControlSummary
        let preferred = "Preferred: \(model.selectedLocalModelOption.displayName)"
        let loadedNames = model.loadedOllamaModelDisplayNames

        if summary.state == .managed,
           let status = model.sidebarSnapshot?.ollamaStatus,
           status.isReachable {
            let loaded = loadedNames.isEmpty ? "No model loaded right now" : "Loaded now: \(loadedNames.joined(separator: ", "))"
            let memory = status.totalVRAMBytes.map(bytesToGBLabel).map { "\($0) in memory" }
            return [summary.title, preferred, loaded, memory].compactMap { $0 }.joined(separator: " · ")
        }

        if summary.state == .external {
            let loaded = loadedNames.isEmpty ? "No model loaded right now" : "Loaded now: \(loadedNames.joined(separator: ", "))"
            let readiness = model.preferredLocalModelInstalled
                ? (model.preferredLocalModelLoaded ? "\(model.selectedLocalModelOption.displayName) is loaded now" : "\(model.selectedLocalModelOption.displayName) will load on demand")
                : "\(model.selectedLocalModelOption.displayName) is not installed yet"
            return [summary.title, preferred, loaded, readiness].joined(separator: " · ")
        }

        return [summary.title, preferred, summary.detail].joined(separator: " · ")
    }

    private var paperclipDetail: String {
        let server = model.processManager.runtimeState == .running(model.serverURL)
            ? "Local server is ready"
            : "Local server is not ready"
        guard let runtimeStatus = model.runtimeStatus else {
            return server
        }
        return "\(server) · \(runtimeStatus.installedSignatureDisplay)"
    }

    private var webSearchDetail: String {
        let summary = model.webSearchCapabilitySummary
        if summary.title == "Checking" {
            return "Checking now · It will verify itself as soon as Paperclip is ready."
        }
        return "\(summary.title) · \(summary.detail)"
    }

    private var currentRunDetail: String {
        if let activity = model.sidebarSnapshot?.localModelActivity,
           let runID = activity.runID {
            let diagnostic = model.latestRunDiagnostics.first(where: { $0.runId == runID })
            let agentName = diagnostic?.agentName ?? model.sidebarSnapshot?.latestLocalRun?.agentName ?? "Agent"
            let modelLabel = diagnostic?.model ?? model.sidebarSnapshot?.latestLocalRun?.model ?? "Local model"
            return [agentName, modelLabel, activity.detail].joined(separator: " · ")
        }

        if let latestLocalRun = model.sidebarSnapshot?.latestLocalRun {
            return latestRunDetail(for: latestLocalRun)
        }

        let active = model.sidebarSnapshot?.activeRunCount ?? 0
        let queued = model.sidebarSnapshot?.queuedRunCount ?? 0
        return active == 0 && queued == 0
            ? "No local run is active right now"
            : "\(active) running · \(queued) queued"
    }

    private var paperclipTone: Color {
        switch model.processManager.runtimeState {
        case .running:
            .green
        case .starting:
            .accentColor
        case .failed:
            .red
        case .stopped:
            .orange
        }
    }

    private var ollamaTone: Color {
        switch model.ollamaControlSummary.state {
        case .managed:
            .green
        case .external:
            .accentColor
        case .offline:
            .orange
        }
    }

    private var webSearchTone: Color {
        switch model.webSearchCapabilitySummary.state {
        case .ready:
            .green
        case .working:
            .accentColor
        case .warning:
            .orange
        case .bad:
            .red
        case .neutral:
            .secondary
        }
    }

    private var watchdogTone: Color {
        switch model.watchdogStatusSummary.state {
        case .healthy, .recovered:
            .green
        case .restartingManagedOllama:
            .accentColor
        case .slowNoOutput, .unavailable:
            .orange
        case .ollamaNotResponding, .failedRecovery:
            .red
        }
    }

    private var currentRunBadge: String {
        let active = model.sidebarSnapshot?.activeRunCount ?? 0
        let queued = model.sidebarSnapshot?.queuedRunCount ?? 0
        if active > 0 {
            return "Running"
        }
        if queued > 0 {
            return "Queued"
        }
        return "Idle"
    }

    private var currentRunTone: Color {
        let active = model.sidebarSnapshot?.activeRunCount ?? 0
        let queued = model.sidebarSnapshot?.queuedRunCount ?? 0
        if active > 0 {
            return .green
        }
        if queued > 0 {
            return .accentColor
        }
        return .secondary
    }

    private var selectedCompanyFilesDirectory: URL? {
        let companyID = model.selectedCompanyID
            ?? model.runtimeCompanies.first?.id
            ?? model.companies.first?.id
        guard let companyID else { return nil }
        return DesktopPaths.companyFilesDirectory(id: companyID)
    }

    private func latestRunDetail(for run: DesktopSidebarRunSummary) -> String {
        let outputRate = run.outputTokensPerSecond.map { String(format: "avg %.1f output tok/s", $0) }
        let outputTokens = run.outputTokens > 0 ? "\(run.outputTokens) output tokens" : nil
        let modelLabel = run.model ?? "Local model"
        return [run.agentName, modelLabel, run.status.capitalized, outputTokens, outputRate].compactMap { $0 }.joined(separator: " · ")
    }

    private var watchdogDetail: String {
        let summary = model.watchdogStatusSummary
        if let event = model.latestWatchdogEvent {
            return "\(summary.title) · \(event.reason)"
        }
        return summary.detail
    }

    private func localModelSystemImage(for state: DesktopLocalModelActivityState) -> String {
        switch state {
        case .idle:
            "cpu"
        case .starting, .loadingModel:
            "hourglass"
        case .waitingForOutput, .noOutput:
            "clock.badge.exclamationmark"
        case .writing:
            "waveform.path.ecg"
        case .notResponding:
            "exclamationmark.triangle"
        case .restarting:
            "arrow.clockwise"
        case .unavailable:
            "cpu"
        }
    }

    private func localModelDetail(for activity: DesktopLocalModelActivitySummary) -> String {
        let selected = model.selectedLocalModelOption.displayName
        if activity.state != .idle {
            return "\(selected) · \(activity.detail)"
        }
        return "\(selected) · \(model.localModelReadinessDetail)"
    }

    private func localModelBadge(for activity: DesktopLocalModelActivitySummary) -> String {
        switch activity.state {
        case .idle:
            model.localModelReadinessTitle
        case .starting:
            "Starting"
        case .loadingModel:
            "Loading"
        case .waitingForOutput:
            "Waiting"
        case .noOutput:
            "No Output"
        case .writing:
            "Writing"
        case .notResponding:
            "Offline"
        case .restarting:
            "Restarting"
        case .unavailable:
            "Off"
        }
    }

    private func localModelTone(for activity: DesktopLocalModelActivitySummary) -> Color {
        switch activity.state {
        case .idle:
            if model.localModelReadinessTitle == "Ready" || model.localModelReadinessTitle == "Loaded Now" {
                .green
            } else if model.localModelReadinessTitle == "Needs Setup" {
                .orange
            } else {
                .secondary
            }
        case .unavailable:
            .secondary
        case .starting, .loadingModel, .waitingForOutput, .restarting:
            .accentColor
        case .writing:
            .green
        case .noOutput, .notResponding:
            .orange
        }
    }

    @ViewBuilder
    private var localModelChooserRow: some View {
        HStack(alignment: .top, spacing: 10) {
            Color.clear
                .frame(width: 16, height: 1)

            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 8) {
                    Menu {
                        Section("Installed on This Mac") {
                            if knownInstalledLocalModelOptions.isEmpty {
                                Text("No supported local model is installed yet")
                            } else {
                                ForEach(knownInstalledLocalModelOptions) { option in
                                    Button {
                                        chooseLocalModel(option)
                                    } label: {
                                        modelMenuLabel(for: option)
                                    }
                                }
                            }
                        }

                        Section("Other Models") {
                            ForEach(otherSelectableLocalModelOptions) { option in
                                Button {
                                    chooseLocalModel(option)
                                } label: {
                                    modelMenuLabel(for: option)
                                }
                            }
                        }
                    } label: {
                        HStack(spacing: 6) {
                            Text("Choose Model")
                            Spacer(minLength: 8)
                            Text(model.selectedLocalModelOption.displayName)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                            Image(systemName: "chevron.up.chevron.down")
                                .foregroundStyle(.secondary)
                        }
                        .font(.caption.weight(.medium))
                    }
                    .menuStyle(.borderlessButton)

                    Button {
                        NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
                    } label: {
                        Image(systemName: "slider.horizontal.3")
                    }
                    .buttonStyle(.plain)
                    .help("Open model settings")
                }

                if !model.installedOllamaModelDisplayNames.isEmpty {
                    Text("Installed here: \(model.installedOllamaModelDisplayNames.joined(separator: ", "))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                } else {
                    Text("No local model is installed here yet.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func companySubtitle(for companyID: String) -> String {
        if let company = model.companies.first(where: { $0.id == companyID }) {
            return "\(company.agents.count) agents · \(company.tasksInProgress) tasks"
        }
        return "Live company"
    }

    @ViewBuilder
    private func sidebarStatRow(
        title: String,
        detail: String,
        systemImage: String,
        badge: String? = nil,
        badgeTone: Color = .secondary
    ) -> some View {
        HStack(spacing: 10) {
            Image(systemName: systemImage)
                .foregroundStyle(.secondary)
                .frame(width: 16)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(title)
                        .lineLimit(1)

                    if let badge, !badge.isEmpty {
                        Text(badge)
                            .font(.caption2.weight(.semibold))
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Capsule().fill(badgeTone.opacity(0.16)))
                            .foregroundStyle(badgeTone)
                    }
                }
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        }
    }

    private func bytesToGBLabel(_ bytes: Int64) -> String {
        let value = Double(bytes) / 1_073_741_824
        return String(format: "%.1f GB", value)
    }

    private func openDirectory(_ url: URL?) {
        guard let url else { return }
        NSWorkspace.shared.activateFileViewerSelecting([url])
    }

    private var knownInstalledLocalModelOptions: [LocalModelOption] {
        let installedTags = Set(model.installedOllamaModelNames)
        return LocalModelCatalog.gemma4.filter { installedTags.contains($0.ollamaTag) }
    }

    private var otherSelectableLocalModelOptions: [LocalModelOption] {
        let installedIDs = Set(knownInstalledLocalModelOptions.map(\.id))
        return LocalModelCatalog.gemma4.filter { !installedIDs.contains($0.id) }
    }

    @ViewBuilder
    private func modelMenuLabel(for option: LocalModelOption) -> some View {
        let badges = modelOptionBadges(for: option)
        VStack(alignment: .leading, spacing: 2) {
            Text(option.displayName)
            Text(([option.downloadSizeSummary] + badges).joined(separator: " · "))
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }

    private func modelOptionBadges(for option: LocalModelOption) -> [String] {
        var badges: [String] = []
        if model.config.localModel.selectedModelID == option.id {
            badges.append("selected")
        }
        if model.installedOllamaModelNames.contains(option.ollamaTag) {
            badges.append("installed")
        }
        if model.loadedOllamaModelNames.contains(option.ollamaTag) {
            badges.append("loaded now")
        }
        if option.id == model.recommendedLocalModelOption().id {
            badges.append("recommended")
        }
        return badges
    }

    private func chooseLocalModel(_ option: LocalModelOption) {
        model.choosePreferredLocalModel(option)
        Task {
            await model.refreshOllamaStatus()
            await model.refreshModelInventory()
            await model.refreshDesktopSidebar()
        }
    }
}

private struct StartupSplashView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        ZStack {
            Rectangle()
                .fill(.regularMaterial)
                .ignoresSafeArea()

            VStack(alignment: .leading, spacing: 22) {
                HStack(alignment: .center, spacing: 16) {
                    Image(systemName: "paperclip.circle.fill")
                        .font(.system(size: 56))
                        .foregroundStyle(Color.accentColor)

                    VStack(alignment: .leading, spacing: 6) {
                        Text("Paperclip Desktop")
                            .font(.largeTitle.bold())
                        Text("Preparing your local control center")
                            .foregroundStyle(.secondary)
                    }
                }

                VStack(alignment: .leading, spacing: 12) {
                    splashRow(
                        "Paperclip Server",
                        detail: serverSplashDetail,
                        state: model.processManager.runtimeState == .starting ? .working : .good
                    )
                    splashRow(
                        "Ollama",
                        detail: ollamaSplashDetail,
                        state: model.ollamaControlSummary.state == .offline ? .working : .good
                    )
                    splashRow(
                        "Web Search",
                        detail: webSearchSplashDetail,
                        state: model.webSearchCapabilitySummary.title == "Ready" ? .good : .working
                    )
                }

                HStack(spacing: 10) {
                    ProgressView()
                        .controlSize(.small)
                    Text(startupHeadline)
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(.secondary)
                }
            }
            .padding(32)
            .frame(maxWidth: 560, alignment: .leading)
        }
    }

    private var startupHeadline: String {
        switch model.processManager.runtimeState {
        case .starting:
            return "Starting services and checking local capabilities"
        case .running:
            return "Finishing the last checks before the dashboard appears"
        case .stopped, .failed:
            return "Preparing Paperclip Desktop"
        }
    }

    private var serverSplashDetail: String {
        switch model.processManager.runtimeState {
        case .starting:
            return "Starting the embedded Paperclip server"
        case .running:
            return "Server is ready"
        case .failed(let message):
            return message
        case .stopped:
            return "Waiting to start the embedded server"
        }
    }

    private var ollamaSplashDetail: String {
        let loaded = model.loadedOllamaModelNames
        if !loaded.isEmpty {
            return "Preferred \(model.selectedLocalModelOption.displayName) · loaded now \(loaded.joined(separator: ", "))"
        }
        return "Preferred \(model.selectedLocalModelOption.displayName)"
    }

    private var webSearchSplashDetail: String {
        let summary = model.webSearchCapabilitySummary
        if summary.title == "Checking" || summary.title == "Unknown" {
            return "Checking when the server is ready"
        }
        return summary.detail
    }

    @ViewBuilder
    private func splashRow(_ title: String, detail: String, state: SplashState) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Circle()
                .fill(state.color)
                .frame(width: 9, height: 9)
                .padding(.top, 5)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                Text(detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private enum SplashState {
    case good
    case working

    var color: Color {
        switch self {
        case .good:
            .green
        case .working:
            .accentColor
        }
    }
}

private struct OfflineDashboardView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                VStack(alignment: .leading, spacing: 8) {
                    statusHeader
                }

                HStack(spacing: 12) {
                    if model.processManager.runtimeState != .starting {
                        Button("Start Server") {
                            Task { await model.startServer() }
                        }
                        .buttonStyle(.borderedProminent)
                    } else {
                        ProgressView()
                            .controlSize(.small)
                    }

                    Button("Open Settings") {
                        NSApp.sendAction(Selector(("showSettingsWindow:")), to: nil, from: nil)
                    }
                    .buttonStyle(.bordered)
                }

                if shouldShowLogs {
                    startupLogCard
                }

                if let company = model.selectedCompany ?? model.companies.first {
                    CompanySummaryCard(company: company, model: model)
                } else {
                    ContentUnavailableView(
                        "No Companies Yet",
                        systemImage: "building.2",
                        description: Text("Create your first company from the toolbar to generate local instructions and agent structure.")
                    )
                }
            }
            .padding(28)
        }
        .background(Color(nsColor: .windowBackgroundColor))
    }

    @ViewBuilder
    private var statusHeader: some View {
        switch model.processManager.runtimeState {
        case .starting:
            Text("Starting Paperclip server")
                .font(.largeTitle.bold())

            Text("First launch can take a little while while Paperclip is copied, dependencies are installed, and the local runtime is onboarded.")
                .foregroundStyle(.secondary)
        case .failed(let message):
            Text("Paperclip server couldn't start")
                .font(.largeTitle.bold())

            Text(message)
                .foregroundStyle(.secondary)
        case .stopped:
            Text("Paperclip server is stopped")
                .font(.largeTitle.bold())

            Text("The native shell is ready. Start the embedded runtime to open the full Paperclip dashboard.")
                .foregroundStyle(.secondary)
        case .running:
            Text("Paperclip server is running")
                .font(.largeTitle.bold())

            Text("The dashboard should appear automatically once the embedded web UI is ready.")
                .foregroundStyle(.secondary)
        }
    }

    private var shouldShowLogs: Bool {
        switch model.processManager.runtimeState {
        case .failed:
            true
        case .stopped, .running:
            !model.processManager.logOutput.isEmpty
        case .starting:
            false
        }
    }

    private var startupLogCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Server Log")
                .font(.headline)

            ScrollView {
                Text(model.processManager.logOutput.isEmpty ? "No log output yet." : model.processManager.logOutput)
                    .font(.system(.caption, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
            }
            .frame(minHeight: 160, maxHeight: 240)
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.background)
        )
    }
}

private struct CompanySummaryCard: View {
    let company: Company
    @Bindable var model: DesktopAppModel

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text(company.name)
                        .font(.title2.bold())
                    Text(company.goal)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    Text("$\(company.spendToday, specifier: "%.2f")")
                        .font(.title3.monospacedDigit())
                    Text("Spend today")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            VStack(alignment: .leading, spacing: 12) {
                Text("Agents")
                    .font(.headline)

                ForEach(company.agents) { agent in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(agent.name)
                            Text("\(agent.role.title) · \(ModelCatalog.option(for: agent.modelID).displayName)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        Button("Edit Instructions") {
                            model.openInstructionEditor(for: company, agent: agent)
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(.background)
        )
    }
}
