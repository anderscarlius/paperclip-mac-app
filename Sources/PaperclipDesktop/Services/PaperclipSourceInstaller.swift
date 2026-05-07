import CryptoKit
import Foundation

struct InstalledPaperclipSource {
    let sourceDirectory: URL
    let sourceSignature: String
    let metadata: PaperclipSourceMetadata
}

struct PaperclipSourceInstaller {
    private let excludedNames: Set<String> = [
        ".git",
        "node_modules",
        ".turbo",
        ".DS_Store"
    ]

    func runtimeStatus() throws -> PaperclipRuntimeStatus {
        try DesktopPaths.ensureBaseDirectories()

        let bundledSource = try locateBundledSource()
        let sourceSignature = try computeSourceSignature(for: bundledSource)
        let bundledSourceMetadata = bundledMetadata(for: bundledSource)
        let installedPackageURL = DesktopPaths.paperclipDirectory.appending(path: "package.json", directoryHint: .notDirectory)
        let installedSignature = installedSourceSignature()
        let installedSourceMetadata = installedMetadata()

        return PaperclipRuntimeStatus(
            bundledSourceSignature: sourceSignature,
            installedSourceSignature: FileManager.default.fileExists(atPath: installedPackageURL.path) ? installedSignature : nil,
            bundledSourceMetadata: bundledSourceMetadata,
            installedSourceMetadata: FileManager.default.fileExists(atPath: installedPackageURL.path)
                ? (installedSourceMetadata ?? (installedSignature == sourceSignature ? bundledSourceMetadata : nil))
                : nil
        )
    }

    func synchronizeIfNeeded(force: Bool = false) throws -> InstalledPaperclipSource {
        try DesktopPaths.ensureBaseDirectories()

        let bundledSource = try locateBundledSource()
        let sourceSignature = try computeSourceSignature(for: bundledSource)
        let metadata = bundledMetadata(for: bundledSource)

        return try installSource(
            from: bundledSource,
            sourceSignature: sourceSignature,
            metadata: metadata,
            force: force
        )
    }

    func installSource(
        from sourceDirectory: URL,
        sourceSignature: String,
        metadata: PaperclipSourceMetadata,
        force: Bool = false
    ) throws -> InstalledPaperclipSource {
        try DesktopPaths.ensureBaseDirectories()

        let installedSignature = installedSourceSignature()
        let installedPackageURL = DesktopPaths.paperclipDirectory.appending(path: "package.json", directoryHint: .notDirectory)
        let metadataNeedsWrite = !FileManager.default.fileExists(atPath: DesktopPaths.paperclipSourceMetadataURL.path)

        if force ||
            installedSignature != sourceSignature ||
            !FileManager.default.fileExists(atPath: installedPackageURL.path) {
            if FileManager.default.fileExists(atPath: DesktopPaths.paperclipDirectory.path) {
                try FileManager.default.removeItem(at: DesktopPaths.paperclipDirectory)
            }

            try FileManager.default.createDirectory(at: DesktopPaths.paperclipDirectory, withIntermediateDirectories: true)
            try copyDirectoryContents(from: sourceDirectory, to: DesktopPaths.paperclipDirectory)
            try sourceSignature.write(to: DesktopPaths.paperclipSourceReceiptURL, atomically: true, encoding: .utf8)
        }

        if force || metadataNeedsWrite {
            try writeInstalledMetadata(metadata)
        }

        return InstalledPaperclipSource(
            sourceDirectory: DesktopPaths.paperclipDirectory,
            sourceSignature: sourceSignature,
            metadata: metadata
        )
    }

    private func installedSourceSignature() -> String? {
        guard let installedSignature = try? String(contentsOf: DesktopPaths.paperclipSourceReceiptURL, encoding: .utf8) else {
            return nil
        }

        return installedSignature.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func installedMetadata() -> PaperclipSourceMetadata? {
        guard let data = try? Data(contentsOf: DesktopPaths.paperclipSourceMetadataURL) else {
            return nil
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try? decoder.decode(PaperclipSourceMetadata.self, from: data)
    }

    private func locateBundledSource() throws -> URL {
        let candidateDirectories = [
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath),
            URL(fileURLWithPath: ProcessInfo.processInfo.environment["PWD"] ?? FileManager.default.currentDirectoryPath),
            Bundle.main.bundleURL
                .deletingLastPathComponent()
                .deletingLastPathComponent()
        ]

        for candidateRoot in candidateDirectories {
            let candidate = candidateRoot
                .appending(path: "vendor", directoryHint: .isDirectory)
                .appending(path: "paperclip", directoryHint: .isDirectory)
            if FileManager.default.fileExists(atPath: candidate.appending(path: "package.json", directoryHint: .notDirectory).path) {
                return candidate
            }
        }

        if let bundledSource = Bundle.main.resourceURL?.appending(path: "paperclip", directoryHint: .isDirectory),
           FileManager.default.fileExists(atPath: bundledSource.appending(path: "package.json", directoryHint: .notDirectory).path) {
            return bundledSource
        }

        throw PaperclipSourceInstallerError.sourceNotFound
    }

    private func computeSourceSignature(for sourceDirectory: URL) throws -> String {
        let rootsToHash = [
            "package.json",
            "pnpm-lock.yaml",
            "pnpm-workspace.yaml",
            "cli/package.json",
            "server/package.json",
            "ui/package.json",
            "cli/src",
            "server/src",
            "ui/src",
            "packages/adapters",
            "packages/adapter-utils/src",
            "packages/db/src"
        ]

        var hasher = SHA256()
        for relativePath in rootsToHash {
            let fileURL = sourceDirectory.appending(path: relativePath, directoryHint: .inferFromPath)
            guard FileManager.default.fileExists(atPath: fileURL.path) else { continue }

            var isDirectory: ObjCBool = false
            guard FileManager.default.fileExists(atPath: fileURL.path, isDirectory: &isDirectory) else {
                continue
            }

            if isDirectory.boolValue {
                let enumerator = FileManager.default.enumerator(
                    at: fileURL,
                    includingPropertiesForKeys: [.isRegularFileKey],
                    options: [.skipsHiddenFiles]
                )

                while let candidate = enumerator?.nextObject() as? URL {
                    let resourceValues = try candidate.resourceValues(forKeys: [.isRegularFileKey])
                    guard resourceValues.isRegularFile == true else { continue }
                    let relativeCandidate = candidate.path.replacingOccurrences(of: "\(sourceDirectory.path)/", with: "")
                    hasher.update(data: Data(relativeCandidate.utf8))
                    hasher.update(data: try Data(contentsOf: candidate))
                }
            } else {
                hasher.update(data: Data(relativePath.utf8))
                hasher.update(data: try Data(contentsOf: fileURL))
            }
        }

        return hasher.finalize().map { String(format: "%02x", $0) }.joined()
    }

    private func bundledMetadata(for sourceDirectory: URL) -> PaperclipSourceMetadata {
        let metadataURL = sourceDirectory.appending(path: ".paperclip-source.json", directoryHint: .notDirectory)
        guard let data = try? Data(contentsOf: metadataURL) else {
            return .bundledDefault()
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode(PaperclipSourceMetadata.self, from: data)) ?? .bundledDefault()
    }

    private func writeInstalledMetadata(_ metadata: PaperclipSourceMetadata) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        let data = try encoder.encode(metadata)
        try data.write(to: DesktopPaths.paperclipSourceMetadataURL, options: .atomic)
    }

    private func copyDirectoryContents(from sourceDirectory: URL, to destinationDirectory: URL) throws {
        for item in try FileManager.default.contentsOfDirectory(at: sourceDirectory, includingPropertiesForKeys: nil) {
            guard !excludedNames.contains(item.lastPathComponent) else { continue }
            let destination = destinationDirectory.appending(path: item.lastPathComponent, directoryHint: .inferFromPath)
            try FileManager.default.copyItem(at: item, to: destination)
        }
    }
}

enum PaperclipSourceInstallerError: LocalizedError {
    case sourceNotFound

    var errorDescription: String? {
        switch self {
        case .sourceNotFound:
            "Could not locate the vendored Paperclip source. Expected vendor/paperclip in the workspace or a bundled paperclip resource in the app."
        }
    }
}
