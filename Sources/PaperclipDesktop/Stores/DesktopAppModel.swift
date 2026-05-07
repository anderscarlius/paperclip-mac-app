import Foundation
import Observation
import PaperclipShared

@MainActor
@Observable
final class DesktopAppModel {
    private static let sidebarThroughputWindows = [5, 10, 30, 180]
    private static let webSearchRefreshIntervalSeconds: TimeInterval = 30
    private static let localModelNoOutputWarningSeconds: TimeInterval = 45
    private static let localModelWatchdogRestartSeconds: TimeInterval = 120
    private static let localModelWatchdogCooldownSeconds: TimeInterval = 180

    var config: AppConfig
    var companies: [Company] = []
    var providerKeyDrafts: [LLMProvider: String]
    var runtimeStatus: PaperclipRuntimeStatus?
    var runtimeStatusMessage: String?
    var isInstallingRuntimeUpdate = false
    var upstreamRelease: PaperclipUpstreamRelease?
    var upstreamReleaseMessage: String?
    var isCheckingUpstreamRelease = false
    var isInstallingUpstreamRelease = false
    var localModelRuntime: LocalModelRuntimeStatus?
    var ollamaInstallStatus: OllamaInstallStatus?
    var installedOllamaModels: [OllamaInstalledModel] = []
    var localModelMessage: String?
    var modelManagerMessage: String?
    var runtimeAgentMessage: String?
    var diagnosticsMessage: String?
    var pluginHealthMessage: String?
    var isRunningSetupFlow = false
    var keepSetupWizardVisible = false
    var setupVerificationState: SetupVerificationState?
    var lastSidebarRefreshAt: Date?
    var lastPluginHealthRefreshAt: Date?
    var lastWebSearchTestAt: Date?
    var lastLocalModelTestAt: Date?
    var webSearchCapabilitySummary = DesktopCapabilityHealthSummary(
        title: "Checking",
        detail: "Paperclip will verify Web Search as soon as the server is ready.",
        state: .working
    )
    var latestWatchdogEvent: WatchdogEvent?
    var recentWatchdogEvents: [WatchdogEvent] = []
    var latestRunDiagnostics: [PaperclipRuntimeService.RuntimeRunDiagnostic] = []
    var isTestingWebSearch = false
    var isTestingLocalModel = false
    var isRefreshingPluginHealth = false
    var runtimeCompanies: [PaperclipRuntimeService.RuntimeCompanySummary] = []
    var sidebarSnapshot: DesktopSidebarSnapshot?
    var isRefreshingLocalModelRuntime = false
    var isRefreshingModelInventory = false
    var isPreparingLocalModel = false
    var installingLocalModelID: String?
    var deletingLocalModelID: String?
    var testingLocalModelID: String?
    var isCheckingOllamaRelease = false
    var isInstallingOllama = false
    var isRepairingRuntimeAgents = false
    var showNewCompanyWizard = false
    var instructionEditorSession: InstructionEditorSession?
    var selectedCompanyID: String?
    var errorMessage: String?

    let processManager = ProcessManager()

    private let configStore: AppConfigStore
    private let keychainService: KeychainService
    private let setupService: SetupService
    private let companyCreationService: CompanyCreationService
    private let sourceInstaller = PaperclipSourceInstaller()
    private let upstreamService = PaperclipUpstreamService()
    private let localModelService = LocalModelService()
    private let ollamaService = OllamaService()
    private let runtimeAdapterService = RuntimeAgentAdapterService()
    private var lastOllamaWatchdogRestartAt: Date?
    private var lastWebSearchRefreshAt: Date?

    init(
        configStore: AppConfigStore = AppConfigStore(),
        keychainService: KeychainService = KeychainService()
    ) {
        self.configStore = configStore
        self.keychainService = keychainService
        self.setupService = SetupService(configStore: configStore, keychainService: keychainService)
        self.companyCreationService = CompanyCreationService()
        self.config = (try? configStore.load()) ?? .default
        self.providerKeyDrafts = Dictionary(uniqueKeysWithValues: LLMProvider.credentialProviders.map { ($0, "") })
        loadProviderKeys()
        reloadCompanies()
        refreshRuntimeStatus()
        Task {
            await refreshOllamaStatus()
            await refreshModelInventory()
            await refreshDesktopSidebar()
        }
    }

    var selectedCompany: Company? {
        companies.first(where: { $0.id == selectedCompanyID }) ?? companies.first
    }

    var hasRecoveredExistingDesktopState: Bool {
        config.onboarding.hasCompletedSetup
            || runtimeStatus?.isInstalled == true
            || !companies.isEmpty
            || !runtimeCompanies.isEmpty
            || {
                if case .running = processManager.runtimeState {
                    return true
                }
                return false
            }()
    }

    var shouldPresentSetupWizard: Bool {
        !config.onboarding.hasCompletedSetup || keepSetupWizardVisible
    }

    var selectedModel: ModelOption {
        ModelCatalog.option(for: config.defaultModelID)
    }

    var serverURL: URL {
        URL(string: "http://localhost:\(config.port)")!
    }

    var ollamaControlSummary: OllamaControlSummary {
        buildOllamaControlSummary(
            isReachable: sidebarSnapshot?.ollamaStatus?.isReachable == true,
            isManaged: processManager.isManagingOllamaProcess,
            loadedModelCount: sidebarSnapshot?.ollamaStatus?.loadedModelCount ?? 0
        )
    }

    var watchdogStatusSummary: DesktopWatchdogStatusSummary {
        buildWatchdogStatusSummary(
            localModelEnabled: config.localModel.isEnabled,
            activity: sidebarSnapshot?.localModelActivity,
            latestEvent: latestWatchdogEvent,
            isManagingOllamaProcess: processManager.isManagingOllamaProcess
        )
    }

    var selectedLocalModelOption: LocalModelOption {
        LocalModelCatalog.option(for: config.localModel.selectedModelID)
    }

    var loadedOllamaModelNames: [String] {
        sidebarSnapshot?.ollamaStatus?.runningModels.map(\.name) ?? []
    }

    var installedOllamaModelNames: [String] {
        installedOllamaModels.map(\.name)
    }

    var preferredLocalModelInstalled: Bool {
        installedOllamaModelNames.contains(selectedLocalModelOption.ollamaTag)
    }

    var preferredLocalModelLoaded: Bool {
        loadedOllamaModelNames.contains(selectedLocalModelOption.ollamaTag)
    }

    var loadedOllamaModelDisplayNames: [String] {
        loadedOllamaModelNames.map(displayNameForOllamaTag)
    }

    var installedOllamaModelDisplayNames: [String] {
        installedOllamaModelNames.map(displayNameForOllamaTag)
    }

    var localModelReadinessTitle: String {
        guard config.localModel.isEnabled else { return "Off" }
        if preferredLocalModelLoaded { return "Loaded Now" }
        if preferredLocalModelInstalled { return "Ready" }
        return "Needs Setup"
    }

    var localModelReadinessDetail: String {
        guard config.localModel.isEnabled else {
            return "Local AI is turned off."
        }

        if preferredLocalModelLoaded {
            return "\(selectedLocalModelOption.displayName) is loaded in Ollama right now."
        }

        if preferredLocalModelInstalled {
            if loadedOllamaModelDisplayNames.isEmpty {
                return "\(selectedLocalModelOption.displayName) is installed and will load on demand."
            }

            return "\(selectedLocalModelOption.displayName) is installed. Another model is loaded right now: \(loadedOllamaModelDisplayNames.joined(separator: ", "))."
        }

        if loadedOllamaModelDisplayNames.isEmpty {
            return "\(selectedLocalModelOption.displayName) is not installed in Ollama yet."
        }

        return "\(selectedLocalModelOption.displayName) is not installed yet. Loaded right now: \(loadedOllamaModelDisplayNames.joined(separator: ", "))."
    }

    var shouldShowStartupSplash: Bool {
        switch processManager.runtimeState {
        case .starting:
            return true
        case .running:
            return sidebarSnapshot == nil || lastSidebarRefreshAt == nil
        case .stopped, .failed:
            return false
        }
    }

    var upstreamUpdateRecommendation: UpstreamUpdateRecommendation {
        guard let runtimeStatus else {
            return UpstreamUpdateRecommendation(
                title: "Recommendation",
                message: "Check the installed runtime first. For most users, the bundled version is the safest default.",
                tone: .neutral
            )
        }

        guard runtimeStatus.isInstalled else {
            return UpstreamUpdateRecommendation(
                title: "Recommended for most users",
                message: "Install the bundled Paperclip version first. GitHub updates are mainly for users who actively want the newest changes.",
                tone: .neutral
            )
        }

        guard let upstreamRelease else {
            return UpstreamUpdateRecommendation(
                title: "Recommended default",
                message: "If the app is working well, you should usually stay on the installed version. Use GitHub updates mainly when you want the latest Paperclip features or fixes.",
                tone: runtimeStatus.installedSourceMetadata?.origin == .upstreamGitHub ? .neutral : .caution
            )
        }

        if runtimeStatus.matchesUpstreamRelease(upstreamRelease) {
            return UpstreamUpdateRecommendation(
                title: "No update recommended",
                message: "You are already running the latest checked Paperclip version from GitHub. No update is needed right now.",
                tone: .positive
            )
        }

        if runtimeStatus.installedSourceMetadata?.origin == .upstreamGitHub {
            return UpstreamUpdateRecommendation(
                title: "Optional update",
                message: "You are already using a GitHub version. Update if you want the very latest changes, but it is also fine to wait if everything is working well today.",
                tone: .neutral
            )
        }

        return UpstreamUpdateRecommendation(
            title: "Recommended for most users: wait",
            message: "You are currently using the app's bundled Paperclip version, which is the safest choice for most users. Update from GitHub only if you specifically want to try the latest changes.",
            tone: .caution
        )
    }

    func runSetupFlow(with data: SetupWizardData) async {
        let attemptCount = (setupVerificationState?.attemptCount ?? 0) + 1
        isRunningSetupFlow = true
        keepSetupWizardVisible = true
        setupVerificationState = SetupVerificationState(
            attemptCount: attemptCount,
            phase: .creatingCompany,
            detail: attemptCount == 1
                ? "Saving setup and creating your first company."
                : "Retrying the first test on your existing setup.",
            companyName: data.companyName,
            startedAt: .now
        )

        do {
            let template = CompanyTemplateCatalog.templates.first(where: { $0.id == data.companyTemplateID })
                ?? CompanyTemplateCatalog.softwareCompany
            let (company, reusedExistingCompany) = try resolveSetupCompany(with: data, template: template)
            selectedCompanyID = company.id
            reloadCompanies()

            updateSetupVerification {
                $0.companyID = company.id
                $0.companyName = company.name
                $0.phase = .startingServer
                $0.detail = reusedExistingCompany
                    ? "Reusing \(company.name) and starting the local Paperclip server."
                    : "Starting the local Paperclip server for \(company.name)."
            }

            await autoStartServerIfNeeded()
            await refreshDesktopSidebar()

            switch processManager.runtimeState {
            case .running:
                break
            case .failed(let message):
                throw SetupFlowError(
                    message: "Paperclip server could not start cleanly during setup. \(message)"
                )
            case .starting:
                throw SetupFlowError(
                    message: "Paperclip server was still starting when the first test needed it. Try the test again in a moment."
                )
            case .stopped:
                throw SetupFlowError(
                    message: "Paperclip server is not running yet. Start it from the Runtime step and retry the first test."
                )
            }

            updateSetupVerification {
                $0.phase = .preparingRuntime
                $0.detail = runtimeAgentMessage ?? "Checking the local agent runtime before the first test run."
            }

            guard runtimeAdapterService.recommendedChoice(config: config, companyID: company.id) != nil else {
                throw SetupFlowError(
                    message: runtimeAgentMessage
                    ?? "No supported local agent runtime was found. Install Codex, Claude Code, or Gemini CLI before running the first test issue."
                )
            }

            let runtimeService = PaperclipRuntimeService(baseURL: serverURL)
            let runtimeAgent = try await waitForSetupAgent(
                runtimeService: runtimeService,
                companyID: company.id,
                preferredNames: template.agents.map(\.title)
            )

            updateSetupVerification {
                $0.agentID = runtimeAgent.id
                $0.agentName = runtimeAgent.name
                $0.phase = .creatingIssue
                $0.detail = "Creating a short first-run test for \(runtimeAgent.name)."
            }

            let issue = try await runtimeService.createIssue(
                companyID: company.id,
                title: onboardingIssueTitle(for: company.name, attemptCount: attemptCount),
                description: onboardingIssueDescription(for: company.name, agentName: runtimeAgent.name, data: data),
                assigneeAgentID: runtimeAgent.id
            )

            updateSetupVerification {
                $0.issueID = issue.id
                $0.issueTitle = issue.title
                $0.phase = .waitingForRun
                $0.detail = "The first test issue is ready. Waiting for the agent run to start."
            }

            let invocation = try await runtimeService.invokeHeartbeat(agentID: runtimeAgent.id)
            if let runID = invocation.id {
                updateSetupVerification {
                    $0.runID = runID
                }
            }

            let diagnostic = try await monitorSetupRun(
                runtimeService: runtimeService,
                companyID: company.id,
                agent: runtimeAgent,
                invocation: invocation,
                issue: issue
            )

            updateSetupVerification {
                $0.phase = .completed
                $0.detail = onboardingCompletionDetail(for: diagnostic)
                $0.completedAt = .now
                $0.errorMessage = nil
            }
        } catch {
            let message = friendlySetupErrorMessage(error)
            updateSetupVerification {
                $0.phase = .failed
                $0.detail = message
                $0.completedAt = .now
                $0.errorMessage = message
            }
        }

        isRunningSetupFlow = false
    }

    func dismissSetupWizard() {
        keepSetupWizardVisible = false
        if setupVerificationState?.isTerminal == true {
            setupVerificationState = nil
        }
    }

    func choosePreferredLocalModel(_ option: LocalModelOption) {
        config.localModel.isEnabled = true
        config.localModel.selectedModelID = option.id
        if config.localModel.useAsPrimaryModel {
            config.defaultModelID = option.id
        }
        refreshLocalModelRuntime()
        saveSettings()
        modelManagerMessage = "\(option.displayName) is now the preferred local model on this Mac."
    }

    func saveSettings() {
        do {
            if config.localModel.useAsPrimaryModel {
                config.defaultModelID = config.localModel.selectedModelID
            } else if ModelCatalog.localGemma4.contains(where: { $0.id == config.defaultModelID }) {
                config.defaultModelID = ModelCatalog.cloudRecommended[0].id
            }

            try configStore.save(config)
            try saveProviderKeys()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func createCompany(from draft: CompanyWizardDraft) {
        do {
            let company = try companyCreationService.createCompany(from: draft)
            reloadCompanies()
            selectedCompanyID = company.id
            showNewCompanyWizard = false
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func openInstructionEditor(for company: Company, agent: Agent) {
        do {
            instructionEditorSession = try companyCreationService.loadInstructionSession(company: company, agent: agent)
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func saveInstructionEditorSession() {
        guard let session = instructionEditorSession else { return }

        do {
            for (kind, text) in session.documents {
                try companyCreationService.save(document: text, for: session, kind: kind)
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func resetInstruction(kind: InstructionFileKind) {
        guard let session = instructionEditorSession else { return }

        do {
            let text = try companyCreationService.resetDocument(for: session, kind: kind)
            instructionEditorSession?.documents[kind] = text
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    func startServer() async {
        await processManager.start(config: config, keychainService: keychainService)
        await ensureLocalHeartbeatRuntimeReady()
        await repairBrokenRuntimeAgents()
        await refreshDesktopSidebar()
    }

    func autoStartServerIfNeeded() async {
        guard config.onboarding.hasCompletedSetup else { return }
        await processManager.syncRuntimeState(port: config.port)
        if case .running = processManager.runtimeState {
            await ensureLocalHeartbeatRuntimeReady()
            await repairBrokenRuntimeAgents()
            return
        }
        guard processManager.runtimeState == .stopped else { return }
        await startServer()
    }

    func stopServer() {
        processManager.stop()
    }

    func restartServer() async {
        await processManager.restart(config: config, keychainService: keychainService)
        refreshRuntimeStatus()
        await ensureLocalHeartbeatRuntimeReady()
        await refreshOllamaStatus()
        await repairBrokenRuntimeAgents()
        await refreshDesktopSidebar()
    }

    func ensureLocalHeartbeatRuntimeReady() async {
        guard config.localModel.isEnabled, config.localModel.useAsPrimaryModel else { return }

        do {
            _ = try await processManager.prepareLocalModel(
                config: config.localModel,
                allowDownload: config.localModel.autoDownload
            )
            await refreshOllamaStatus()
        } catch {
            localModelMessage = error.localizedDescription
        }
    }

    func repairBrokenRuntimeAgents() async {
        guard case .running = processManager.runtimeState else { return }

        isRepairingRuntimeAgents = true
        runtimeAgentMessage = nil

        do {
            let runtimeService = PaperclipRuntimeService(baseURL: serverURL)
            let companies = try await runtimeService.listCompanies()
            var repairCount = 0
            var recommendedTitle: String?

            for company in companies {
                guard let recommendedChoice = runtimeAdapterService.recommendedChoice(config: config, companyID: company.id) else {
                    continue
                }

                recommendedTitle = recommendedChoice.title
                try DesktopPaths.ensurePaperclipCodexHomeDirectory(companyID: company.id)

                let agents = try await runtimeService.listAgents(companyID: company.id)
                for agent in agents {
                    let result = try await runtimeService.testAdapter(
                        companyID: company.id,
                        adapterType: agent.adapterType,
                        adapterConfig: agent.adapterConfig
                    )

                    guard let repairChoice = runtimeAdapterService.repairPlan(
                        for: agent,
                        testResult: result,
                        recommendedChoice: recommendedChoice
                    ) else {
                        continue
                    }

                    _ = try await runtimeService.updateAgent(
                        id: agent.id,
                        adapterType: repairChoice.adapterType,
                        adapterConfig: repairChoice.adapterConfig
                    )
                    try await runtimeService.resetAgentRuntimeSession(id: agent.id)
                    repairCount += 1
                }
            }

            guard let recommendedTitle else {
                runtimeAgentMessage = config.localModel.isEnabled && config.localModel.useAsPrimaryModel
                    ? "Install Codex to run Paperclip agent heartbeats locally through Ollama on this Mac."
                    : "No supported Paperclip agent runtime was found on this Mac yet. Install Codex, Claude Code, or Gemini CLI to run heartbeats."
                isRepairingRuntimeAgents = false
                return
            }

            if repairCount > 0 {
                runtimeAgentMessage = "Updated \(repairCount) agent runtime \(repairCount == 1 ? "setting" : "settings") and reset their runtime sessions for \(recommendedTitle)."
            } else {
                runtimeAgentMessage = "Checked agent runtime settings. No changes were needed."
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isRepairingRuntimeAgents = false
    }

    func refreshRuntimeStatus() {
        do {
            runtimeStatus = try sourceInstaller.runtimeStatus()
        } catch {
            runtimeStatus = nil
        }
    }

    func installBundledRuntimeUpdate() async {
        isInstallingRuntimeUpdate = true
        runtimeStatusMessage = nil

        let previousInstalledSignature = runtimeStatus?.installedSourceSignature

        do {
            try await processManager.installBundledRuntime(config: config, keychainService: keychainService)
            refreshRuntimeStatus()

            if let runtimeStatus {
                if previousInstalledSignature != runtimeStatus.installedSourceSignature {
                    runtimeStatusMessage = "Installed bundled Paperclip snapshot \(runtimeStatus.installedSignatureDisplay)."
                } else {
                    runtimeStatusMessage = "Reinstalled bundled Paperclip snapshot \(runtimeStatus.installedSignatureDisplay)."
                }
            } else {
                runtimeStatusMessage = "Bundled Paperclip runtime installed."
            }
        } catch {
            errorMessage = error.localizedDescription
            refreshRuntimeStatus()
        }

        isInstallingRuntimeUpdate = false
    }

    func checkForUpstreamRuntimeUpdate() async {
        isCheckingUpstreamRelease = true
        upstreamReleaseMessage = nil

        do {
            let upstreamRelease = try await upstreamService.fetchLatestRelease()
            self.upstreamRelease = upstreamRelease

            if runtimeStatus?.matchesUpstreamRelease(upstreamRelease) == true {
                upstreamReleaseMessage = "The installed runtime already matches upstream commit \(upstreamRelease.shortRevision)."
            } else {
                upstreamReleaseMessage = "Latest upstream Paperclip commit is \(upstreamRelease.shortRevision)."
            }
        } catch {
            errorMessage = error.localizedDescription
        }

        isCheckingUpstreamRelease = false
    }

    func installLatestUpstreamRuntime() async {
        if upstreamRelease == nil {
            await checkForUpstreamRuntimeUpdate()
        }

        guard let upstreamRelease else { return }

        isInstallingUpstreamRelease = true
        upstreamReleaseMessage = nil

        do {
            try await processManager.installLatestUpstreamRuntime(
                release: upstreamRelease,
                config: config,
                keychainService: keychainService
            )
            refreshRuntimeStatus()
            upstreamReleaseMessage = "Installed upstream Paperclip commit \(upstreamRelease.shortRevision)."
        } catch {
            errorMessage = error.localizedDescription
            refreshRuntimeStatus()
        }

        isInstallingUpstreamRelease = false
    }

    func recommendedLocalModelOption() -> LocalModelOption {
        LocalModelCatalog.recommendedOption(forMemoryBudgetGB: config.localModel.memoryBudgetGB)
    }

    func refreshLocalModelRuntime() {
        isRefreshingLocalModelRuntime = true
        let hardwareProfile = localModelService.detectHardwareProfile()
        if !hardwareProfile.budgetOptionsGB.contains(config.localModel.memoryBudgetGB) {
            config.localModel.memoryBudgetGB = hardwareProfile.recommendedBudgetGB
        }
        localModelRuntime = localModelService.runtimeStatus(
            config: config.localModel,
            selectedModelID: config.localModel.selectedModelID,
            ollamaStatus: sidebarSnapshot?.ollamaStatus
        )
        isRefreshingLocalModelRuntime = false
    }

    func refreshOllamaInstallStatus(latestRelease: OllamaRelease? = nil) {
        ollamaInstallStatus = OllamaInstallStatus(
            installedVersion: ollamaService.installedVersion(),
            managedAppURL: ollamaService.managedAppURL(),
            binaryURL: ollamaService.binaryURL(),
            latestRelease: latestRelease ?? ollamaInstallStatus?.latestRelease,
            isServerReachable: sidebarSnapshot?.ollamaStatus?.isReachable == true,
            loadedModelCount: sidebarSnapshot?.ollamaStatus?.loadedModelCount ?? 0,
            loadedVRAMBytes: sidebarSnapshot?.ollamaStatus?.totalVRAMBytes
        )
    }

    func applyRecommendedLocalModelForCurrentBudget() {
        config.localModel.selectedModelID = recommendedLocalModelOption().id
        refreshLocalModelRuntime()
    }

    func refreshModelInventory() async {
        isRefreshingModelInventory = true
        installedOllamaModels = await ollamaService.installedModels()
        isRefreshingModelInventory = false
    }

    func prepareLocalModel() async {
        isPreparingLocalModel = true
        localModelMessage = nil

        do {
            let result = try await processManager.prepareLocalModel(config: config.localModel)
            await refreshOllamaStatus()
            await refreshModelInventory()
            localModelMessage = result.userMessage
        } catch {
            errorMessage = error.localizedDescription
            await refreshOllamaStatus()
            await refreshModelInventory()
        }

        isPreparingLocalModel = false
    }

    func installLocalModel(_ option: LocalModelOption) async {
        installingLocalModelID = option.id
        modelManagerMessage = nil

        var installConfig = config.localModel
        installConfig.isEnabled = true
        installConfig.engine = .ollama
        installConfig.selectedModelID = option.id
        installConfig.autoDownload = true

        do {
            _ = try await processManager.prepareLocalModel(config: installConfig, allowDownload: true)
            await refreshOllamaStatus()
            await refreshModelInventory()
            modelManagerMessage = "\(option.displayName) is installed and ready."
        } catch {
            modelManagerMessage = "Could not install \(option.displayName): \(error.localizedDescription)"
            await refreshOllamaStatus()
            await refreshModelInventory()
        }

        installingLocalModelID = nil
    }

    func deleteLocalModel(_ installedModel: OllamaInstalledModel) async {
        deletingLocalModelID = installedModel.id
        modelManagerMessage = nil

        do {
            try ollamaService.removeModel(tag: installedModel.name)
            await refreshOllamaStatus()
            await refreshModelInventory()
            modelManagerMessage = "\(installedModel.name) was removed."
        } catch {
            modelManagerMessage = "Could not remove \(installedModel.name): \(error.localizedDescription)"
            await refreshOllamaStatus()
            await refreshModelInventory()
        }

        deletingLocalModelID = nil
    }

    func testLocalModel(_ option: LocalModelOption) async {
        testingLocalModelID = option.id
        modelManagerMessage = nil

        do {
            var testConfig = config.localModel
            testConfig.isEnabled = true
            testConfig.engine = .ollama
            testConfig.selectedModelID = option.id
            testConfig.autoDownload = true
            _ = try await processManager.prepareLocalModel(config: testConfig, allowDownload: true)
            let response = try await ollamaService.testGenerate(model: option.ollamaTag)
            await refreshOllamaStatus()
            await refreshModelInventory()
            modelManagerMessage = "\(option.displayName) test passed. Ollama responded: \(response)"
        } catch {
            modelManagerMessage = "\(option.displayName) test failed: \(error.localizedDescription)"
            await refreshOllamaStatus()
            await refreshModelInventory()
        }

        testingLocalModelID = nil
    }

    func setDefaultLocalModel(_ option: LocalModelOption) {
        config.localModel.isEnabled = true
        config.localModel.selectedModelID = option.id
        if config.localModel.useAsPrimaryModel {
            config.defaultModelID = option.id
        }
        refreshLocalModelRuntime()
        modelManagerMessage = "\(option.displayName) is now the default local model."
    }

    func checkForOllamaUpdate() async {
        isCheckingOllamaRelease = true

        do {
            let latestRelease = try await ollamaService.fetchLatestRelease()
            refreshOllamaInstallStatus(latestRelease: latestRelease)
        } catch {
            errorMessage = error.localizedDescription
        }

        isCheckingOllamaRelease = false
    }

    func installOrUpdateOllama() async {
        isInstallingOllama = true
        localModelMessage = nil

        do {
            let latestRelease = try await ollamaService.fetchLatestRelease()
            let result = try await processManager.installOrUpdateOllama(release: latestRelease)
            await refreshOllamaStatus(latestRelease: latestRelease)
            await refreshModelInventory()
            localModelMessage = result.message
        } catch {
            errorMessage = error.localizedDescription
            await refreshOllamaStatus()
            await refreshModelInventory()
        }

        isInstallingOllama = false
    }

    func refreshOllamaStatus(latestRelease: OllamaRelease? = nil) async {
        let ollamaStatus = await ollamaService.serverStatus()
        if let snapshot = sidebarSnapshot {
            sidebarSnapshot = DesktopSidebarSnapshot(
                activeRunCount: snapshot.activeRunCount,
                queuedRunCount: snapshot.queuedRunCount,
                latestLocalRun: snapshot.latestLocalRun,
                localThroughput: snapshot.localThroughput,
                cloudThroughput: snapshot.cloudThroughput,
                ollamaStatus: ollamaStatus,
                localModelActivity: buildLocalModelActivity(
                    telemetry: nil,
                    ollamaStatus: ollamaStatus,
                    localThroughput: snapshot.localThroughput
                )
            )
        } else {
            let localThroughput = emptyThroughputSummary(label: "Local")
            sidebarSnapshot = DesktopSidebarSnapshot(
                activeRunCount: 0,
                queuedRunCount: 0,
                latestLocalRun: nil,
                localThroughput: localThroughput,
                cloudThroughput: emptyThroughputSummary(label: "Cloud"),
                ollamaStatus: ollamaStatus,
                localModelActivity: buildLocalModelActivity(
                    telemetry: nil,
                    ollamaStatus: ollamaStatus,
                    localThroughput: localThroughput
                )
            )
        }
        refreshLocalModelRuntime()
        refreshOllamaInstallStatus(latestRelease: latestRelease)
    }

    func refreshDesktopSidebar() async {
        guard case .running = processManager.runtimeState else {
            webSearchCapabilitySummary = DesktopCapabilityHealthSummary(
                title: "Unavailable",
                detail: "Start the Paperclip server to check web search.",
                state: .neutral
            )
            await refreshOllamaStatus()
            runtimeCompanies = []
            lastSidebarRefreshAt = .now
            return
        }

        let runtimeService = PaperclipRuntimeService(baseURL: serverURL)

        do {
            let companies = try await runtimeService.listCompanies()
            runtimeCompanies = companies
            await refreshWebSearchCapabilitySummary(runtimeService: runtimeService)

            let companyID = resolvedRuntimeCompanyID(from: companies)
            if selectedCompanyID == nil {
                selectedCompanyID = companyID
            }

            guard let companyID else {
                let ollamaStatus = await ollamaService.serverStatus()
                let localThroughput = sidebarSnapshot?.localThroughput ?? emptyThroughputSummary(label: "Local")
                let cloudThroughput = sidebarSnapshot?.cloudThroughput ?? emptyThroughputSummary(label: "Cloud")
                sidebarSnapshot = DesktopSidebarSnapshot(
                    activeRunCount: 0,
                    queuedRunCount: 0,
                    latestLocalRun: nil,
                    localThroughput: localThroughput,
                    cloudThroughput: cloudThroughput,
                    ollamaStatus: ollamaStatus,
                    localModelActivity: buildLocalModelActivity(
                        telemetry: nil,
                        ollamaStatus: ollamaStatus,
                        localThroughput: localThroughput
                    )
                )
                refreshLocalModelRuntime()
                refreshOllamaInstallStatus()
                lastSidebarRefreshAt = .now
                return
            }

            let liveRuns: [PaperclipRuntimeService.RuntimeLiveRunSummary]
            let recentRuns: [PaperclipRuntimeService.RuntimeHeartbeatRunSummary]
            let telemetry: PaperclipRuntimeService.RuntimeHeartbeatTelemetry?

            do {
                liveRuns = try await runtimeService.listLiveRuns(companyID: companyID, minCount: 6)
                recentRuns = try await runtimeService.listHeartbeatRuns(companyID: companyID, limit: 100)
                telemetry = try? await runtimeService.heartbeatTelemetry(companyID: companyID, limit: 100)
            } catch {
                let ollamaStatus = await ollamaService.serverStatus()
                let localThroughput = sidebarSnapshot?.localThroughput ?? emptyThroughputSummary(label: "Local")
                let cloudThroughput = sidebarSnapshot?.cloudThroughput ?? emptyThroughputSummary(label: "Cloud")
                sidebarSnapshot = DesktopSidebarSnapshot(
                    activeRunCount: sidebarSnapshot?.activeRunCount ?? 0,
                    queuedRunCount: sidebarSnapshot?.queuedRunCount ?? 0,
                    latestLocalRun: sidebarSnapshot?.latestLocalRun,
                    localThroughput: localThroughput,
                    cloudThroughput: cloudThroughput,
                    ollamaStatus: ollamaStatus,
                    localModelActivity: buildLocalModelActivity(
                        telemetry: nil,
                        ollamaStatus: ollamaStatus,
                        localThroughput: localThroughput
                    )
                )
                refreshLocalModelRuntime()
                refreshOllamaInstallStatus()
                lastSidebarRefreshAt = .now
                return
            }

            if let telemetry {
                latestRunDiagnostics = telemetry.diagnostics
            }
            let liveTokenSamples = telemetry == nil
                ? await buildLiveTokenSamples(from: recentRuns, runtimeService: runtimeService)
                : [:]
            let latestLocalRun = buildLatestLocalRunSummary(
                from: liveRuns,
                recentRuns: recentRuns,
                liveTokenSamples: liveTokenSamples
            )
            let throughput = telemetry.map(buildThroughputSummaries)
                ?? buildThroughputSummaries(
                    from: recentRuns,
                    liveTokenSamples: liveTokenSamples
            )
            let activeRunCount = liveRuns.filter { $0.status == "running" }.count
            let queuedRunCount = liveRuns.filter { $0.status == "queued" }.count
            var ollamaStatus = await ollamaService.serverStatus()
            var localModelActivity = buildLocalModelActivity(
                telemetry: telemetry,
                ollamaStatus: ollamaStatus,
                localThroughput: throughput.local
            )
            if let recoveryReason = watchdogRecoveryReason(for: localModelActivity) {
                recordWatchdogEvent(WatchdogEvent(
                    occurredAt: .now,
                    action: .restarting,
                    reason: recoveryReason,
                    detail: "Paperclip Desktop is checking whether it owns the Ollama process before taking action."
                ))
                let outcome = await processManager.recoverManagedOllama(
                    config: config.localModel,
                    reason: "Watchdog: \(recoveryReason)"
                )
                recordWatchdogOutcome(outcome, reason: recoveryReason)
                if case .recovered = outcome {
                    lastOllamaWatchdogRestartAt = .now
                    ollamaStatus = await ollamaService.serverStatus()
                    localModelActivity = buildLocalModelActivity(
                        telemetry: telemetry,
                        ollamaStatus: ollamaStatus,
                        localThroughput: throughput.local
                    )
                }
            }

            sidebarSnapshot = DesktopSidebarSnapshot(
                activeRunCount: activeRunCount,
                queuedRunCount: queuedRunCount,
                latestLocalRun: latestLocalRun,
                localThroughput: throughput.local,
                cloudThroughput: throughput.cloud,
                ollamaStatus: ollamaStatus,
                localModelActivity: localModelActivity
            )
            refreshLocalModelRuntime()
            refreshOllamaInstallStatus()
            lastSidebarRefreshAt = .now
        } catch {
            if companyIDIsMissingSelection() {
                runtimeCompanies = []
            }
            if lastWebSearchRefreshAt == nil {
                webSearchCapabilitySummary = DesktopCapabilityHealthSummary(
                    title: "Checking",
                    detail: "Paperclip is still verifying Web Search while the server settles.",
                    state: .working
                )
            } else if webSearchCapabilitySummary.title == "Checking" {
                webSearchCapabilitySummary = DesktopCapabilityHealthSummary(
                    title: "Unknown",
                    detail: "Paperclip could not refresh Web Search status just now.",
                    state: .warning
                )
            }
            await refreshOllamaStatus()
            lastSidebarRefreshAt = .now
        }
    }

    func testWebSearch() async {
        guard case .running = processManager.runtimeState else {
            diagnosticsMessage = "Start the Paperclip server before testing web search."
            lastWebSearchTestAt = .now
            return
        }

        isTestingWebSearch = true
        diagnosticsMessage = nil

        do {
            let runtimeService = PaperclipRuntimeService(baseURL: serverURL)
            let companies = try await runtimeService.listCompanies()
            guard let companyID = selectedCompanyID ?? companies.first?.id else {
                diagnosticsMessage = "No company is available for the web search test yet."
                isTestingWebSearch = false
                return
            }

            let agents = try await runtimeService.listAgents(companyID: companyID)
            guard let agent = agents.first else {
                diagnosticsMessage = "No agent is available for the web search test yet."
                isTestingWebSearch = false
                return
            }

            let result = try await runtimeService.executePluginTool(
                tool: "paperclipai.web-search:web-search",
                parameters: .object([
                    "query": .string("Paperclip AI web search diagnostics"),
                    "maxResults": .number(2),
                ]),
                runContext: PaperclipRuntimeService.PluginToolRunContext(
                    agentId: agent.id,
                    runId: "desktop-diagnostics-\(UUID().uuidString)",
                    companyId: companyID,
                    projectId: "desktop-diagnostics"
                )
            )

            if let error = result.error {
                diagnosticsMessage = "Web search tool responded with an error: \(error)"
            } else {
                diagnosticsMessage = "Web search test passed via \(result.pluginId ?? "plugin"):\n\(pluginToolSummary(from: result.result))"
            }
        } catch {
            diagnosticsMessage = "Web search test failed: \(error.localizedDescription)"
        }

        lastWebSearchTestAt = .now
        isTestingWebSearch = false
    }

    func testLocalModel() async {
        isTestingLocalModel = true
        diagnosticsMessage = nil

        do {
            _ = try await processManager.prepareLocalModel(
                config: config.localModel,
                allowDownload: config.localModel.autoDownload
            )
            let response = try await ollamaService.testGenerate(model: config.localModel.selectedModelID)
            await refreshOllamaStatus()
            diagnosticsMessage = "Local model test passed. Ollama responded: \(response)"
        } catch {
            diagnosticsMessage = "Local model test failed: \(error.localizedDescription)"
            await refreshOllamaStatus()
        }

        lastLocalModelTestAt = .now
        isTestingLocalModel = false
    }

    func restartOllamaFromDiagnostics() async {
        diagnosticsMessage = nil
        let reason = "Manual restart requested from Diagnostics"
        recordWatchdogEvent(WatchdogEvent(
            occurredAt: .now,
            action: .restarting,
            reason: reason,
            detail: "Checking whether Ollama is managed by Paperclip Desktop."
        ))

        let outcome = await processManager.recoverManagedOllama(
            config: config.localModel,
            reason: reason,
            allowStartWhenStopped: true
        )
        recordWatchdogOutcome(outcome, reason: reason)
        await refreshOllamaStatus()
        await refreshDesktopSidebar()

        switch outcome {
        case .recovered(let detail):
            diagnosticsMessage = detail
        case .skipped(let detail), .failed(let detail):
            diagnosticsMessage = detail
        }
    }

    func refreshPluginHealth() async {
        guard case .running = processManager.runtimeState else {
            pluginHealthMessage = "Start the Paperclip server before checking plugin health."
            webSearchCapabilitySummary = DesktopCapabilityHealthSummary(
                title: "Unavailable",
                detail: "Start the Paperclip server to check web search.",
                state: .neutral
            )
            lastPluginHealthRefreshAt = .now
            return
        }

        isRefreshingPluginHealth = true
        pluginHealthMessage = nil

        do {
            let runtimeService = PaperclipRuntimeService(baseURL: serverURL)
            let plugins = try await runtimeService.listPlugins()
            guard let webSearch = plugins.first(where: { $0.pluginKey == "paperclipai.web-search" }) else {
                pluginHealthMessage = "Web Search plugin is not installed yet."
                isRefreshingPluginHealth = false
                return
            }

            let dashboard = try await runtimeService.pluginDashboard(pluginID: webSearch.id)
            webSearchCapabilitySummary = buildWebSearchCapabilitySummary(plugin: webSearch, dashboard: dashboard)
            lastWebSearchRefreshAt = .now
            let checks = dashboard.health.checks.map { check in
                "\(check.passed ? "OK" : "FAIL") \(check.name): \(check.message ?? "")"
            }.joined(separator: "\n")
            let worker = dashboard.worker?.status ?? "missing"
            pluginHealthMessage = "Plugin \(webSearch.pluginKey) status: \(dashboard.health.healthy ? "healthy" : "not healthy"). Worker: \(worker).\n\(checks)"
        } catch {
            pluginHealthMessage = "Plugin health check failed: \(error.localizedDescription)"
            webSearchCapabilitySummary = DesktopCapabilityHealthSummary(
                title: "Needs Attention",
                detail: "Web search health check failed: \(error.localizedDescription)",
                state: .bad
            )
        }

        lastPluginHealthRefreshAt = .now
        isRefreshingPluginHealth = false
    }

    private func resolveSetupCompany(
        with data: SetupWizardData,
        template: CompanyTemplate
    ) throws -> (company: Company, reusedExistingCompany: Bool) {
        config = try setupService.completeSetup(with: data, existingConfig: config)

        if let existing = reusableSetupCompany(named: data.companyName, templateID: template.id) {
            return (existing, true)
        }

        let draft = CompanyWizardDraft(
            name: data.companyName,
            goal: data.companyGoal,
            template: template,
            agents: template.agents,
            instructionMode: .template,
            language: .english,
            defaultModelID: data.defaultModelID
        )

        let company = try companyCreationService.createCompany(from: draft)
        return (company, false)
    }

    private func reusableSetupCompany(named requestedName: String, templateID: String) -> Company? {
        let trimmed = requestedName.trimmingCharacters(in: .whitespacesAndNewlines)
        if let companyID = setupVerificationState?.companyID,
           let company = companies.first(where: { $0.id == companyID }) {
            return company
        }

        if let selectedCompanyID,
           let company = companies.first(where: { $0.id == selectedCompanyID }) {
            return company
        }

        if !trimmed.isEmpty,
           let company = companies.first(where: { $0.name.caseInsensitiveCompare(trimmed) == .orderedSame }) {
            return company
        }

        return companies.first(where: { $0.templateID == templateID && $0.name == requestedName })
    }

    private func waitForSetupAgent(
        runtimeService: PaperclipRuntimeService,
        companyID: String,
        preferredNames: [String]
    ) async throws -> PaperclipRuntimeService.RuntimeAgentSummary {
        for attempt in 0..<10 {
            let agents = try await runtimeService.listAgents(companyID: companyID)
            if let preferred = preferredNames.first(where: { name in
                agents.contains(where: { $0.name == name })
            }), let agent = agents.first(where: { $0.name == preferred }) {
                return agent
            }
            if let agent = agents.first {
                return agent
            }
            if attempt < 9 {
                try await Task.sleep(nanoseconds: 1_000_000_000)
            }
        }

        throw SetupFlowError(message: "No runtime agent was available after setup. Try restarting the Paperclip server and run the setup test again.")
    }

    private func monitorSetupRun(
        runtimeService: PaperclipRuntimeService,
        companyID: String,
        agent: PaperclipRuntimeService.RuntimeAgentSummary,
        invocation: PaperclipRuntimeService.RuntimeHeartbeatInvocationResult,
        issue: PaperclipRuntimeService.RuntimeIssueSummary
    ) async throws -> PaperclipRuntimeService.RuntimeRunDiagnostic {
        let flowStartedAt = Date.now
        let deadline = flowStartedAt.addingTimeInterval(config.localModel.useAsPrimaryModel ? 300 : 180)
        var trackedRunID = invocation.id

        while Date.now < deadline {
            let recentRuns = try await runtimeService.listHeartbeatRuns(companyID: companyID, limit: 100)
            let telemetry = try? await runtimeService.heartbeatTelemetry(companyID: companyID, limit: 100)
            if let telemetry {
                latestRunDiagnostics = telemetry.diagnostics
            }

            if trackedRunID == nil {
                trackedRunID = recentRuns
                    .filter { $0.agentId == agent.id && $0.createdAt >= flowStartedAt.addingTimeInterval(-5) }
                    .sorted(by: { $0.createdAt > $1.createdAt })
                    .first?
                    .id
            }

            updateSetupVerification {
                $0.runID = trackedRunID
                $0.agentID = agent.id
                $0.agentName = agent.name
                $0.issueID = issue.id
                $0.issueTitle = issue.title
            }

            if let diagnostic = resolveSetupDiagnostic(
                runID: trackedRunID,
                agentName: agent.name,
                startedAfter: flowStartedAt,
                diagnostics: latestRunDiagnostics
            ) {
                updateSetupVerification { state in
                    state.runID = diagnostic.runId
                    state.diagnostic = diagnostic
                    state.phase = setupVerificationPhase(for: diagnostic)
                    state.detail = setupVerificationDetail(for: diagnostic)
                    if state.phase == .completed || state.phase == .failed {
                        state.completedAt = .now
                    }
                    if state.phase == .failed {
                        state.errorMessage = diagnostic.error ?? setupVerificationDetail(for: diagnostic)
                    }
                }

                await refreshDesktopSidebar()

                if diagnostic.status == "succeeded" {
                    return diagnostic
                }
                if ["failed", "timed_out", "cancelled"].contains(diagnostic.status) {
                    throw SetupFlowError(message: diagnostic.error ?? "The first test run did not complete successfully.")
                }
            } else {
                updateSetupVerification {
                    $0.phase = .waitingForRun
                    $0.detail = trackedRunID == nil
                        ? "Waiting for the first run to appear for \(agent.name)."
                        : "Run \(trackedRunID!) was created and is waiting for live telemetry."
                }
            }

            try await Task.sleep(nanoseconds: 1_500_000_000)
        }

        throw SetupFlowError(
            message: "The first test run took too long to finish. Paperclip kept the company and server setup, but the verification run timed out."
        )
    }

    private func resolveSetupDiagnostic(
        runID: String?,
        agentName: String,
        startedAfter: Date,
        diagnostics: [PaperclipRuntimeService.RuntimeRunDiagnostic]
    ) -> PaperclipRuntimeService.RuntimeRunDiagnostic? {
        if let runID, let match = diagnostics.first(where: { $0.runId == runID }) {
            return match
        }

        return diagnostics.first { diagnostic in
            guard diagnostic.agentName == agentName else { return false }
            let startedAt = diagnostic.startedAt ?? diagnostic.firstCodexEventAt ?? diagnostic.finishedAt ?? .distantPast
            return startedAt >= startedAfter.addingTimeInterval(-5)
        }
    }

    private func setupVerificationPhase(
        for diagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic
    ) -> SetupVerificationPhase {
        switch diagnostic.status {
        case "succeeded":
            return .completed
        case "failed", "timed_out", "cancelled":
            return .failed
        case "queued":
            return .waitingForRun
        default:
            if let secondsSinceLastOutput = diagnostic.secondsSinceLastModelOutput,
               diagnostic.firstModelOutputAt != nil,
               secondsSinceLastOutput >= Self.localModelNoOutputWarningSeconds {
                return .waitingForFirstOutput
            }
            if diagnostic.firstModelOutputAt != nil || diagnostic.estimatedLiveTokens > 0 {
                return .writing
            }
            if diagnostic.phases.contains(where: { $0.phase == "model_loading" }) {
                return .loadingModel
            }
            if diagnostic.firstCodexEventAt != nil {
                return .waitingForFirstOutput
            }
            return .startingOllama
        }
    }

    private func setupVerificationDetail(
        for diagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic
    ) -> String {
        switch setupVerificationPhase(for: diagnostic) {
        case .completed:
            return onboardingCompletionDetail(for: diagnostic)
        case .failed:
            return diagnostic.error ?? "The first test run failed."
        case .writing:
            let rate = diagnostic.secondsSinceLastModelOutput.map { $0 < 5 ? "Output still streaming" : "Last output \(formatDuration($0)) ago" }
            return [outputTokenLabel(for: diagnostic), rate].compactMap { $0 }.joined(separator: " · ")
        case .loadingModel:
            return "Ollama is loading \(diagnostic.model ?? config.localModel.selectedModelID)."
        case .waitingForFirstOutput:
            if let seconds = diagnostic.secondsToFirstCodexEvent {
                return "Codex is running. Still waiting for first model output after \(formatDuration(seconds))."
            }
            return "The run started, but the model has not produced output yet."
        case .startingOllama:
            return "Preparing Ollama and the local runtime."
        case .waitingForRun:
            return "The first run is queued and waiting for the agent runtime."
        case .creatingCompany, .startingServer, .preparingRuntime, .creatingIssue, .idle:
            return "Preparing the first verification run."
        }
    }

    private func onboardingIssueTitle(for companyName: String, attemptCount: Int) -> String {
        if attemptCount <= 1 {
            return "First-run test for \(companyName)"
        }
        return "First-run retry \(attemptCount - 1) for \(companyName)"
    }

    private func onboardingIssueDescription(
        for companyName: String,
        agentName: String,
        data: SetupWizardData
    ) -> String {
        """
        This is the first Paperclip Desktop verification run for \(companyName).

        Please reply with a short friendly confirmation that this setup is working. Mention:
        1. your agent name,
        2. whether you are using a local or cloud model,
        3. the model name if it is available.

        Keep the answer under 120 words. Avoid tool calls unless they are truly necessary.
        """
    }

    private func onboardingCompletionDetail(
        for diagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic
    ) -> String {
        [
            "First test run completed" as String?,
            diagnostic.model.map { "model \($0)" },
            isLocalAdapterType(diagnostic.adapterType) ? "local run" : "cloud or external run",
            diagnostic.secondsToFirstModelOutput.map { "first output \(formatDuration($0))" },
        ]
            .compactMap { $0 }
            .joined(separator: " · ")
    }

    private func outputTokenLabel(for diagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic) -> String? {
        let tokens = max(diagnostic.outputTokens ?? 0, diagnostic.estimatedLiveTokens)
        guard tokens > 0 else { return nil }
        return "\(tokens) output tokens"
    }

    private func friendlySetupErrorMessage(_ error: Error) -> String {
        if let setupError = error as? SetupFlowError {
            return setupError.message
        }

        if let apiError = error as? APIClientError {
            switch apiError {
            case .invalidResponse:
                return "Paperclip got an invalid response during setup. Try the test again, and if it keeps happening, open Diagnostics."
            case .requestFailed(let statusCode, let body):
                return friendlyAPISetupError(statusCode: statusCode, body: body)
            }
        }

        if let urlError = error as? URLError {
            switch urlError.code {
            case .cannotConnectToHost, .networkConnectionLost, .timedOut, .cannotFindHost:
                return "Paperclip could not reach the local server during the first test. Try again after the server has fully started."
            default:
                break
            }
        }

        let description = error.localizedDescription
        if description.localizedCaseInsensitiveContains("Ollama") {
            return "Paperclip could not talk to Ollama during the first test. If you run external Ollama, the app will only report its status and will not restart it for you."
        }
        if description.localizedCaseInsensitiveContains("codex")
            || description.localizedCaseInsensitiveContains("claude")
            || description.localizedCaseInsensitiveContains("gemini") {
            return "Paperclip could not prepare the local agent runtime for the first test. Check that your preferred runtime tool is installed and available to the app."
        }

        return description
    }

    private func friendlyAPISetupError(statusCode: Int, body: String) -> String {
        let normalized = body.lowercased()
        if statusCode == 404 {
            return "Paperclip could not find the first agent or run while verifying setup. Restart the test and let the server settle for a moment."
        }
        if statusCode == 422 {
            if normalized.contains("adapter") || normalized.contains("runtime") {
                return "Paperclip could not prepare the first agent runtime. Check your local model and runtime settings, then try the test again."
            }
            if normalized.contains("assignee") {
                return "Paperclip created the first issue, but could not assign it to the setup agent. Try the test again."
            }
        }
        if statusCode >= 500 {
            return "The local Paperclip server hit an internal error during the first test. You can retry now or open Diagnostics for more detail."
        }
        return "Paperclip could not finish the first test (server returned \(statusCode)). You can retry here or continue into Diagnostics."
    }

    private func updateSetupVerification(_ update: (inout SetupVerificationState) -> Void) {
        guard var state = setupVerificationState else { return }
        update(&state)
        setupVerificationState = state
    }

    private func buildLatestLocalRunSummary(
        from liveRuns: [PaperclipRuntimeService.RuntimeLiveRunSummary],
        recentRuns: [PaperclipRuntimeService.RuntimeHeartbeatRunSummary],
        liveTokenSamples: [String: [TokenizedRunSlice]]
    ) -> DesktopSidebarRunSummary? {
        let agentNameByID = Dictionary(uniqueKeysWithValues: liveRuns.map { ($0.agentId, $0.agentName) })

        for run in recentRuns {
            guard isLocalHeartbeatRun(run) else { continue }
            let usage = run.usageJson?.objectValue ?? [:]
            let provider = usage["provider"]?.stringValue
            let model = usage["model"]?.stringValue

            let input = usageNumber(usage, keys: ["inputTokens", "input_tokens"])
            let estimatedOutput = Int((liveTokenSamples[run.id] ?? []).reduce(0) { $0 + $1.totalTokens })
            let output = max(
                usageNumber(usage, keys: ["outputTokens", "output_tokens"]),
                estimatedOutput
            )
            let cached = usageNumber(usage, keys: ["cachedInputTokens", "cached_input_tokens", "cache_read_input_tokens"])

            return DesktopSidebarRunSummary(
                runID: run.id,
                agentName: run.agentName ?? agentNameByID[run.agentId] ?? "Agent",
                model: model,
                provider: provider,
                status: run.status,
                startedAt: run.startedAt,
                finishedAt: run.finishedAt,
                inputTokens: input,
                outputTokens: output,
                cachedInputTokens: cached
            )
        }

        return nil
    }

    private func usageNumber(_ usage: [String: RuntimeJSONValue], keys: [String]) -> Int {
        for key in keys {
            if case .number(let value)? = usage[key] {
                return Int(value)
            }
        }
        return 0
    }

    private func buildThroughputSummaries(
        from recentRuns: [PaperclipRuntimeService.RuntimeHeartbeatRunSummary],
        liveTokenSamples: [String: [TokenizedRunSlice]] = [:],
        now: Date = .now
    ) -> (local: DesktopSidebarThroughputSummary, cloud: DesktopSidebarThroughputSummary) {
        let localRuns = recentRuns.flatMap {
            tokenizedRunSlices(
                from: $0,
                now: now,
                scope: .local,
                liveTokenSamples: liveTokenSamples[$0.id] ?? []
            )
        }
        let cloudRuns = recentRuns.flatMap {
            tokenizedRunSlices(
                from: $0,
                now: now,
                scope: .cloud,
                liveTokenSamples: liveTokenSamples[$0.id] ?? []
            )
        }

        return (
            DesktopSidebarThroughputSummary(
                label: "Local",
                windows: Self.sidebarThroughputWindows.map { seconds in
                    DesktopSidebarThroughputPoint(
                        seconds: seconds,
                        tokensPerSecond: movingAverageTokensPerSecond(
                            over: seconds,
                            runs: localRuns,
                            now: now
                        )
                    )
                }
            ),
            DesktopSidebarThroughputSummary(
                label: "Cloud",
                windows: Self.sidebarThroughputWindows.map { seconds in
                    DesktopSidebarThroughputPoint(
                        seconds: seconds,
                        tokensPerSecond: movingAverageTokensPerSecond(
                            over: seconds,
                            runs: cloudRuns,
                            now: now
                        )
                    )
                }
            )
        )
    }

    private func emptyThroughputSummary(label: String) -> DesktopSidebarThroughputSummary {
        DesktopSidebarThroughputSummary(
            label: label,
            windows: Self.sidebarThroughputWindows.map { seconds in
                DesktopSidebarThroughputPoint(seconds: seconds, tokensPerSecond: 0)
            }
        )
    }

    private func buildThroughputSummaries(
        from telemetry: PaperclipRuntimeService.RuntimeHeartbeatTelemetry
    ) -> (local: DesktopSidebarThroughputSummary, cloud: DesktopSidebarThroughputSummary) {
        (
            DesktopSidebarThroughputSummary(
                label: "Local",
                windows: telemetry.local.windows.map {
                    DesktopSidebarThroughputPoint(seconds: $0.seconds, tokensPerSecond: $0.tokensPerSecond)
                }
            ),
            DesktopSidebarThroughputSummary(
                label: "Cloud",
                windows: telemetry.cloud.windows.map {
                    DesktopSidebarThroughputPoint(seconds: $0.seconds, tokensPerSecond: $0.tokensPerSecond)
                }
            )
        )
    }

    private func buildLocalModelActivity(
        telemetry: PaperclipRuntimeService.RuntimeHeartbeatTelemetry?,
        ollamaStatus: OllamaServerStatus?,
        localThroughput: DesktopSidebarThroughputSummary,
        now: Date = .now
    ) -> DesktopLocalModelActivitySummary {
        guard config.localModel.isEnabled else {
            return .unavailable
        }

        if let restartAt = lastOllamaWatchdogRestartAt,
           now.timeIntervalSince(restartAt) < 60 {
            return DesktopLocalModelActivitySummary(
                state: .restarting,
                title: "Local model",
                detail: "Restarted Ollama · checking recovery",
                runID: nil,
                secondsSinceRunStart: nil,
                secondsToFirstOutput: nil,
                secondsSinceLastOutput: nil,
                liveTokens: 0,
                liveTokensPerSecond: nil
            )
        }

        let activeLocalDiagnostic = telemetry?.diagnostics.first { diagnostic in
            isLocalAdapterType(diagnostic.adapterType) && diagnostic.status == "running"
        }

        guard let diagnostic = activeLocalDiagnostic else {
            guard let ollamaStatus, ollamaStatus.isReachable else {
                return DesktopLocalModelActivitySummary(
                    state: .notResponding,
                    title: "Local model",
                    detail: "Ollama is not responding",
                    runID: nil,
                    secondsSinceRunStart: nil,
                    secondsToFirstOutput: nil,
                    secondsSinceLastOutput: nil,
                    liveTokens: 0,
                    liveTokensPerSecond: nil
                )
            }

            let modelDetail: String
            if preferredLocalModelLoaded {
                modelDetail = "Ready · loaded now"
            } else if preferredLocalModelInstalled {
                modelDetail = ollamaStatus.loadedModelCount == 0
                    ? "Ready · loads on demand"
                    : "Ready · another model is loaded"
            } else if ollamaStatus.loadedModelCount == 0 {
                modelDetail = "Preferred model is not installed"
            } else {
                modelDetail = "Preferred model missing · another model is loaded"
            }
            return DesktopLocalModelActivitySummary(
                state: .idle,
                title: "Local model",
                detail: modelDetail,
                runID: nil,
                secondsSinceRunStart: nil,
                secondsToFirstOutput: nil,
                secondsSinceLastOutput: nil,
                liveTokens: 0,
                liveTokensPerSecond: nil
            )
        }

        let startedAt = diagnostic.startedAt ?? now
        let runSeconds = max(0, now.timeIntervalSince(startedAt))
        let liveRate = localThroughput.windows.first(where: { $0.seconds == 10 })?.tokensPerSecond
            ?? localThroughput.windows.first?.tokensPerSecond
        let modelLoading = diagnostic.phases.contains { $0.phase == "model_loading" }
        let hasModelOutput = diagnostic.firstModelOutputAt != nil || diagnostic.estimatedLiveTokens > 0

        if ollamaStatus == nil && !hasModelOutput {
            return DesktopLocalModelActivitySummary(
                state: .notResponding,
                title: "Local model",
                detail: "Ollama not responding · run active for \(formatDuration(runSeconds))",
                runID: diagnostic.runId,
                secondsSinceRunStart: runSeconds,
                secondsToFirstOutput: diagnostic.secondsToFirstModelOutput,
                secondsSinceLastOutput: diagnostic.secondsSinceLastModelOutput,
                liveTokens: diagnostic.estimatedLiveTokens,
                liveTokensPerSecond: liveRate
            )
        }

        if hasModelOutput {
            let firstOutput = diagnostic.secondsToFirstModelOutput.map { "first output \(formatDuration($0))" }
            let lastOutput = diagnostic.secondsSinceLastModelOutput
            let state: DesktopLocalModelActivityState = (lastOutput ?? 0) >= Self.localModelNoOutputWarningSeconds
                ? .noOutput
                : .writing
            let status = state == .noOutput
                ? "No output for \(formatDuration(lastOutput ?? 0))"
                : "Writing"
            let rate = state == .writing ? liveRate.map { String(format: "%.1f output tok/s", $0) } : nil
            let tokens = diagnostic.estimatedLiveTokens > 0 ? "\(diagnostic.estimatedLiveTokens) output tokens" : nil
            return DesktopLocalModelActivitySummary(
                state: state,
                title: "Local model",
                detail: [status, rate, tokens, firstOutput].compactMap { $0 }.joined(separator: " · "),
                runID: diagnostic.runId,
                secondsSinceRunStart: runSeconds,
                secondsToFirstOutput: diagnostic.secondsToFirstModelOutput,
                secondsSinceLastOutput: lastOutput,
                liveTokens: diagnostic.estimatedLiveTokens,
                liveTokensPerSecond: state == .writing ? liveRate : nil
            )
        }

        if modelLoading {
            return DesktopLocalModelActivitySummary(
                state: .loadingModel,
                title: "Local model",
                detail: "Loading model · \(formatDuration(runSeconds))",
                runID: diagnostic.runId,
                secondsSinceRunStart: runSeconds,
                secondsToFirstOutput: nil,
                secondsSinceLastOutput: nil,
                liveTokens: 0,
                liveTokensPerSecond: nil
            )
        }

        if diagnostic.firstCodexEventAt != nil || runSeconds >= Self.localModelNoOutputWarningSeconds {
            let state: DesktopLocalModelActivityState = runSeconds >= Self.localModelNoOutputWarningSeconds
                ? .noOutput
                : .waitingForOutput
            let detail = state == .noOutput
                ? "No output for \(formatDuration(runSeconds))"
                : "Waiting for first output · \(formatDuration(runSeconds))"
            return DesktopLocalModelActivitySummary(
                state: state,
                title: "Local model",
                detail: detail,
                runID: diagnostic.runId,
                secondsSinceRunStart: runSeconds,
                secondsToFirstOutput: nil,
                secondsSinceLastOutput: nil,
                liveTokens: 0,
                liveTokensPerSecond: nil
            )
        }

        return DesktopLocalModelActivitySummary(
            state: .starting,
            title: "Local model",
            detail: "Starting run · \(formatDuration(runSeconds))",
            runID: diagnostic.runId,
            secondsSinceRunStart: runSeconds,
            secondsToFirstOutput: nil,
            secondsSinceLastOutput: nil,
            liveTokens: 0,
            liveTokensPerSecond: nil
        )
    }

    private func watchdogRecoveryReason(
        for activity: DesktopLocalModelActivitySummary,
        now: Date = .now
    ) -> String? {
        if let lastOllamaWatchdogRestartAt,
           now.timeIntervalSince(lastOllamaWatchdogRestartAt) < Self.localModelWatchdogCooldownSeconds {
            return nil
        }

        switch activity.state {
        case .notResponding:
            if processManager.isManagingOllamaProcess {
                return "Managed Ollama API is not responding"
            }
            guard let seconds = activity.secondsSinceRunStart,
                  seconds >= Self.localModelWatchdogRestartSeconds else {
                return nil
            }
            return "Ollama API is not responding during an active local run"
        case .waitingForOutput, .loadingModel, .noOutput:
            guard let seconds = activity.secondsSinceRunStart,
                  activity.secondsToFirstOutput == nil,
                  seconds >= Self.localModelWatchdogRestartSeconds else {
                return nil
            }
            return "No first model output after \(formatDuration(seconds))"
        case .writing:
            guard let seconds = activity.secondsSinceLastOutput,
                  seconds >= Self.localModelWatchdogRestartSeconds else {
                return nil
            }
            return "No new model output for \(formatDuration(seconds))"
        case .idle, .starting, .restarting, .unavailable:
            return nil
        }
    }

    private func recordWatchdogOutcome(_ outcome: ManagedOllamaRecoveryOutcome, reason: String) {
        switch outcome {
        case .recovered(let detail):
            recordWatchdogEvent(WatchdogEvent(
                occurredAt: .now,
                action: .recovered,
                reason: reason,
                detail: detail
            ))
        case .skipped(let detail):
            let action: WatchdogEventAction = detail.localizedCaseInsensitiveContains("not managed")
                ? .skippedExternal
                : .observed
            recordWatchdogEvent(WatchdogEvent(
                occurredAt: .now,
                action: action,
                reason: reason,
                detail: detail
            ))
        case .failed(let detail):
            recordWatchdogEvent(WatchdogEvent(
                occurredAt: .now,
                action: .failed,
                reason: reason,
                detail: detail
            ))
        }
    }

    private func recordWatchdogEvent(_ event: WatchdogEvent) {
        processManager.appendWatchdogLog(event)
        latestWatchdogEvent = event
        recentWatchdogEvents.insert(event, at: 0)
        if recentWatchdogEvents.count > 10 {
            recentWatchdogEvents.removeLast(recentWatchdogEvents.count - 10)
        }
    }

    private func refreshWebSearchCapabilitySummary(
        runtimeService: PaperclipRuntimeService,
        force: Bool = false,
        now: Date = .now
    ) async {
        if !force,
           let lastWebSearchRefreshAt,
           now.timeIntervalSince(lastWebSearchRefreshAt) < Self.webSearchRefreshIntervalSeconds {
            return
        }

        do {
            let plugins = try await runtimeService.listPlugins()
            guard let webSearch = plugins.first(where: { $0.pluginKey == "paperclipai.web-search" }) else {
                webSearchCapabilitySummary = DesktopCapabilityHealthSummary(
                    title: "Not Installed",
                    detail: "The Web Search plugin is not installed in this runtime yet.",
                    state: .warning
                )
                lastWebSearchRefreshAt = now
                return
            }

            let dashboard = try await runtimeService.pluginDashboard(pluginID: webSearch.id)
            webSearchCapabilitySummary = buildWebSearchCapabilitySummary(plugin: webSearch, dashboard: dashboard)
            lastWebSearchRefreshAt = now
        } catch {
            webSearchCapabilitySummary = DesktopCapabilityHealthSummary(
                title: "Unknown",
                detail: "Web search status could not be refreshed: \(error.localizedDescription)",
                state: .warning
            )
        }
    }

    private func buildWebSearchCapabilitySummary(
        plugin: PaperclipRuntimeService.RuntimePluginSummary,
        dashboard: PaperclipRuntimeService.RuntimePluginDashboard
    ) -> DesktopCapabilityHealthSummary {
        let workerStatus = dashboard.worker?.status ?? "missing"
        if dashboard.health.healthy {
            return DesktopCapabilityHealthSummary(
                title: "Ready",
                detail: "Worker \(workerStatus). Health checks are passing.",
                state: .ready
            )
        }

        let firstFailure = dashboard.health.checks.first(where: { !$0.passed })?.message
        return DesktopCapabilityHealthSummary(
            title: plugin.status == "ready" ? "Needs Attention" : plugin.status.capitalized,
            detail: firstFailure ?? dashboard.health.lastError ?? "Health checks are not passing.",
            state: .bad
        )
    }

    private func isLocalAdapterType(_ adapterType: String?) -> Bool {
        let normalized = adapterType?.lowercased() ?? ""
        return normalized.hasSuffix("_local") || normalized == "cursor"
    }

    private func formatDuration(_ seconds: TimeInterval) -> String {
        let rounded = max(0, Int(seconds.rounded()))
        if rounded < 60 {
            return "\(rounded)s"
        }
        return "\(rounded / 60)m \(rounded % 60)s"
    }

    private func pluginToolSummary(from value: RuntimeJSONValue?) -> String {
        guard let value else { return "Tool returned no payload." }
        if case .object(let object) = value,
           case .string(let content)? = object["content"] {
            return content
        }
        return "Tool returned a structured payload."
    }

    private enum ThroughputScope {
        case local
        case cloud
    }

    private struct TokenizedRunSlice {
        let startedAt: Date
        let finishedAt: Date
        let totalTokens: Double
        let durationSeconds: TimeInterval
    }

    private struct SetupFlowError: LocalizedError {
        let message: String

        var errorDescription: String? {
            message
        }
    }

    private func tokenizedRunSlices(
        from run: PaperclipRuntimeService.RuntimeHeartbeatRunSummary,
        now: Date,
        scope: ThroughputScope,
        liveTokenSamples: [TokenizedRunSlice]
    ) -> [TokenizedRunSlice] {
        let isLocal = isLocalHeartbeatRun(run)
        guard (scope == .local) == isLocal else { return [] }

        guard let usage = run.usageJson?.objectValue else {
            return run.status == "running" ? liveTokenSamples : []
        }

        let output = usageNumber(usage, keys: ["outputTokens", "output_tokens"])
        guard output > 0 else { return [] }

        let startedAt = run.startedAt ?? run.finishedAt ?? run.createdAt
        let finishedAt = run.finishedAt ?? now
        let durationSeconds = max(1, finishedAt.timeIntervalSince(startedAt))
        guard durationSeconds > 0 else { return [] }

        return [TokenizedRunSlice(
            startedAt: startedAt,
            finishedAt: finishedAt,
            totalTokens: Double(output),
            durationSeconds: durationSeconds
        )]
    }

    private func movingAverageTokensPerSecond(
        over seconds: Int,
        runs: [TokenizedRunSlice],
        now: Date
    ) -> Double {
        let windowDuration = TimeInterval(seconds)
        let windowStart = now.addingTimeInterval(-windowDuration)
        var tokensInWindow = 0.0

        for run in runs {
            let overlapStart = max(run.startedAt, windowStart)
            let overlapEnd = min(run.finishedAt, now)
            let overlapSeconds = overlapEnd.timeIntervalSince(overlapStart)
            guard overlapSeconds > 0 else { continue }
            let overlapFraction = min(1, overlapSeconds / run.durationSeconds)
            tokensInWindow += run.totalTokens * overlapFraction
        }

        return tokensInWindow / windowDuration
    }

    private func isLocalHeartbeatRun(_ run: PaperclipRuntimeService.RuntimeHeartbeatRunSummary) -> Bool {
        if let adapterType = run.adapterType?.lowercased(), !adapterType.isEmpty {
            if adapterType.hasSuffix("_local") {
                return true
            }
            switch adapterType {
            case "cursor":
                return true
            default:
                return false
            }
        }

        guard let usage = run.usageJson?.objectValue else { return false }
        let provider = usage["provider"]?.stringValue?.lowercased()
        let model = usage["model"]?.stringValue?.lowercased()
        return provider == "ollama"
            || provider == "lmstudio"
            || model?.contains("gemma4") == true
    }

    private func buildLiveTokenSamples(
        from runs: [PaperclipRuntimeService.RuntimeHeartbeatRunSummary],
        runtimeService: PaperclipRuntimeService
    ) async -> [String: [TokenizedRunSlice]] {
        var samplesByRunID: [String: [TokenizedRunSlice]] = [:]

        for run in runs where run.status == "running" && run.usageJson == nil {
            do {
                let log = try await runtimeService.heartbeatRunLog(runID: run.id)
                let samples = liveTokenSamples(fromLogContent: log.content)
                if !samples.isEmpty {
                    let totalTokens = samples.reduce(0) { $0 + $1.totalTokens }
                    let startedAt = run.startedAt ?? run.createdAt
                    let now = Date()
                    samplesByRunID[run.id] = [
                        TokenizedRunSlice(
                            startedAt: startedAt,
                            finishedAt: now,
                            totalTokens: totalTokens,
                            durationSeconds: max(1, now.timeIntervalSince(startedAt))
                        )
                    ]
                }
            } catch {
                continue
            }
        }

        return samplesByRunID
    }

    private struct HeartbeatLogLine: Decodable {
        let ts: String
        let stream: String
        let chunk: String
    }

    private func liveTokenSamples(fromLogContent content: String) -> [TokenizedRunSlice] {
        let decoder = JSONDecoder()

        return content
            .split(separator: "\n", omittingEmptySubsequences: true)
            .compactMap { rawLine -> TokenizedRunSlice? in
                guard
                    let lineData = String(rawLine).data(using: .utf8),
                    let line = try? decoder.decode(HeartbeatLogLine.self, from: lineData),
                    line.stream == "stdout",
                    let timestamp = parseISO8601Date(line.ts)
                else {
                    return nil
                }

                let text = modelGeneratedText(fromStdoutChunk: line.chunk)
                let tokens = TokenCounter.approximateCount(in: text)
                guard tokens > 0 else { return nil }

                return TokenizedRunSlice(
                    startedAt: timestamp,
                    finishedAt: timestamp.addingTimeInterval(1),
                    totalTokens: Double(tokens),
                    durationSeconds: 1
                )
            }
    }

    private func parseISO8601Date(_ string: String) -> Date? {
        let fractionalFormatter = ISO8601DateFormatter()
        fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = fractionalFormatter.date(from: string) {
            return date
        }

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }

    private func modelGeneratedText(fromStdoutChunk chunk: String) -> String {
        guard
            chunk.trimmingCharacters(in: .whitespacesAndNewlines).hasPrefix("{"),
            let data = chunk.data(using: .utf8),
            let value = try? JSONDecoder().decode(RuntimeJSONValue.self, from: data),
            case .object(let object) = value
        else {
            return ""
        }

        guard object["type"]?.stringValue == "item.completed",
              case .object(let item)? = object["item"] else {
            return ""
        }

        return item["text"]?.stringValue ?? item["content"]?.stringValue ?? ""
    }

    private func companyIDIsMissingSelection() -> Bool {
        selectedCompanyID == nil && runtimeCompanies.isEmpty
    }

    private func resolvedRuntimeCompanyID(
        from companies: [PaperclipRuntimeService.RuntimeCompanySummary]
    ) -> String? {
        if let selectedCompanyID,
           companies.contains(where: { $0.id == selectedCompanyID }) {
            return selectedCompanyID
        }

        return companies.first?.id
    }

    private func displayNameForOllamaTag(_ tag: String) -> String {
        LocalModelCatalog.gemma4.first(where: { $0.ollamaTag == tag })?.displayName ?? tag
    }

    private func saveProviderKeys() throws {
        for (provider, key) in providerKeyDrafts {
            guard let envKey = provider.envKey else { continue }
            if key.isEmpty {
                try keychainService.delete(account: envKey)
            } else {
                try keychainService.set(key, for: envKey)
            }
        }
    }

    private func loadProviderKeys() {
        for provider in LLMProvider.credentialProviders {
            guard let envKey = provider.envKey else { continue }
            providerKeyDrafts[provider] = (try? keychainService.string(for: envKey)) ?? ""
        }
    }

    private func reloadCompanies() {
        companies = (try? companyCreationService.loadCompanies()) ?? []
        selectedCompanyID = selectedCompanyID ?? companies.first?.id
    }
}
