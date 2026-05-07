import Foundation
import PaperclipShared

struct CompanyCreationService {
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init() {
        encoder = JSONEncoder()
        decoder = JSONDecoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    func createCompany(from draft: CompanyWizardDraft) throws -> Company {
        try DesktopPaths.ensureBaseDirectories()

        let companyID = slugify(draft.name)
        let companyDirectory = DesktopPaths.companyDirectory(id: companyID)
        try FileManager.default.createDirectory(at: companyDirectory, withIntermediateDirectories: true)
        try FileManager.default.createDirectory(at: DesktopPaths.companyFilesDirectory(id: companyID), withIntermediateDirectories: true)

        let agents = draft.agents.map { templateAgent in
            Agent(
                id: templateAgent.id,
                companyID: companyID,
                name: templateAgent.title,
                role: templateAgent.role,
                modelID: draft.defaultModelID,
                status: .active,
                reportsToAgentID: templateAgent.reportsTo,
                monthlyBudget: templateAgent.monthlyBudget,
                heartbeatIntervalSec: templateAgent.heartbeatIntervalSec
            )
        }

        let company = Company(
            id: companyID,
            name: draft.name,
            goal: draft.goal,
            templateID: draft.template.id,
            spendToday: 0,
            activeAgents: agents.count,
            tasksInProgress: 0,
            agents: agents
        )

        try writeInstructions(for: draft, companyID: companyID)

        let companyData = try encoder.encode(company)
        try companyData.write(to: DesktopPaths.companyMetadataURL(id: companyID), options: .atomic)
        return company
    }

    func loadCompanies() throws -> [Company] {
        try DesktopPaths.ensureBaseDirectories()
        let items = try FileManager.default.contentsOfDirectory(at: DesktopPaths.instancesDirectory, includingPropertiesForKeys: nil)
        return try items.compactMap { url in
            let metadataURL = url.appending(path: "company.json", directoryHint: .notDirectory)
            guard FileManager.default.fileExists(atPath: metadataURL.path) else { return nil }
            let data = try Data(contentsOf: metadataURL)
            return try decoder.decode(Company.self, from: data)
        }
        .sorted { $0.createdAt < $1.createdAt }
    }

    func loadInstructionSession(company: Company, agent: Agent) throws -> InstructionEditorSession {
        let documents: [InstructionFileKind: String] = Dictionary(uniqueKeysWithValues: InstructionFileKind.allCases.map { kind in
            let url = DesktopPaths.instructionFileURL(companyID: company.id, agentID: agent.id, kind: kind)
            let text = (try? String(contentsOf: url, encoding: .utf8)) ?? ""
            return (kind, text)
        })

        return InstructionEditorSession(company: company, agent: agent, documents: documents)
    }

    func save(document text: String, for session: InstructionEditorSession, kind: InstructionFileKind) throws {
        let url = DesktopPaths.instructionFileURL(companyID: session.company.id, agentID: session.agent.id, kind: kind)
        try text.write(to: url, atomically: true, encoding: .utf8)
    }

    func resetDocument(for session: InstructionEditorSession, kind: InstructionFileKind) throws -> String {
        let template = CompanyTemplateCatalog.templates.first(where: { $0.id == session.company.templateID })
        let templateAgent = template?.agents.first(where: { $0.title == session.agent.name })
        let text = templateAgent?.instructions.text(for: kind) ?? ""
        try save(document: text, for: session, kind: kind)
        return text
    }

    private func writeInstructions(for draft: CompanyWizardDraft, companyID: String) throws {
        for agent in draft.agents {
            let agentDirectory = DesktopPaths.agentDirectory(companyID: companyID, agentID: agent.id)
            try FileManager.default.createDirectory(at: agentDirectory, withIntermediateDirectories: true)

            for kind in InstructionFileKind.allCases {
                let text: String
                switch draft.instructionMode {
                case .skip:
                    text = ""
                case .template, .custom:
                    text = agent.instructions.text(for: kind)
                }

                try text.write(
                    to: DesktopPaths.instructionFileURL(companyID: companyID, agentID: agent.id, kind: kind),
                    atomically: true,
                    encoding: .utf8
                )
            }
        }
    }

    private func slugify(_ name: String) -> String {
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-"))
        let slug = name
            .lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .unicodeScalars
            .map { allowed.contains($0) ? Character($0) : "-" }
        return String(slug).replacingOccurrences(of: "--", with: "-")
    }
}
