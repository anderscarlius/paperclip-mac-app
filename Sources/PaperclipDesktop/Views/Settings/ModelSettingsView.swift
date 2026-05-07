import PaperclipShared
import SwiftUI

struct ModelSettingsView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        Form {
            Section("Choose Your Setup") {
                HStack(alignment: .top, spacing: 12) {
                    setupChoiceCard(
                        title: "Cloud-first",
                        subtitle: "Recommended",
                        detail: "Best for most people. New agents start with a cloud model for the simplest setup.",
                        systemImage: "cloud.fill",
                        isSelected: isCloudFirstSelected,
                        action: applyCloudFirstSetup
                    )

                    setupChoiceCard(
                        title: "Local AI on This Mac",
                        subtitle: nil,
                        detail: "Best if you want privacy, a local backup model, or more work to stay on your Mac.",
                        systemImage: "laptopcomputer",
                        isSelected: !isCloudFirstSelected,
                        action: applyLocalAISetup
                    )
                }

                Text(isCloudFirstSelected
                    ? "Current setup: new agents will start with a cloud model."
                    : "Current setup: new agents will start with local Gemma 4 on this Mac, and compatible agent runtimes can be switched to local Ollama runs.")
                    .foregroundStyle(.secondary)
            }

            Section("Cloud Model") {
                Picker("Cloud model", selection: $model.config.defaultModelID) {
                    ForEach(ModelCatalog.cloudRecommended) { option in
                        Text(option.displayName).tag(option.id)
                    }
                }

                Text(isCloudFirstSelected
                    ? "This is the cloud model new agents will start with."
                    : "This cloud model stays available if you switch back to Cloud-first later.")
                    .foregroundStyle(.secondary)

                Text(ModelCatalog.option(for: model.config.defaultModelID).tagline)
                    .foregroundStyle(.secondary)
            }

            Section("Run Gemma 4 on This Mac") {
                Text("Turn this on if you want private on-device AI, a local backup model, or fully local Paperclip agent runs on this Mac.")
                    .foregroundStyle(.secondary)

                Toggle("Enable local Gemma 4 on this Mac", isOn: $model.config.localModel.isEnabled)

                if let runtime = model.localModelRuntime {
                    GroupBox("Your Mac") {
                        VStack(alignment: .leading, spacing: 8) {
                            LabeledContent("Hardware", value: runtime.hardwareProfile.architectureDescription)
                            LabeledContent("Installed memory", value: "\(runtime.hardwareProfile.totalMemoryGB) GB")
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                GroupBox("Choose Your Local Model") {
                    VStack(alignment: .leading, spacing: 10) {
                        Picker("Memory budget", selection: $model.config.localModel.memoryBudgetGB) {
                            ForEach(memoryBudgetOptions, id: \.self) { budget in
                                Text("\(budget) GB").tag(budget)
                            }
                        }
                        .onChange(of: model.config.localModel.memoryBudgetGB) { _, _ in
                            model.refreshLocalModelRuntime()
                        }

                        Text("Choose how much memory you are comfortable letting the local model use on this Mac.")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if let runtime = model.localModelRuntime {
                            Text("Best fit for this budget: \(runtime.recommendedModel.displayName)")
                                .foregroundStyle(.secondary)

                            Button("Use Recommended Model") {
                                model.applyRecommendedLocalModelForCurrentBudget()
                            }
                        }

                        Picker("Local model", selection: $model.config.localModel.selectedModelID) {
                            ForEach(LocalModelCatalog.gemma4) { option in
                                Text("\(option.displayName) (\(option.downloadSizeSummary))").tag(option.id)
                            }
                        }
                        .onChange(of: model.config.localModel.selectedModelID) { _, _ in
                            model.refreshLocalModelRuntime()
                        }

                        Toggle("Start new agents with local Gemma 4", isOn: $model.config.localModel.useAsPrimaryModel)
                        Toggle("Download the selected model automatically", isOn: $model.config.localModel.autoDownload)
                        Toggle("Stop Ollama after idle time", isOn: $model.config.localModel.autoStopOllamaWhenIdle)
                    }
                }

                if let runtime = model.localModelRuntime {
                    runtimeStatusView(runtime: runtime)
                }

                if let installStatus = model.ollamaInstallStatus {
                    ollamaStatusView(status: installStatus)
                }

                if let localModelMessage = model.localModelMessage {
                    Text(localModelMessage)
                        .foregroundStyle(.green)
                }

                GroupBox("Ollama") {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(model.ollamaControlSummary.detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("Preferred local model: \(model.selectedLocalModelOption.displayName)")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if !model.loadedOllamaModelNames.isEmpty {
                            Text("Loaded now: \(model.loadedOllamaModelNames.joined(separator: ", "))")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Text(model.ollamaControlSummary.policyDetail)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("Paperclip Desktop currently talks to one Ollama endpoint on this Mac. LAN-shared Ollama servers are not selectable here yet.")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        HStack {
                            Button("Refresh Status") {
                                Task {
                                    await model.refreshOllamaStatus()
                                    await model.refreshDesktopSidebar()
                                }
                            }

                            Button("Check for Updates") {
                                Task {
                                    await model.checkForOllamaUpdate()
                                }
                            }
                            .disabled(model.isCheckingOllamaRelease || model.isInstallingOllama)

                            if model.isCheckingOllamaRelease {
                                ProgressView()
                                    .controlSize(.small)
                            }
                        }

                        HStack {
                            Button(installButtonTitle) {
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
                            .disabled(!model.config.localModel.isEnabled || model.isPreparingLocalModel || model.isInstallingOllama)

                            if model.isPreparingLocalModel || model.isInstallingOllama {
                                ProgressView()
                                    .controlSize(.small)
                            }
                        }
                    }
                }

            }

            Section("Model Manager") {
                if let runtime = model.localModelRuntime {
                    GroupBox("Recommended for This Mac") {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("\(runtime.hardwareProfile.architectureDescription) · \(runtime.hardwareProfile.totalMemoryGB) GB memory")
                                .font(.headline)
                            Text("Recommended local model: \(runtime.recommendedModel.displayName)")
                            Text("Current default local model: \(LocalModelCatalog.option(for: model.config.localModel.selectedModelID).displayName)")
                                .foregroundStyle(.secondary)
                            Text(model.ollamaControlSummary.detail)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }

                HStack {
                    Button("Refresh Models") {
                        Task {
                            await model.refreshOllamaStatus()
                            await model.refreshModelInventory()
                        }
                    }
                    .disabled(model.isRefreshingModelInventory)

                    if model.isRefreshingModelInventory {
                        ProgressView()
                            .controlSize(.small)
                    }
                }

                if let message = model.modelManagerMessage {
                    Text(message)
                        .font(.caption)
                        .foregroundStyle(message.localizedCaseInsensitiveContains("failed") || message.localizedCaseInsensitiveContains("could not") ? .red : .secondary)
                        .textSelection(.enabled)
                }

                VStack(alignment: .leading, spacing: 10) {
                    ForEach(LocalModelCatalog.gemma4) { option in
                        localModelRow(option)
                    }
                }

                if !extraInstalledModels.isEmpty {
                    GroupBox("Other Installed Ollama Models") {
                        VStack(alignment: .leading, spacing: 8) {
                            ForEach(extraInstalledModels) { installed in
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(installed.name)
                                            .font(.headline)
                                        Text(installedModelMetadata(installed))
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }

                                    Spacer()

                                    Button("Delete") {
                                        Task {
                                            await model.deleteLocalModel(installed)
                                        }
                                    }
                                    .disabled(model.deletingLocalModelID == installed.id)
                                }
                            }
                        }
                    }
                }
            }

            Section("Before You Save") {
                Text("Changing the cloud default affects only new agents you create from now on.")
                    .foregroundStyle(.secondary)

                Text("Turning on local Gemma 4 lets Paperclip Desktop install Ollama, download your selected model, and prepare local AI on this Mac.")
                    .foregroundStyle(.secondary)

                Text("If Codex is installed, Paperclip agent heartbeats can also be switched to local Ollama runs with your selected Gemma 4 model.")
                    .foregroundStyle(.secondary)

                Text("Saving these settings applies them to new agents. Existing agents are updated the next time the app repairs runtime settings while the server is running.")
                    .foregroundStyle(.secondary)
            }

            Section {
                Button("Save Model Settings") {
                    model.saveSettings()
                    Task {
                        await model.refreshOllamaStatus()
                        await model.refreshDesktopSidebar()
                        await model.repairBrokenRuntimeAgents()
                    }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .formStyle(.grouped)
        .task {
            model.refreshLocalModelRuntime()
            model.refreshOllamaInstallStatus()
            await model.refreshModelInventory()
        }
    }

    private var installButtonTitle: String {
        if model.ollamaInstallStatus?.updateAvailable == true {
            return "Update Ollama"
        }
        if model.ollamaInstallStatus?.isInstalled == true {
            return "Reinstall Ollama"
        }
        return "Install Ollama Automatically"
    }

    private var memoryBudgetOptions: [Int] {
        model.localModelRuntime?.hardwareProfile.budgetOptionsGB ?? [8, 12, 16]
    }

    private var installedModelsByName: [String: OllamaInstalledModel] {
        Dictionary(uniqueKeysWithValues: model.installedOllamaModels.map { ($0.name, $0) })
    }

    private var loadedModelNames: Set<String> {
        Set(model.sidebarSnapshot?.ollamaStatus?.runningModels.map(\.name) ?? [])
    }

    private var extraInstalledModels: [OllamaInstalledModel] {
        let knownNames = Set(LocalModelCatalog.gemma4.map(\.ollamaTag))
        return model.installedOllamaModels.filter { !knownNames.contains($0.name) }
    }

    @ViewBuilder
    private func setupChoiceCard(
        title: String,
        subtitle: String?,
        detail: String,
        systemImage: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .center, spacing: 8) {
                    Image(systemName: systemImage)
                        .font(.headline)
                        .foregroundStyle(isSelected ? Color.accentColor : Color.secondary)

                    Text(title)
                        .font(.headline)

                    Spacer()

                    if let subtitle {
                        Text(subtitle)
                            .font(.caption.bold())
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Capsule().fill(Color.accentColor.opacity(0.16)))
                            .foregroundStyle(Color.accentColor)
                    }
                }

                Text(detail)
                    .foregroundStyle(.secondary)

                Text(isSelected ? "Selected" : "Choose This Setup")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(isSelected ? Color.accentColor : Color.primary)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: 14)
                    .fill(isSelected ? Color.accentColor.opacity(0.10) : Color.secondary.opacity(0.08))
            }
            .overlay {
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
            }
        }
        .buttonStyle(.plain)
    }

    private var isCloudFirstSelected: Bool {
        !model.config.localModel.useAsPrimaryModel
    }

    private func applyCloudFirstSetup() {
        model.config.localModel.useAsPrimaryModel = false
        if ModelCatalog.localGemma4.contains(where: { $0.id == model.config.defaultModelID }) {
            model.config.defaultModelID = ModelCatalog.cloudRecommended[0].id
        }
    }

    private func applyLocalAISetup() {
        model.config.localModel.isEnabled = true
        model.config.localModel.useAsPrimaryModel = true
        model.config.defaultModelID = model.config.localModel.selectedModelID
        model.refreshLocalModelRuntime()
    }

    @ViewBuilder
    private func localModelRow(_ option: LocalModelOption) -> some View {
        let installed = installedModelsByName[option.ollamaTag]
        let isInstalled = installed != nil
        let isLoaded = loadedModelNames.contains(option.ollamaTag)
        let isSelected = model.config.localModel.selectedModelID == option.id
        let isRecommended = model.localModelRuntime?.recommendedModel.id == option.id
        let isTooHeavy = model.config.localModel.memoryBudgetGB < option.minimumBudgetGB

        GroupBox {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(spacing: 6) {
                            Text(option.displayName)
                                .font(.headline)

                            if isSelected {
                                statusPill("Default")
                            }
                            if isRecommended {
                                statusPill("Recommended")
                            }
                            if option.id == LocalModelCatalog.gemma4.first?.id {
                                statusPill("Best for speed")
                            }
                            if option.id == LocalModelCatalog.supportedOptions(forMemoryBudgetGB: model.config.localModel.memoryBudgetGB).last?.id {
                                statusPill("Best quality")
                            }
                            if isLoaded {
                                statusPill("Loaded")
                            }
                        }

                        Text(option.tagline)
                            .foregroundStyle(.secondary)

                        Text(([
                            "Download \(option.downloadSizeSummary)",
                            "Estimated memory \(option.recommendedMemoryGB) GB",
                            installed.map(installedModelMetadata)
                        ] as [String?]).compactMap { $0 }.joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if isTooHeavy {
                            Text("This model is above the current \(model.config.localModel.memoryBudgetGB) GB memory budget.")
                                .font(.caption)
                                .foregroundStyle(.orange)
                        }
                    }

                    Spacer()
                }

                HStack {
                    Button(isInstalled ? "Reinstall" : "Install") {
                        Task {
                            await model.installLocalModel(option)
                        }
                    }
                    .disabled(model.installingLocalModelID != nil || model.isInstallingOllama)

                    Button("Test") {
                        Task {
                            await model.testLocalModel(option)
                        }
                    }
                    .disabled(model.testingLocalModelID != nil)

                    Button("Set Default") {
                        model.setDefaultLocalModel(option)
                    }
                    .disabled(isSelected)

                    if let installed {
                        Button("Delete", role: .destructive) {
                            Task {
                                await model.deleteLocalModel(installed)
                            }
                        }
                        .disabled(model.deletingLocalModelID == installed.id || isLoaded)
                    }

                    if model.installingLocalModelID == option.id ||
                        model.testingLocalModelID == option.id ||
                        model.deletingLocalModelID == option.id {
                        ProgressView()
                            .controlSize(.small)
                    }
                }
            }
        }
    }

    private func statusPill(_ text: String) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(Capsule().fill(Color.accentColor.opacity(0.14)))
            .foregroundStyle(Color.accentColor)
    }

    private func installedModelMetadata(_ installed: OllamaInstalledModel) -> String {
        [
            installed.sizeBytes.map(bytesToGBLabel),
            installed.parameterSize,
            installed.quantizationLevel
        ].compactMap { $0 }.joined(separator: " · ")
    }

    private func bytesToGBLabel(_ bytes: Int64) -> String {
        let value = Double(bytes) / 1_073_741_824
        return String(format: "%.1f GB", value)
    }

    @ViewBuilder
    private func runtimeStatusView(runtime: LocalModelRuntimeStatus) -> some View {
        let selectedModel = LocalModelCatalog.option(for: model.config.localModel.selectedModelID)
        GroupBox("Local Model Status") {
            VStack(alignment: .leading, spacing: 6) {
                Text(runtime.isOllamaInstalled ? "Ollama is installed and ready." : "Ollama is not installed yet.")
                    .foregroundStyle(runtime.isOllamaInstalled ? Color.primary : Color.orange)

                if runtime.selectedModelInstalled {
                    Text("\(selectedModel.displayName) is already downloaded.")
                        .foregroundStyle(.secondary)
                } else {
                    Text("\(selectedModel.displayName) will be downloaded when you click Set Up Local AI.")
                        .foregroundStyle(.secondary)
                }

                if model.config.localModel.memoryBudgetGB < selectedModel.minimumBudgetGB {
                    Text("This model may need more memory than the budget you selected. A safer choice for this budget is \(runtime.recommendedModel.displayName).")
                        .foregroundStyle(.orange)
                }
            }
        }
    }

    @ViewBuilder
    private func ollamaStatusView(status: OllamaInstallStatus) -> some View {
        GroupBox("Ollama App") {
            VStack(alignment: .leading, spacing: 6) {
                LabeledContent("Installed version", value: status.installedVersionLabel)
                LabeledContent("Latest version checked", value: status.latestVersionLabel)
                LabeledContent("Install location", value: status.installLocationLabel)

                if status.updateAvailable {
                    Text("A newer Ollama version is available and can be installed from this screen.")
                    .foregroundStyle(.orange)
                } else if status.isInstalled, status.latestRelease != nil {
                    Text("Your installed Ollama version already matches the latest version you checked.")
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}
