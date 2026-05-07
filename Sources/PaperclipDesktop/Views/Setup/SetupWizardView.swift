import PaperclipShared
import SwiftUI

struct SetupWizardView: View {
    @Bindable var model: DesktopAppModel

    @State private var step = 0
    @State private var providerKeys: [LLMProvider: String]
    @State private var selectedCloudModelID: String
    @State private var selectedLocalModelID: String
    @State private var selectedModelTrack: OnboardingModelTrack
    @State private var selectedTemplateID: String
    @State private var companyName = ""
    @State private var companyGoal = ""

    private let steps = ["Welcome", "Runtime", "Model", "Company", "Test"]

    init(model: DesktopAppModel) {
        self.model = model

        let resolvedTrack: OnboardingModelTrack = model.config.localModel.useAsPrimaryModel ? .localAI : .cloudFirst
        let resolvedCloudModelID = ModelCatalog.cloudRecommended.first(where: { $0.id == model.config.defaultModelID })?.id
            ?? ModelCatalog.cloudRecommended[0].id
        let resolvedLocalModelID = LocalModelCatalog.gemma4.first(where: { $0.id == model.config.localModel.selectedModelID })?.id
            ?? LocalModelCatalog.gemma4[1].id

        _providerKeys = State(initialValue: model.providerKeyDrafts)
        _selectedCloudModelID = State(initialValue: resolvedCloudModelID)
        _selectedLocalModelID = State(initialValue: resolvedLocalModelID)
        _selectedModelTrack = State(initialValue: resolvedTrack)
        _selectedTemplateID = State(initialValue: CompanyTemplateCatalog.soloFounder.id)
        _companyName = State(initialValue: model.config.onboarding.initialCompanyName ?? "")
        _companyGoal = State(initialValue: model.config.onboarding.initialCompanyGoal ?? "")
    }

    var body: some View {
        VStack(spacing: 0) {
            header

            Divider()

            Group {
                switch step {
                case 0:
                    WelcomeStepView()
                case 1:
                    SetupRuntimeStepView(
                        model: model,
                        selectedModelTrack: selectedModelTrack
                    )
                case 2:
                    ModelSelectionStepView(
                        model: model,
                        providerKeys: $providerKeys,
                        modelTrack: $selectedModelTrack,
                        selectedCloudModelID: $selectedCloudModelID,
                        selectedLocalModelID: $selectedLocalModelID
                    )
                case 3:
                    CompanyStepView(
                        selectedTemplateID: $selectedTemplateID,
                        companyName: $companyName,
                        companyGoal: $companyGoal
                    )
                default:
                    SetupVerificationStepView(model: model)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Divider()

            footer
        }
        .background(.regularMaterial)
        .task {
            model.refreshRuntimeStatus()
            model.refreshLocalModelRuntime()
            await model.refreshOllamaStatus()
            await model.refreshModelInventory()
        }
        .onChange(of: selectedModelTrack) { _, newValue in
            if newValue == .localAI {
                model.config.localModel.isEnabled = true
                model.config.localModel.useAsPrimaryModel = true
                model.config.localModel.selectedModelID = selectedLocalModelID
                model.refreshLocalModelRuntime()
            }
        }
        .onChange(of: selectedLocalModelID) { _, newValue in
            model.config.localModel.selectedModelID = newValue
            model.refreshLocalModelRuntime()
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Paperclip Desktop")
                .font(.largeTitle.bold())

            Text("Set up local Paperclip with a calm first start.")
                .foregroundStyle(.secondary)

            Text("This wizard checks the runtime, helps with Ollama and model setup, and creates your first company without asking you to manage Node, ports, Codex home, or Ollama CLI.")
                .font(.callout)
                .foregroundStyle(.secondary)

            HStack(spacing: 8) {
                ForEach(Array(steps.enumerated()), id: \.offset) { index, title in
                    setupStepPill(index: index, title: title)
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(32)
    }

    private var footer: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Button("Back") {
                    step = max(0, step - 1)
                }
                .disabled(step == 0 || model.isRunningSetupFlow)

                Spacer()

                if step < steps.count - 2 {
                    Button("Continue") {
                        step += 1
                    }
                    .buttonStyle(.borderedProminent)
                } else if step == steps.count - 2 {
                    Button("Create Company and Run Test") {
                        step = steps.count - 1
                        Task {
                            await model.runSetupFlow(
                                with: SetupWizardData(
                                    providerKeys: providerKeys,
                                    defaultModelID: selectedModelTrack == .cloudFirst ? selectedCloudModelID : selectedLocalModelID,
                                    modelTrack: selectedModelTrack,
                                    companyTemplateID: selectedTemplateID,
                                    companyName: resolvedCompanyName,
                                    companyGoal: companyGoal
                                )
                            )
                        }
                    }
                    .buttonStyle(.borderedProminent)
                } else if model.isRunningSetupFlow {
                    Label("Running Test", systemImage: "ellipsis")
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(.secondary)
                } else {
                    if model.setupVerificationState?.phase == .completed {
                        Button("Open Paperclip") {
                            model.dismissSetupWizard()
                        }
                        .buttonStyle(.borderedProminent)
                    } else {
                        Button("Back to Setup") {
                            step = steps.count - 2
                        }

                        Button("Retry Test") {
                            Task {
                                await model.runSetupFlow(
                                    with: SetupWizardData(
                                        providerKeys: providerKeys,
                                        defaultModelID: selectedModelTrack == .cloudFirst ? selectedCloudModelID : selectedLocalModelID,
                                        modelTrack: selectedModelTrack,
                                        companyTemplateID: selectedTemplateID,
                                        companyName: resolvedCompanyName,
                                        companyGoal: companyGoal
                                    )
                                )
                            }
                        }
                        .buttonStyle(.borderedProminent)

                        Button("Open App Anyway") {
                            model.dismissSetupWizard()
                        }
                    }
                }
            }

            Text(footerHint)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(24)
    }

    private var footerHint: String {
        if step == steps.count - 1 {
            if model.isRunningSetupFlow {
                return "Paperclip Desktop is now creating a real test issue and following the live run."
            }
            if model.setupVerificationState?.phase == .completed {
                return "Your first company, first agent, and first verification run are ready."
            }
            return "If the verification fails, you can go back and adjust setup, retry the test, or continue into the app and inspect Diagnostics."
        }
        return "You can keep tuning models, diagnostics, and company setup later in Settings."
    }

    private var resolvedCompanyName: String {
        if !companyName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return companyName
        }
        return CompanyTemplateCatalog.templates.first(where: { $0.id == selectedTemplateID })?.name ?? "My Company"
    }

    @ViewBuilder
    private func setupStepPill(index: Int, title: String) -> some View {
        HStack(spacing: 5) {
            Image(systemName: index < step ? "checkmark.circle.fill" : index == step ? "circle.fill" : "circle")
                .font(.caption)
            Text(title)
                .font(.caption.weight(.semibold))
        }
        .padding(.horizontal, 9)
        .padding(.vertical, 5)
        .background(Capsule().fill(index == step ? Color.accentColor.opacity(0.16) : Color.secondary.opacity(0.10)))
        .foregroundStyle(index <= step ? Color.accentColor : Color.secondary)
    }
}

private struct WelcomeStepView: View {
    private let checks = [
        ("Check Paperclip runtime", "Install and start the local Paperclip server"),
        ("Check or install Ollama", "Use an existing Ollama setup or let the app install it"),
        ("Select a recommended model", "Pick a Gemma 4 model that fits this Mac"),
        ("Test local AI", "Prepare and test the selected model before real work starts"),
        ("Create first company", "Start from a practical template instead of a blank slate")
    ]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Welcome")
                    .font(.title2.bold())

                Text("Paperclip Desktop keeps the technical pieces visible enough to trust, but out of your way.")
                    .foregroundStyle(.secondary)

                HStack(alignment: .top, spacing: 12) {
                    privacyPill("Local only", systemImage: "lock")
                    privacyPill("Uses cloud if you choose it", systemImage: "icloud")
                    privacyPill("Uses web search only when enabled", systemImage: "globe")
                    privacyPill("Reads workspace for agent work", systemImage: "folder")
                }

                GroupBox("First Start Checklist") {
                    VStack(alignment: .leading, spacing: 12) {
                        ForEach(checks, id: \.0) { title, detail in
                            HStack(alignment: .top, spacing: 10) {
                                Image(systemName: "checkmark.seal")
                                    .foregroundStyle(Color.accentColor)
                                    .frame(width: 18)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(title)
                                        .font(.headline)
                                    Text(detail)
                                        .foregroundStyle(.secondary)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                Text("Choose cloud-first if you want the lightest setup. Choose local AI if you want Ollama and Gemma 4 prepared during setup.")
                    .foregroundStyle(.secondary)
            }
            .padding(32)
            .frame(maxWidth: 760, alignment: .leading)
        }
    }

    private func privacyPill(_ title: String, systemImage: String) -> some View {
        Label(title, systemImage: systemImage)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Capsule().fill(Color.secondary.opacity(0.10)))
    }
}

private struct SetupRuntimeStepView: View {
    @Bindable var model: DesktopAppModel
    let selectedModelTrack: OnboardingModelTrack

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Runtime Checks")
                    .font(.title2.bold())

                Text("Use this step to make sure the Paperclip runtime, Ollama, and local services are in a good place before you create the first company.")
                    .foregroundStyle(.secondary)

                readinessCard(
                    title: "Paperclip Runtime",
                    status: runtimeStatusTitle,
                    detail: runtimeStatusDetail,
                    systemImage: "server.rack"
                ) {
                    HStack {
                        Button("Refresh") {
                            model.refreshRuntimeStatus()
                        }

                        Button(runtimeInstallButtonTitle) {
                            Task {
                                await model.installBundledRuntimeUpdate()
                                model.refreshRuntimeStatus()
                            }
                        }
                        .disabled(model.isInstallingRuntimeUpdate)

                        if model.isInstallingRuntimeUpdate {
                            ProgressView()
                                .controlSize(.small)
                        }
                    }

                    if let message = model.runtimeStatusMessage {
                        Text(message)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                readinessCard(
                    title: "Paperclip Server",
                    status: model.processManager.runtimeState.title,
                    detail: serverDetail,
                    systemImage: "desktopcomputer"
                ) {
                    HStack {
                        switch model.processManager.runtimeState {
                        case .running:
                            Button("Restart") {
                                Task {
                                    await model.restartServer()
                                }
                            }
                        case .starting:
                            ProgressView()
                                .controlSize(.small)
                        default:
                            Button("Start Server") {
                                Task {
                                    await model.startServer()
                                }
                            }
                        }

                        Button("Refresh") {
                            Task {
                                await model.refreshDesktopSidebar()
                            }
                        }
                    }
                }

                readinessCard(
                    title: "Ollama",
                    status: model.ollamaControlSummary.title,
                    detail: selectedModelTrack == .localAI ? model.ollamaControlSummary.detail : "Optional for cloud-first. You can still install it now if you want a local backup model.",
                    systemImage: "cpu"
                ) {
                    HStack {
                        Button("Refresh") {
                            Task {
                                await model.refreshOllamaStatus()
                                await model.refreshModelInventory()
                            }
                        }

                        if selectedModelTrack == .localAI {
                            Button(ollamaInstallButtonTitle) {
                                Task {
                                    await model.installOrUpdateOllama()
                                }
                            }
                            .disabled(model.isInstallingOllama)

                            Button("Set Up Local AI") {
                                Task {
                                    await model.prepareLocalModel()
                                }
                            }
                            .disabled(model.isPreparingLocalModel || model.isInstallingOllama)

                            if model.isPreparingLocalModel || model.isInstallingOllama {
                                ProgressView()
                                    .controlSize(.small)
                            }
                        }
                    }

                    Text(model.ollamaControlSummary.policyDetail)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let message = model.localModelMessage {
                        Text(message)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding(32)
            .frame(maxWidth: 760, alignment: .leading)
        }
    }

    private var runtimeStatusTitle: String {
        guard let status = model.runtimeStatus else { return "Not checked" }
        if status.isInstalled {
            return "Installed"
        }
        return "Bundled runtime ready"
    }

    private var runtimeStatusDetail: String {
        guard let status = model.runtimeStatus else {
            return "The bundled runtime has not been checked yet."
        }
        return status.statusSummary
    }

    private var runtimeInstallButtonTitle: String {
        model.runtimeStatus?.actionTitle ?? "Install Bundled Runtime"
    }

    private var serverDetail: String {
        switch model.processManager.runtimeState {
        case .running(let url):
            return "Paperclip server is running at \(url.absoluteString)."
        case .starting:
            return "Paperclip server is starting now."
        case .failed(let message):
            return message
        case .stopped:
            return "The app can start the local server for you."
        }
    }

    private var ollamaInstallButtonTitle: String {
        if model.ollamaInstallStatus?.updateAvailable == true {
            return "Update Ollama"
        }
        if model.ollamaInstallStatus?.isInstalled == true {
            return "Reinstall Ollama"
        }
        return "Install Ollama"
    }

    @ViewBuilder
    private func readinessCard<Actions: View>(
        title: String,
        status: String,
        detail: String,
        systemImage: String,
        @ViewBuilder actions: () -> Actions
    ) -> some View {
        GroupBox {
            VStack(alignment: .leading, spacing: 12) {
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: systemImage)
                        .frame(width: 18)
                        .foregroundStyle(.secondary)

                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(title)
                                .font(.headline)
                            Text(status)
                                .font(.caption2.weight(.semibold))
                                .padding(.horizontal, 7)
                                .padding(.vertical, 3)
                                .background(Capsule().fill(Color.accentColor.opacity(0.16)))
                                .foregroundStyle(Color.accentColor)
                        }

                        Text(detail)
                            .foregroundStyle(.secondary)
                    }
                }

                actions()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct SetupVerificationStepView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("First Test Run")
                    .font(.title2.bold())

                Text("This step creates your first real company, uses the template's first agent, and runs a short verification issue so you can see that Paperclip is actually working.")
                    .foregroundStyle(.secondary)

                GroupBox {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: state.phase.systemImage)
                                .foregroundStyle(toneColor)
                                .frame(width: 18)

                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 8) {
                                    Text(state.phase.title)
                                        .font(.headline)
                                    Text(statusBadgeTitle)
                                        .font(.caption2.weight(.semibold))
                                        .padding(.horizontal, 7)
                                        .padding(.vertical, 3)
                                        .background(Capsule().fill(toneColor.opacity(0.16)))
                                        .foregroundStyle(toneColor)
                                }

                                Text(state.detail)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        if model.isRunningSetupFlow {
                            ProgressView()
                                .controlSize(.small)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                GroupBox("Verification Summary") {
                    Grid(alignment: .leading, horizontalSpacing: 18, verticalSpacing: 8) {
                        metricRow("Attempt", "\(max(1, state.attemptCount))")
                        metricRow("Company", state.companyName ?? "Waiting")
                        metricRow("Agent", state.agentName ?? "Waiting")
                        metricRow("Issue", state.issueTitle ?? "Waiting")
                        metricRow("Run", state.runID ?? "Waiting")
                        metricRow("Model", state.diagnostic?.model ?? model.config.defaultModelID)
                        metricRow("Local / Cloud", isLocalRun ? "local" : "cloud or external")
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                if state.phase == .completed {
                    Label(state.detail, systemImage: "checkmark.circle.fill")
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 8).fill(Color.green.opacity(0.10)))
                        .foregroundStyle(Color.green)
                } else if state.phase == .failed {
                    VStack(alignment: .leading, spacing: 10) {
                        Label(state.errorMessage ?? state.detail, systemImage: "exclamationmark.triangle.fill")
                            .foregroundStyle(Color.red)
                        Text("You can retry the test immediately, or go back and adjust runtime, Ollama, or model settings first.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(12)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: 8).fill(Color.red.opacity(0.10)))
                }

                if let diagnostic = state.diagnostic {
                    RunDetailView(
                        diagnostic: diagnostic,
                        runSummary: model.sidebarSnapshot?.latestLocalRun?.runID == diagnostic.runId
                            ? model.sidebarSnapshot?.latestLocalRun
                            : nil,
                        formatDuration: formatDuration
                    )
                } else {
                    GroupBox("What happens next") {
                        VStack(alignment: .leading, spacing: 10) {
                            setupRow("Create your first company")
                            setupRow("Start the local Paperclip server")
                            setupRow("Create a short verification issue")
                            setupRow("Run the first agent and measure first output timing")
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .padding(32)
            .frame(maxWidth: 820, alignment: .leading)
        }
    }

    private var state: SetupVerificationState {
        model.setupVerificationState ?? SetupVerificationState()
    }

    private var toneColor: Color {
        switch state.phase {
        case .completed:
            .green
        case .failed:
            .red
        case .waitingForFirstOutput, .waitingForRun:
            .orange
        default:
            .accentColor
        }
    }

    private var statusBadgeTitle: String {
        if model.isRunningSetupFlow {
            return "In progress"
        }
        if state.phase == .completed {
            return "Ready"
        }
        if state.phase == .failed {
            return "Needs attention"
        }
        return "Waiting"
    }

    private var isLocalRun: Bool {
        let adapter = state.diagnostic?.adapterType?.lowercased() ?? ""
        return adapter.hasSuffix("_local")
            || state.diagnostic?.provider == "ollama"
            || model.config.localModel.useAsPrimaryModel
    }

    @ViewBuilder
    private func metricRow(_ label: String, _ value: String) -> some View {
        GridRow {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption)
                .textSelection(.enabled)
        }
    }

    private func setupRow(_ title: String) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "checkmark.seal")
                .foregroundStyle(Color.accentColor)
                .frame(width: 18)
            Text(title)
                .font(.headline)
        }
    }

    private func formatDuration(_ seconds: Double) -> String {
        let rounded = max(0, Int(seconds.rounded()))
        if rounded < 60 {
            return "\(rounded)s"
        }
        return "\(rounded / 60)m \(rounded % 60)s"
    }
}
