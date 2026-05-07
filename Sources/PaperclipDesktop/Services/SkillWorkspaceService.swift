import Foundation
import PaperclipShared

struct SkillWorkspaceService {
    func ensureSharedSkillsDirectory() throws -> URL {
        try DesktopPaths.ensureBaseDirectories()
        let directory = DesktopPaths.sharedSkillsDirectory
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    func ensureAgentSkillsDirectory(company: Company, agent: Agent) throws -> URL {
        try DesktopPaths.ensureBaseDirectories()
        let directory = DesktopPaths.agentSkillsDirectory(companyID: company.id, agentID: agent.id)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    func install(pack: BundledSkillPack, for company: Company, agent: Agent) throws -> URL {
        let targetDirectory = try ensureAgentSkillsDirectory(company: company, agent: agent)
            .appending(path: pack.id, directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: targetDirectory, withIntermediateDirectories: true)

        for (fileName, text) in pack.allFileContents() {
            let destination = targetDirectory.appending(path: fileName, directoryHint: .notDirectory)
            try text.write(to: destination, atomically: true, encoding: .utf8)
        }

        return targetDirectory
    }

    func addToSharedLibrary(pack: BundledSkillPack) throws -> URL {
        let targetDirectory = try ensureSharedSkillsDirectory()
            .appending(path: pack.id, directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: targetDirectory, withIntermediateDirectories: true)

        for (fileName, text) in pack.allFileContents() {
            let destination = targetDirectory.appending(path: fileName, directoryHint: .notDirectory)
            try text.write(to: destination, atomically: true, encoding: .utf8)
        }

        return targetDirectory
    }

    func installCustomSkill(
        title: String,
        content: String,
        for company: Company,
        agent: Agent
    ) throws -> URL {
        let folderName = slugify(title, fallback: "custom-skill")
        let targetDirectory = try ensureAgentSkillsDirectory(company: company, agent: agent)
            .appending(path: folderName, directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: targetDirectory, withIntermediateDirectories: true)

        let destination = targetDirectory.appending(path: "SKILL.md", directoryHint: .notDirectory)
        try content.write(to: destination, atomically: true, encoding: .utf8)
        return targetDirectory
    }

    func addCustomSkillToSharedLibrary(title: String, content: String) throws -> URL {
        let folderName = slugify(title, fallback: "custom-skill")
        let targetDirectory = try ensureSharedSkillsDirectory()
            .appending(path: folderName, directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: targetDirectory, withIntermediateDirectories: true)

        let destination = targetDirectory.appending(path: "SKILL.md", directoryHint: .notDirectory)
        try content.write(to: destination, atomically: true, encoding: .utf8)
        return targetDirectory
    }

    private func slugify(_ text: String, fallback: String) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return fallback
        }

        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-"))
        let slug = trimmed
            .lowercased()
            .replacingOccurrences(of: " ", with: "-")
            .unicodeScalars
            .map { allowed.contains($0) ? Character($0) : "-" }

        let joined = String(slug)
        let collapsed = joined.replacingOccurrences(of: "--", with: "-")
        return collapsed.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
    }
}
