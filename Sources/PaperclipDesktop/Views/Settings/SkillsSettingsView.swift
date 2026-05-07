import AppKit
import PaperclipShared
import SwiftUI

struct SkillsSettingsView: View {
    @Bindable var model: DesktopAppModel

    @State private var selectedCompanyID: String?
    @State private var selectedAgentID: String?
    @State private var selectedStarterPackID = BundledSkillPack.starterPacks.first?.id ?? ""
    @State private var selectedStarterFileName = BundledSkillPack.starterPacks.first?.files.first?.outputFileName ?? "SKILL.md"

    @State private var customSkillRequest = ""
    @State private var customSkillTitle = "Custom Skill"
    @State private var customSkillDraft = ""
    @State private var importedSkillTitle = "Imported Skill"
    @State private var importedSkillText = ""
    @State private var starterSkillReview = ""
    @State private var importedSkillReview = ""
    @State private var draftSkillReview = ""
    @State private var skillsMessage: String?

    @State private var isDraftingSkill = false
    @State private var isReviewingStarterSkill = false
    @State private var isReviewingImportedSkill = false
    @State private var isReviewingDraftSkill = false
    @State private var isInstallingSkill = false

    private let workspaceService = SkillWorkspaceService()
    private let localAIService = LocalAISkillAssistantService()

    var body: some View {
        Form {
            Section("Choose a Target Agent") {
                Text("Pick the company and agent that should receive a skill. Skills are installed as normal files inside the agent folder so you can browse and edit them in Finder.")
                    .foregroundStyle(.secondary)

                if model.companies.isEmpty {
                    ContentUnavailableView(
                        "No Company Yet",
                        systemImage: "building.2",
                        description: Text("Create your first company before you start installing skills.")
                    )
                } else {
                    Picker("Company", selection: companySelectionBinding) {
                        ForEach(model.companies) { company in
                            Text(company.name).tag(company.id as String?)
                        }
                    }

                    Picker("Agent", selection: agentSelectionBinding) {
                        ForEach(availableAgents) { agent in
                            Text(agent.name).tag(agent.id as String?)
                        }
                    }

                    GroupBox("Where Files Go") {
                        VStack(alignment: .leading, spacing: 8) {
                            LabeledContent("Agent skills", value: selectedAgentSkillsPath)
                            LabeledContent("Company files", value: selectedCompanyFilesPath)
                            LabeledContent("Shared skill library", value: DesktopPaths.sharedSkillsDirectory.path)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    HStack {
                        Button("Open Agent Skills Folder") {
                            openAgentSkillsFolder()
                        }
                        .disabled(selectedCompany == nil || selectedAgent == nil)

                        Button("Open Company Files Folder") {
                            openCompanyFilesFolder()
                        }
                        .disabled(selectedCompany == nil)

                        Button("Open Shared Skill Library") {
                            openSharedSkillLibrary()
                        }
                    }
                }
            }

            Section("Build a Skill with Local AI") {
                Text("Use your local Gemma 4 model to draft a new SKILL.md file. This is a good starting point when you know what an agent should learn but do not want to write the whole skill by hand.")
                    .foregroundStyle(.secondary)

                localAIStatusCard

                TextField("Skill title", text: $customSkillTitle)
                TextEditor(text: $customSkillRequest)
                    .font(.system(.body, design: .default))
                    .frame(minHeight: 120)

                HStack {
                    Button("Draft Skill with Local AI") {
                        Task {
                            await draftCustomSkill()
                        }
                    }
                    .disabled(isDraftingSkill || selectedAgent == nil || customSkillRequest.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    Button("Set Up Local AI Now") {
                        Task {
                            await model.prepareLocalModel()
                        }
                    }
                    .disabled(model.isPreparingLocalModel)

                    if isDraftingSkill || model.isPreparingLocalModel {
                        ProgressView()
                            .controlSize(.small)
                    }
                }

                if !customSkillDraft.isEmpty {
                    skillPreview(title: "Drafted SKILL.md", text: customSkillDraft)

                    HStack {
                        Button("Review Draft with Local AI") {
                            Task {
                                await reviewDraftSkill()
                            }
                        }
                        .disabled(isReviewingDraftSkill)

                        Button("Install Draft for Agent") {
                            installDraftForAgent()
                        }
                        .disabled(isInstallingSkill || selectedCompany == nil || selectedAgent == nil)

                        Button("Save Draft to Shared Library") {
                            saveDraftToSharedLibrary()
                        }
                        .disabled(isInstallingSkill)

                        if isReviewingDraftSkill || isInstallingSkill {
                            ProgressView()
                                .controlSize(.small)
                        }
                    }
                }

                if !draftSkillReview.isEmpty {
                    reviewBox(title: "Draft Review", text: draftSkillReview)
                }
            }

            Section("Starter Skills") {
                Text("Start from a ready-made pack, read every included file, and review it with local AI before you install it.")
                    .foregroundStyle(.secondary)

                Picker("Starter skill", selection: $selectedStarterPackID) {
                    ForEach(BundledSkillPack.starterPacks) { pack in
                        Text(pack.title).tag(pack.id)
                    }
                }
                .onChange(of: selectedStarterPackID) { _, _ in
                    selectedStarterFileName = selectedStarterPack?.files.first?.outputFileName ?? "SKILL.md"
                    starterSkillReview = ""
                }

                if let selectedStarterPack {
                    GroupBox(selectedStarterPack.title) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text(selectedStarterPack.summary)
                            LabeledContent("Best for", value: selectedStarterPack.recommendedRoleSummary)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }

                    Picker("Preview file", selection: $selectedStarterFileName) {
                        ForEach(selectedStarterPack.files) { file in
                            Text(file.displayName).tag(file.outputFileName)
                        }
                    }

                    skillPreview(
                        title: selectedStarterFile?.outputFileName ?? "Starter file",
                        text: starterPreviewText
                    )

                    HStack {
                        Button("Review with Local AI") {
                            Task {
                                await reviewStarterSkill()
                            }
                        }
                        .disabled(isReviewingStarterSkill)

                        Button("Install for Agent") {
                            installStarterSkill()
                        }
                        .disabled(isInstallingSkill || selectedCompany == nil || selectedAgent == nil)

                        Button("Add to Shared Library") {
                            addStarterSkillToSharedLibrary()
                        }
                        .disabled(isInstallingSkill)

                        if isReviewingStarterSkill || isInstallingSkill {
                            ProgressView()
                                .controlSize(.small)
                        }
                    }

                    if let learnMoreURL = selectedStarterPack.learnMoreURL {
                        Link("Find similar skills on GitHub", destination: learnMoreURL)
                    }
                }

                if !starterSkillReview.isEmpty {
                    reviewBox(title: "Starter Skill Review", text: starterSkillReview)
                }
            }

            Section("Review a Skill Before You Copy It In") {
                Text("Paste a skill or helper file you found elsewhere, ask local AI to review it, and then install it only if it looks right for your agent.")
                    .foregroundStyle(.secondary)

                TextField("Imported skill title", text: $importedSkillTitle)
                TextEditor(text: $importedSkillText)
                    .font(.system(.body, design: .monospaced))
                    .frame(minHeight: 140)

                HStack {
                    Button("Review Imported Skill with Local AI") {
                        Task {
                            await reviewImportedSkill()
                        }
                    }
                    .disabled(isReviewingImportedSkill || importedSkillText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    Button("Install Imported Skill for Agent") {
                        installImportedSkill()
                    }
                    .disabled(isInstallingSkill || selectedCompany == nil || selectedAgent == nil || importedSkillText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)

                    if isReviewingImportedSkill || isInstallingSkill {
                        ProgressView()
                            .controlSize(.small)
                    }
                }

                if !importedSkillReview.isEmpty {
                    reviewBox(title: "Imported Skill Review", text: importedSkillReview)
                }
            }

            Section("Manual Files and Ready-Made Skills") {
                Text("Other supporting files can usually go in the company Files folder or inside the agent's Skills folder if they belong to one specific skill.")
                    .foregroundStyle(.secondary)

                Link(
                    "Browse ready-made SKILL.md files on GitHub",
                    destination: URL(string: "https://github.com/search?q=filename%3ASKILL.md&type=code")!
                )

                Link(
                    "Open the Paperclip repository",
                    destination: URL(string: "https://github.com/paperclipai/paperclip")!
                )
            }

            if let skillsMessage {
                Section {
                    Text(skillsMessage)
                        .foregroundStyle(.green)
                }
            }
        }
        .formStyle(.grouped)
        .onAppear {
            syncSelection()
        }
        .onChange(of: model.companies) { _, _ in
            syncSelection()
        }
    }

    private var selectedCompany: Company? {
        guard let selectedCompanyID else { return nil }
        return model.companies.first(where: { $0.id == selectedCompanyID })
    }

    private var availableAgents: [Agent] {
        selectedCompany?.agents ?? []
    }

    private var selectedAgent: Agent? {
        guard let selectedAgentID else { return nil }
        return availableAgents.first(where: { $0.id == selectedAgentID })
    }

    private var selectedStarterPack: BundledSkillPack? {
        BundledSkillPack.starterPacks.first(where: { $0.id == selectedStarterPackID }) ?? BundledSkillPack.starterPacks.first
    }

    private var selectedStarterFile: BundledSkillPackFile? {
        selectedStarterPack?.files.first(where: { $0.outputFileName == selectedStarterFileName }) ?? selectedStarterPack?.files.first
    }

    private var starterPreviewText: String {
        guard let selectedStarterPack, let selectedStarterFile else {
            return ""
        }
        return selectedStarterPack.text(for: selectedStarterFile)
    }

    private var selectedAgentSkillsPath: String {
        guard let selectedCompany, let selectedAgent else {
            return "Choose a company and agent first"
        }

        return DesktopPaths.agentSkillsDirectory(companyID: selectedCompany.id, agentID: selectedAgent.id).path
    }

    private var selectedCompanyFilesPath: String {
        guard let selectedCompany else {
            return "Choose a company first"
        }

        return DesktopPaths.companyFilesDirectory(id: selectedCompany.id).path
    }

    private var companySelectionBinding: Binding<String?> {
        Binding(
            get: { selectedCompanyID ?? model.companies.first?.id },
            set: { newValue in
                selectedCompanyID = newValue
                selectedAgentID = selectedCompany?.agents.first?.id
            }
        )
    }

    private var agentSelectionBinding: Binding<String?> {
        Binding(
            get: { selectedAgentID ?? availableAgents.first?.id },
            set: { selectedAgentID = $0 }
        )
    }

    @ViewBuilder
    private var localAIStatusCard: some View {
        GroupBox("Local AI Status") {
            VStack(alignment: .leading, spacing: 8) {
                if !model.config.localModel.isEnabled {
                    Text("Local AI is currently turned off. Enable Gemma 4 in Settings > Models if you want the app to draft or review skills for you.")
                        .foregroundStyle(.orange)
                } else if let runtime = model.localModelRuntime, runtime.selectedModelInstalled {
                    Text("Local AI is ready with \(runtime.selectedModel.displayName).")
                    Text("This tab uses your local model to help draft and review skills before you install them.")
                        .foregroundStyle(.secondary)
                } else {
                    Text("Your selected local model is not ready yet. Use Set Up Local AI to install Ollama and download the model first.")
                        .foregroundStyle(.orange)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    @ViewBuilder
    private func skillPreview(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)

            ScrollView {
                Text(text)
                    .font(.system(.caption, design: .monospaced))
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .textSelection(.enabled)
                    .padding(14)
            }
            .frame(minHeight: 220)
            .background {
                RoundedRectangle(cornerRadius: 12)
                    .fill(.quaternary.opacity(0.35))
            }
        }
    }

    @ViewBuilder
    private func reviewBox(title: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.headline)

            Text(text)
                .frame(maxWidth: .infinity, alignment: .leading)
                .textSelection(.enabled)
                .padding(14)
                .background {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(.quaternary.opacity(0.35))
                }
        }
    }

    private func syncSelection() {
        if selectedCompanyID == nil || !model.companies.contains(where: { $0.id == selectedCompanyID }) {
            selectedCompanyID = model.selectedCompany?.id ?? model.companies.first?.id
        }

        if selectedAgentID == nil || !availableAgents.contains(where: { $0.id == selectedAgentID }) {
            selectedAgentID = availableAgents.first?.id
        }
    }

    private func openAgentSkillsFolder() {
        guard let selectedCompany, let selectedAgent else { return }

        do {
            let directory = try workspaceService.ensureAgentSkillsDirectory(company: selectedCompany, agent: selectedAgent)
            NSWorkspace.shared.activateFileViewerSelecting([directory])
        } catch {
            model.errorMessage = error.localizedDescription
        }
    }

    private func openCompanyFilesFolder() {
        guard let selectedCompany else { return }

        do {
            try DesktopPaths.ensureBaseDirectories()
            let directory = DesktopPaths.companyFilesDirectory(id: selectedCompany.id)
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            NSWorkspace.shared.activateFileViewerSelecting([directory])
        } catch {
            model.errorMessage = error.localizedDescription
        }
    }

    private func openSharedSkillLibrary() {
        do {
            let directory = try workspaceService.ensureSharedSkillsDirectory()
            NSWorkspace.shared.activateFileViewerSelecting([directory])
        } catch {
            model.errorMessage = error.localizedDescription
        }
    }

    private func draftCustomSkill() async {
        guard let selectedAgent else { return }

        isDraftingSkill = true
        draftSkillReview = ""
        skillsMessage = nil

        do {
            customSkillDraft = try await localAIService.draftSkill(
                from: customSkillRequest,
                for: selectedAgent,
                modelID: model.config.localModel.selectedModelID
            )
        } catch {
            model.errorMessage = error.localizedDescription
        }

        isDraftingSkill = false
    }

    private func reviewDraftSkill() async {
        guard !customSkillDraft.isEmpty else { return }

        isReviewingDraftSkill = true
        do {
            draftSkillReview = try await localAIService.reviewSkill(
                title: customSkillTitle,
                content: customSkillDraft,
                targetAgent: selectedAgent,
                modelID: model.config.localModel.selectedModelID
            )
        } catch {
            model.errorMessage = error.localizedDescription
        }
        isReviewingDraftSkill = false
    }

    private func reviewStarterSkill() async {
        guard let selectedStarterPack else { return }

        isReviewingStarterSkill = true
        do {
            let mergedContent = selectedStarterPack.files.map { file in
                """
                ## \(file.outputFileName)
                \(selectedStarterPack.text(for: file))
                """
            }
            .joined(separator: "\n\n")

            starterSkillReview = try await localAIService.reviewSkill(
                title: selectedStarterPack.title,
                content: mergedContent,
                targetAgent: selectedAgent,
                modelID: model.config.localModel.selectedModelID
            )
        } catch {
            model.errorMessage = error.localizedDescription
        }
        isReviewingStarterSkill = false
    }

    private func reviewImportedSkill() async {
        guard !importedSkillText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        isReviewingImportedSkill = true
        do {
            importedSkillReview = try await localAIService.reviewSkill(
                title: importedSkillTitle,
                content: importedSkillText,
                targetAgent: selectedAgent,
                modelID: model.config.localModel.selectedModelID
            )
        } catch {
            model.errorMessage = error.localizedDescription
        }
        isReviewingImportedSkill = false
    }

    private func installStarterSkill() {
        guard let selectedStarterPack, let selectedCompany, let selectedAgent else { return }

        isInstallingSkill = true
        defer { isInstallingSkill = false }

        do {
            let directory = try workspaceService.install(pack: selectedStarterPack, for: selectedCompany, agent: selectedAgent)
            skillsMessage = "Installed \(selectedStarterPack.title) for \(selectedAgent.name) in \(directory.path)."
        } catch {
            model.errorMessage = error.localizedDescription
        }
    }

    private func addStarterSkillToSharedLibrary() {
        guard let selectedStarterPack else { return }

        isInstallingSkill = true
        defer { isInstallingSkill = false }

        do {
            let directory = try workspaceService.addToSharedLibrary(pack: selectedStarterPack)
            skillsMessage = "Added \(selectedStarterPack.title) to the shared skill library in \(directory.path)."
        } catch {
            model.errorMessage = error.localizedDescription
        }
    }

    private func installDraftForAgent() {
        guard let selectedCompany, let selectedAgent else { return }

        isInstallingSkill = true
        defer { isInstallingSkill = false }

        do {
            let directory = try workspaceService.installCustomSkill(
                title: customSkillTitle,
                content: customSkillDraft,
                for: selectedCompany,
                agent: selectedAgent
            )
            skillsMessage = "Installed the drafted skill for \(selectedAgent.name) in \(directory.path)."
        } catch {
            model.errorMessage = error.localizedDescription
        }
    }

    private func saveDraftToSharedLibrary() {
        isInstallingSkill = true
        defer { isInstallingSkill = false }

        do {
            let directory = try workspaceService.addCustomSkillToSharedLibrary(
                title: customSkillTitle,
                content: customSkillDraft
            )
            skillsMessage = "Saved the drafted skill to the shared skill library in \(directory.path)."
        } catch {
            model.errorMessage = error.localizedDescription
        }
    }

    private func installImportedSkill() {
        guard let selectedCompany, let selectedAgent else { return }

        isInstallingSkill = true
        defer { isInstallingSkill = false }

        do {
            let directory = try workspaceService.installCustomSkill(
                title: importedSkillTitle,
                content: importedSkillText,
                for: selectedCompany,
                agent: selectedAgent
            )
            skillsMessage = "Installed the imported skill for \(selectedAgent.name) in \(directory.path)."
        } catch {
            model.errorMessage = error.localizedDescription
        }
    }
}
