import Foundation
import PaperclipShared

struct BundledSkillPackFile: Identifiable, Hashable {
    let resourceFileName: String
    let outputFileName: String
    let summary: String

    var id: String { outputFileName }

    var displayName: String {
        outputFileName
    }
}

struct BundledSkillPack: Identifiable, Hashable {
    let id: String
    let title: String
    let summary: String
    let recommendedRoles: [RoleKind]
    let resourceDirectory: String
    let learnMoreURL: URL?
    let files: [BundledSkillPackFile]

    var recommendedRoleSummary: String {
        recommendedRoles.map(\.title).joined(separator: ", ")
    }

    func text(for file: BundledSkillPackFile) -> String {
        guard let url = bundledFileURL(for: file.resourceFileName),
              let text = try? String(contentsOf: url, encoding: .utf8) else {
            return "Could not read the bundled file \(file.outputFileName)."
        }

        return text
    }

    func allFileContents() -> [String: String] {
        Dictionary(uniqueKeysWithValues: files.map { file in
            (file.outputFileName, text(for: file))
        })
    }

    private func bundledFileURL(for fileName: String) -> URL? {
        let bundle = Bundle.module
        return bundle.url(forResource: fileName, withExtension: nil, subdirectory: "StarterSkills/\(resourceDirectory)")
            ?? bundle.url(forResource: fileName, withExtension: nil)
    }

    static let starterPacks: [BundledSkillPack] = [
        BundledSkillPack(
            id: "task-planning",
            title: "Task Planning Pack",
            summary: "Helps an agent break work into smaller steps, define deliverables, and keep execution structured.",
            recommendedRoles: [.ceo, .cto, .engineer, .general],
            resourceDirectory: "task-planning",
            learnMoreURL: URL(string: "https://github.com/search?q=filename%3ASKILL.md+agent+planning&type=code"),
            files: [
                BundledSkillPackFile(resourceFileName: "task-planning-SKILL.md", outputFileName: "SKILL.md", summary: "The main skill instructions"),
                BundledSkillPackFile(resourceFileName: "planning-checklist.md", outputFileName: "planning-checklist.md", summary: "A reusable checklist for planning work")
            ]
        ),
        BundledSkillPack(
            id: "research-brief",
            title: "Research Brief Pack",
            summary: "Guides research, source collection, and concise summary writing for analysis-heavy work.",
            recommendedRoles: [.ceo, .researcher, .general, .cmo],
            resourceDirectory: "research-brief",
            learnMoreURL: URL(string: "https://github.com/search?q=filename%3ASKILL.md+agent+research&type=code"),
            files: [
                BundledSkillPackFile(resourceFileName: "research-brief-SKILL.md", outputFileName: "SKILL.md", summary: "The main research skill"),
                BundledSkillPackFile(resourceFileName: "brief-template.md", outputFileName: "brief-template.md", summary: "A simple briefing template")
            ]
        ),
        BundledSkillPack(
            id: "qa-release-pass",
            title: "QA Release Pass Pack",
            summary: "Focuses an agent on verification, regression risk, and structured release readiness reporting.",
            recommendedRoles: [.qa, .engineer, .cto],
            resourceDirectory: "qa-release-pass",
            learnMoreURL: URL(string: "https://github.com/search?q=filename%3ASKILL.md+agent+qa&type=code"),
            files: [
                BundledSkillPackFile(resourceFileName: "qa-release-pass-SKILL.md", outputFileName: "SKILL.md", summary: "The main QA skill"),
                BundledSkillPackFile(resourceFileName: "release-report-template.md", outputFileName: "release-report-template.md", summary: "A reusable release report template")
            ]
        )
    ]
}
