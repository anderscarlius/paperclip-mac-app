import Foundation
import PaperclipShared

enum DesktopPaths {
    static let paperclipInstanceID = "default"

    static var root: URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appending(path: "PaperclipDesktop", directoryHint: .isDirectory)
    }

    static var workspaceRoot: URL {
        FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
            .appending(path: "Paperclip Desktop", directoryHint: .isDirectory)
    }

    static var companiesDirectory: URL {
        workspaceRoot.appending(path: "Companies", directoryHint: .isDirectory)
    }

    static var sharedSkillsDirectory: URL {
        workspaceRoot.appending(path: "Skill Library", directoryHint: .isDirectory)
    }

    static var paperclipDirectory: URL {
        root.appending(path: "paperclip", directoryHint: .isDirectory)
    }

    static var paperclipHomeDirectory: URL {
        root.appending(path: "paperclip-home", directoryHint: .isDirectory)
    }

    static var paperclipSourceReceiptURL: URL {
        root.appending(path: "paperclip-source-receipt.txt", directoryHint: .notDirectory)
    }

    static var paperclipSourceMetadataURL: URL {
        root.appending(path: "paperclip-source-metadata.json", directoryHint: .notDirectory)
    }

    static var paperclipInstallReceiptURL: URL {
        root.appending(path: "paperclip-install-receipt.txt", directoryHint: .notDirectory)
    }

    static var paperclipBuildReceiptURL: URL {
        root.appending(path: "paperclip-build-receipt.txt", directoryHint: .notDirectory)
    }

    static var dataDirectory: URL {
        root.appending(path: "data", directoryHint: .isDirectory)
    }

    static var instancesDirectory: URL {
        companiesDirectory
    }

    static var legacyInstancesDirectory: URL {
        root.appending(path: "instances", directoryHint: .isDirectory)
    }

    static var logsDirectory: URL {
        root.appending(path: "logs", directoryHint: .isDirectory)
    }

    static var configURL: URL {
        root.appending(path: "config.json", directoryHint: .notDirectory)
    }

    static func ensureBaseDirectories() throws {
        try [root, paperclipDirectory, paperclipHomeDirectory, dataDirectory, logsDirectory, workspaceRoot, companiesDirectory, sharedSkillsDirectory].forEach {
            try FileManager.default.createDirectory(at: $0, withIntermediateDirectories: true)
        }

        try migrateLegacyCompanyFilesIfNeeded()
    }

    static func ensurePaperclipRuntimeDirectories(instanceID: String = paperclipInstanceID) throws {
        try ensureBaseDirectories()
        try [
            paperclipInstanceRoot(instanceID: instanceID),
            paperclipLogsDirectory(instanceID: instanceID)
        ].forEach {
            try FileManager.default.createDirectory(at: $0, withIntermediateDirectories: true)
        }
    }

    static func paperclipInstanceRoot(instanceID: String = paperclipInstanceID) -> URL {
        paperclipHomeDirectory
            .appending(path: "instances", directoryHint: .isDirectory)
            .appending(path: instanceID, directoryHint: .isDirectory)
    }

    static func paperclipRuntimeConfigURL(instanceID: String = paperclipInstanceID) -> URL {
        paperclipInstanceRoot(instanceID: instanceID).appending(path: "config.json", directoryHint: .notDirectory)
    }

    static func paperclipRuntimeEnvURL(instanceID: String = paperclipInstanceID) -> URL {
        paperclipInstanceRoot(instanceID: instanceID).appending(path: ".env", directoryHint: .notDirectory)
    }

    static func paperclipLogsDirectory(instanceID: String = paperclipInstanceID) -> URL {
        paperclipInstanceRoot(instanceID: instanceID).appending(path: "logs", directoryHint: .isDirectory)
    }

    static func paperclipCodexHomeDirectory(
        companyID: String,
        instanceID: String = paperclipInstanceID
    ) -> URL {
        paperclipInstanceRoot(instanceID: instanceID)
            .appending(path: "companies", directoryHint: .isDirectory)
            .appending(path: companyID, directoryHint: .isDirectory)
            .appending(path: "codex-ollama-home", directoryHint: .isDirectory)
    }

    static func ensurePaperclipCodexHomeDirectory(
        companyID: String,
        instanceID: String = paperclipInstanceID
    ) throws {
        try ensurePaperclipRuntimeDirectories(instanceID: instanceID)
        try FileManager.default.createDirectory(
            at: paperclipCodexHomeDirectory(companyID: companyID, instanceID: instanceID),
            withIntermediateDirectories: true
        )
    }

    static func companyDirectory(id: String) -> URL {
        companiesDirectory.appending(path: id, directoryHint: .isDirectory)
    }

    static func companyMetadataURL(id: String) -> URL {
        companyDirectory(id: id).appending(path: "company.json", directoryHint: .notDirectory)
    }

    static func companyFilesDirectory(id: String) -> URL {
        companyDirectory(id: id).appending(path: "Files", directoryHint: .isDirectory)
    }

    static func agentDirectory(companyID: String, agentID: String) -> URL {
        companyDirectory(id: companyID)
            .appending(path: "agents", directoryHint: .isDirectory)
            .appending(path: agentID, directoryHint: .isDirectory)
    }

    static func agentSkillsDirectory(companyID: String, agentID: String) -> URL {
        agentDirectory(companyID: companyID, agentID: agentID)
            .appending(path: "Skills", directoryHint: .isDirectory)
    }

    static func instructionFileURL(companyID: String, agentID: String, kind: InstructionFileKind) -> URL {
        agentDirectory(companyID: companyID, agentID: agentID).appending(path: kind.rawValue, directoryHint: .notDirectory)
    }

    private static func migrateLegacyCompanyFilesIfNeeded() throws {
        guard FileManager.default.fileExists(atPath: legacyInstancesDirectory.path) else {
            return
        }

        for item in try FileManager.default.contentsOfDirectory(at: legacyInstancesDirectory, includingPropertiesForKeys: nil) {
            let destination = companiesDirectory.appending(path: item.lastPathComponent, directoryHint: .isDirectory)
            guard !FileManager.default.fileExists(atPath: destination.path) else {
                continue
            }

            try FileManager.default.moveItem(at: item, to: destination)
        }
    }
}
