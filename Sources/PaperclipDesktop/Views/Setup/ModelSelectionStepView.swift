import PaperclipShared
import SwiftUI

struct ModelSelectionStepView: View {
    @Bindable var model: DesktopAppModel
    @Binding var providerKeys: [LLMProvider: String]
    @Binding var modelTrack: OnboardingModelTrack
    @Binding var selectedCloudModelID: String
    @Binding var selectedLocalModelID: String

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Choose How New Agents Start")
                    .font(.title2.bold())

                Text("Pick the simplest setup for your first company. You can switch later in Settings > Models.")
                    .foregroundStyle(.secondary)

                HStack(alignment: .top, spacing: 12) {
                    setupChoiceCard(
                        title: "Cloud-first",
                        subtitle: "Simplest start",
                        detail: "Best if you want to get into Paperclip quickly and add local AI later if you need it.",
                        systemImage: "cloud.fill",
                        isSelected: modelTrack == .cloudFirst
                    ) {
                        modelTrack = .cloudFirst
                    }

                    setupChoiceCard(
                        title: "Local AI on This Mac",
                        subtitle: "Private by default",
                        detail: "Best if you want Ollama, Gemma 4, and local agent runs prepared up front.",
                        systemImage: "laptopcomputer",
                        isSelected: modelTrack == .localAI
                    ) {
                        modelTrack = .localAI
                    }
                }

                if modelTrack == .cloudFirst {
                    cloudFirstSection
                } else {
                    localAISection
                }
            }
            .padding(32)
            .frame(maxWidth: 760, alignment: .leading)
        }
        .task {
            model.refreshLocalModelRuntime()
            await model.refreshOllamaStatus()
            await model.refreshModelInventory()
        }
        .onChange(of: selectedLocalModelID) { _, newValue in
            model.config.localModel.isEnabled = true
            model.config.localModel.useAsPrimaryModel = true
            model.config.localModel.selectedModelID = newValue
            model.refreshLocalModelRuntime()
        }
    }

    private var cloudFirstSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Cloud Model")
                .font(.headline)

            Text("Choose which cloud model new agents should use by default. API keys stay in Keychain, not in plain text.")
                .foregroundStyle(.secondary)

            ForEach(ModelCatalog.cloudRecommended) { modelOption in
                CloudModelSelectionRow(
                    model: modelOption,
                    isSelected: selectedCloudModelID == modelOption.id
                ) {
                    selectedCloudModelID = modelOption.id
                }
            }

            GroupBox("Cloud API keys") {
                APIKeyStepView(providerKeys: $providerKeys, compact: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private var localAISection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Run Gemma 4 on This Mac")
                .font(.headline)

            Text("Paperclip Desktop can install Ollama, download your selected Gemma 4 model, and test the local model before you finish setup.")
                .foregroundStyle(.secondary)

            if let runtime = model.localModelRuntime {
                GroupBox("Recommended for this Mac") {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("\(runtime.hardwareProfile.architectureDescription) · \(runtime.hardwareProfile.totalMemoryGB) GB memory")
                            .font(.headline)
                        Text("Recommended local model: \(runtime.recommendedModel.displayName)")
                        Text("Suggested working budget: \(runtime.hardwareProfile.recommendedBudgetGB) GB")
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            ForEach(LocalModelCatalog.gemma4) { option in
                LocalModelSelectionRow(
                    option: option,
                    isSelected: selectedLocalModelID == option.id,
                    isRecommended: model.localModelRuntime?.recommendedModel.id == option.id,
                    isInstalled: model.installedOllamaModels.contains(where: { $0.name == option.ollamaTag }),
                    isLoaded: model.sidebarSnapshot?.ollamaStatus?.runningModels.contains(where: { $0.name == option.ollamaTag }) == true,
                    isTooHeavy: model.config.localModel.memoryBudgetGB < option.minimumBudgetGB
                ) {
                    selectedLocalModelID = option.id
                }
            }

            HStack {
                Button("Prepare Local Model") {
                    Task {
                        model.config.localModel.isEnabled = true
                        model.config.localModel.useAsPrimaryModel = true
                        model.config.localModel.selectedModelID = selectedLocalModelID
                        await model.prepareLocalModel()
                    }
                }
                .disabled(model.isPreparingLocalModel || model.isInstallingOllama)

                Button("Test Local Model") {
                    Task {
                        let option = LocalModelCatalog.option(for: selectedLocalModelID)
                        await model.testLocalModel(option)
                    }
                }
                .disabled(model.testingLocalModelID != nil)

                if model.isPreparingLocalModel || model.testingLocalModelID == selectedLocalModelID {
                    ProgressView()
                        .controlSize(.small)
                }
            }

            if let message = model.modelManagerMessage ?? model.localModelMessage {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(message.localizedCaseInsensitiveContains("failed") || message.localizedCaseInsensitiveContains("could not") ? .red : .secondary)
                    .textSelection(.enabled)
            }

            GroupBox("What happens next") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Paperclip Desktop can start Ollama when local AI is needed and stop the managed server again after idle time.")
                    Text(model.ollamaControlSummary.policyDetail)
                        .foregroundStyle(.secondary)
                    Text("You can still keep cloud models available later if you want a mixed setup.")
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

private struct CloudModelSelectionRow: View {
    let model: ModelOption
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(alignment: .top, spacing: 16) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.title3)
                    .padding(.top, 2)

                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(model.displayName)
                            .font(.headline)
                        Spacer()
                        Text(model.inputCostSummary)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }

                    Text(model.tagline)
                        .foregroundStyle(.secondary)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(isSelected ? Color.accentColor.opacity(0.12) : Color.secondary.opacity(0.08))
            )
        }
        .buttonStyle(.plain)
    }
}

private struct LocalModelSelectionRow: View {
    let option: LocalModelOption
    let isSelected: Bool
    let isRecommended: Bool
    let isInstalled: Bool
    let isLoaded: Bool
    let isTooHeavy: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(alignment: .top, spacing: 16) {
                Image(systemName: isSelected ? "largecircle.fill.circle" : "circle")
                    .font(.title3)
                    .padding(.top, 2)

                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(option.displayName)
                            .font(.headline)

                        Spacer()

                        Text(option.downloadSizeSummary)
                            .font(.subheadline.monospacedDigit())
                            .foregroundStyle(.secondary)
                    }

                    HStack(spacing: 6) {
                        if isRecommended {
                            statusPill("Recommended")
                        }
                        if option.id == LocalModelCatalog.gemma4.first?.id {
                            statusPill("Best for speed")
                        }
                        if option.id == LocalModelCatalog.gemma4.dropFirst().last?.id {
                            statusPill("Best quality")
                        }
                        if isInstalled {
                            statusPill(isLoaded ? "Loaded" : "Installed")
                        }
                    }

                    Text(option.tagline)
                        .foregroundStyle(.secondary)

                    Text("Estimated memory \(option.recommendedMemoryGB) GB · Minimum budget \(option.minimumBudgetGB) GB")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if isTooHeavy {
                        Text("This model is heavier than the current memory budget in the app.")
                            .font(.caption)
                            .foregroundStyle(.orange)
                    }
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .fill(isSelected ? Color.accentColor.opacity(0.12) : Color.secondary.opacity(0.08))
            )
        }
        .buttonStyle(.plain)
    }

    private func statusPill(_ text: String) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(Capsule().fill(Color.accentColor.opacity(0.16)))
            .foregroundStyle(Color.accentColor)
    }
}

extension ModelSelectionStepView {
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
}
