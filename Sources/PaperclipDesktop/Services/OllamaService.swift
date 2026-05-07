import Foundation
import PaperclipShared

struct OllamaService {
    private let commonBinaryPaths: [String] = {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        return [
            "\(home)/Applications/Ollama.app/Contents/Resources/ollama",
            "/Applications/Ollama.app/Contents/Resources/ollama",
            "/opt/homebrew/bin/ollama",
            "/usr/local/bin/ollama"
        ]
    }()

    private let serverHealthURL = URL(string: "http://127.0.0.1:11434/api/tags")!
    private let runningModelsURL = URL(string: "http://127.0.0.1:11434/api/ps")!
    private let generateURL = URL(string: "http://127.0.0.1:11434/api/generate")!
    private let downloadURL = URL(string: "https://ollama.com/download/Ollama.dmg")!
    private let releasesAPIURL = URL(string: "https://api.github.com/repos/ollama/ollama/releases/latest")!

    func isInstalled() -> Bool {
        resolvedBinaryURL() != nil
    }

    func binaryURL() -> URL? {
        resolvedBinaryURL()
    }

    func managedAppURL() -> URL {
        FileManager.default.homeDirectoryForCurrentUser
            .appending(path: "Applications", directoryHint: .isDirectory)
            .appending(path: "Ollama.app", directoryHint: .isDirectory)
    }

    func installedVersion() -> String? {
        if let binaryURL = resolvedBinaryURL(),
           let version = try? versionFromBinary(binaryURL) {
            return version
        }

        let infoPlistURL = managedAppURL()
            .appending(path: "Contents", directoryHint: .isDirectory)
            .appending(path: "Info.plist", directoryHint: .notDirectory)
        guard let plist = NSDictionary(contentsOf: infoPlistURL),
              let version = plist["CFBundleShortVersionString"] as? String else {
            return nil
        }

        return version
    }

    func installedModelTags() -> [String] {
        guard let output = try? runCommand(arguments: ["list"], captureOutput: true) else {
            return []
        }

        return output
            .split(separator: "\n")
            .dropFirst()
            .compactMap { line in
                line.split(whereSeparator: \.isWhitespace).first.map(String.init)
            }
    }

    func installedModels() async -> [OllamaInstalledModel] {
        var request = URLRequest(url: serverHealthURL)
        request.timeoutInterval = 3

        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            return installedModelTags().map {
                OllamaInstalledModel(
                    id: $0,
                    name: $0,
                    model: $0,
                    modifiedAt: nil,
                    sizeBytes: nil,
                    parameterSize: nil,
                    quantizationLevel: nil
                )
            }
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        guard let payload = try? decoder.decode(OllamaInstalledModelsResponse.self, from: data) else {
            return []
        }

        return payload.models.map {
            OllamaInstalledModel(
                id: $0.name,
                name: $0.name,
                model: $0.model,
                modifiedAt: $0.modifiedAt,
                sizeBytes: $0.size,
                parameterSize: $0.details?.parameterSize,
                quantizationLevel: $0.details?.quantizationLevel
            )
        }
    }

    func isServerReachable() async -> Bool {
        guard let (_, response) = try? await URLSession.shared.data(from: serverHealthURL),
              let httpResponse = response as? HTTPURLResponse else {
            return false
        }

        return 200..<300 ~= httpResponse.statusCode
    }

    func serverStatus() async -> OllamaServerStatus? {
        var request = URLRequest(url: runningModelsURL)
        request.timeoutInterval = 3

        guard let (data, response) = try? await URLSession.shared.data(for: request),
              let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            return nil
        }

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .iso8601

        guard let payload = try? decoder.decode(OllamaRunningModelsResponse.self, from: data) else {
            return OllamaServerStatus(isReachable: true, runningModels: [])
        }

        return OllamaServerStatus(
            isReachable: true,
            runningModels: payload.models.map {
                OllamaRunningModel(
                    id: $0.name,
                    name: $0.name,
                    sizeBytes: $0.size,
                    sizeVRAMBytes: $0.sizeVram,
                    expiresAt: $0.expiresAt
                )
            }
        )
    }

    func testGenerate(model: String) async throws -> String {
        var request = URLRequest(url: generateURL)
        request.httpMethod = "POST"
        request.timeoutInterval = 45
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(OllamaGenerateRequest(
            model: model,
            prompt: "Reply with exactly: OK",
            stream: false
        ))

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            let body = String(decoding: data, as: UTF8.self)
            throw OllamaServiceError.generateFailed(body)
        }

        let payload = try JSONDecoder().decode(OllamaGenerateResponse.self, from: data)
        return payload.response.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    func fetchLatestRelease() async throws -> OllamaRelease {
        var request = URLRequest(url: releasesAPIURL)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("PaperclipDesktop", forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw OllamaServiceError.releaseCheckFailed
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let payload = try decoder.decode(OllamaLatestReleaseResponse.self, from: data)

        return OllamaRelease(
            version: payload.tagName,
            publishedAt: payload.publishedAt,
            htmlURL: payload.htmlURL,
            downloadURL: downloadURL
        )
    }

    func installOrUpdate(
        release: OllamaRelease?,
        logHandler: @escaping @MainActor (String) -> Void
    ) async throws -> OllamaInstallResult {
        let targetRelease = release ?? OllamaRelease(
            version: "latest",
            publishedAt: nil,
            htmlURL: nil,
            downloadURL: downloadURL
        )
        let managedAppURL = managedAppURL()
        let applicationsDirectory = managedAppURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: applicationsDirectory, withIntermediateDirectories: true)

        let tempDirectory = FileManager.default.temporaryDirectory
            .appending(path: "ollama-install-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: tempDirectory, withIntermediateDirectories: true)

        let diskImageURL = tempDirectory.appending(path: "Ollama.dmg", directoryHint: .notDirectory)
        let mountPointURL = tempDirectory.appending(path: "mount", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: mountPointURL, withIntermediateDirectories: true)

        Task { @MainActor in
            logHandler("[local] Downloading Ollama \(targetRelease.shortTitle)...\n")
        }

        try await downloadDiskImage(from: targetRelease.downloadURL, to: diskImageURL)

        var mounted = false
        var installationError: Error?
        do {
            try runSystemCommand(
                executablePath: "/usr/bin/hdiutil",
                arguments: ["attach", diskImageURL.path, "-nobrowse", "-quiet", "-mountpoint", mountPointURL.path]
            )
            mounted = true

            let sourceAppURL = mountPointURL.appending(path: "Ollama.app", directoryHint: .isDirectory)
            guard FileManager.default.fileExists(atPath: sourceAppURL.path) else {
                throw OllamaServiceError.invalidInstaller
            }

            let backupURL = applicationsDirectory.appending(path: "Ollama.app.previous", directoryHint: .isDirectory)
            if FileManager.default.fileExists(atPath: backupURL.path) {
                try? FileManager.default.removeItem(at: backupURL)
            }

            if FileManager.default.fileExists(atPath: managedAppURL.path) {
                try FileManager.default.moveItem(at: managedAppURL, to: backupURL)
            }

            do {
                try runSystemCommand(
                    executablePath: "/usr/bin/ditto",
                    arguments: [sourceAppURL.path, managedAppURL.path]
                )
                if FileManager.default.fileExists(atPath: backupURL.path) {
                    try? FileManager.default.removeItem(at: backupURL)
                }
            } catch {
                if FileManager.default.fileExists(atPath: managedAppURL.path) {
                    try? FileManager.default.removeItem(at: managedAppURL)
                }
                if FileManager.default.fileExists(atPath: backupURL.path) {
                    try? FileManager.default.moveItem(at: backupURL, to: managedAppURL)
                }
                throw error
            }
        } catch {
            installationError = error
        }

        if mounted {
            try? runSystemCommand(
                executablePath: "/usr/bin/hdiutil",
                arguments: ["detach", mountPointURL.path, "-quiet"]
            )
        }
        try? FileManager.default.removeItem(at: tempDirectory)

        if let installationError {
            throw installationError
        }

        let installedVersion = installedVersion()
        return OllamaInstallResult(
            message: installedVersion == nil
                ? "Ollama was installed in ~/Applications."
                : "Ollama \(installedVersion!) was installed in ~/Applications.",
            installedVersion: installedVersion
        )
    }

    func startServer() throws -> Process {
        guard let executableURL = resolvedBinaryURL() else {
            throw OllamaServiceError.notInstalled
        }

        let process = Process()
        process.executableURL = executableURL
        process.arguments = ["serve"]
        process.standardOutput = Pipe()
        process.standardError = Pipe()
        try process.run()
        return process
    }

    func ensureServerRunning(currentProcess: Process?) async throws -> Process? {
        if await isServerReachable() {
            return currentProcess
        }

        if let currentProcess, currentProcess.isRunning {
            try await waitForServer(timeout: 15)
            return currentProcess
        }

        let process = try startServer()
        try await waitForServer(timeout: 15)
        return process
    }

    func pullModel(tag: String, logHandler: @escaping @MainActor (String) -> Void) async throws {
        guard let executableURL = resolvedBinaryURL() else {
            throw OllamaServiceError.notInstalled
        }

        let pipe = Pipe()
        let process = Process()
        process.executableURL = executableURL
        process.arguments = ["pull", tag]
        process.standardOutput = pipe
        process.standardError = pipe

        pipe.fileHandleForReading.readabilityHandler = { handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            let chunk = String(decoding: data, as: UTF8.self)
            Task { @MainActor in
                logHandler(chunk)
            }
        }

        try process.run()

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            process.terminationHandler = { process in
                pipe.fileHandleForReading.readabilityHandler = nil
                if process.terminationStatus == 0 {
                    continuation.resume()
                } else {
                    continuation.resume(throwing: OllamaServiceError.commandFailed("ollama pull \(tag)", process.terminationStatus))
                }
            }
        }
    }

    func removeModel(tag: String) throws {
        _ = try runCommand(arguments: ["rm", tag], captureOutput: true, timeout: 30)
    }

    private func waitForServer(timeout: TimeInterval) async throws {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if await isServerReachable() {
                return
            }
            try await Task.sleep(for: .seconds(1))
        }

        throw OllamaServiceError.serverDidNotStart
    }

    private func resolvedBinaryURL() -> URL? {
        for path in commonBinaryPaths where FileManager.default.isExecutableFile(atPath: path) {
            return URL(fileURLWithPath: path)
        }

        return nil
    }

    private func versionFromBinary(_ binaryURL: URL) throws -> String {
        let output = try runCommand(arguments: ["--version"], executableURL: binaryURL, captureOutput: true)
        let tokens = output.split(whereSeparator: \.isWhitespace).map(String.init)
        if let version = tokens.last(where: { $0.first?.isNumber == true || $0.hasPrefix("v") }) {
            return version
        }
        return output.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func downloadDiskImage(from remoteURL: URL, to destinationURL: URL) async throws {
        var request = URLRequest(url: remoteURL)
        request.setValue("PaperclipDesktop", forHTTPHeaderField: "User-Agent")
        let (temporaryURL, response) = try await URLSession.shared.download(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw OllamaServiceError.downloadFailed
        }

        if FileManager.default.fileExists(atPath: destinationURL.path) {
            try FileManager.default.removeItem(at: destinationURL)
        }
        try FileManager.default.moveItem(at: temporaryURL, to: destinationURL)
    }

    private func runSystemCommand(executablePath: String, arguments: [String]) throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: executablePath)
        process.arguments = arguments
        process.standardOutput = Pipe()
        process.standardError = Pipe()
        try process.run()
        process.waitUntilExit()

        guard process.terminationStatus == 0 else {
            throw OllamaServiceError.commandFailed("\(executablePath) \(arguments.joined(separator: " "))", process.terminationStatus)
        }
    }

    private func runCommand(arguments: [String], captureOutput: Bool, timeout: TimeInterval = 5) throws -> String {
        guard let executableURL = resolvedBinaryURL() else {
            throw OllamaServiceError.notInstalled
        }
        return try runCommand(arguments: arguments, executableURL: executableURL, captureOutput: captureOutput, timeout: timeout)
    }

    private func runCommand(
        arguments: [String],
        executableURL: URL,
        captureOutput: Bool,
        timeout: TimeInterval = 5
    ) throws -> String {
        let process = Process()
        process.executableURL = executableURL
        process.arguments = arguments

        let pipe = Pipe()
        process.standardOutput = pipe
        process.standardError = pipe
        try process.run()

        let semaphore = DispatchSemaphore(value: 0)
        process.terminationHandler = { _ in
            semaphore.signal()
        }

        if semaphore.wait(timeout: .now() + timeout) == .timedOut {
            process.terminationHandler = nil
            process.terminate()
            throw OllamaServiceError.commandTimedOut("ollama \(arguments.joined(separator: " "))")
        }

        guard process.terminationStatus == 0 else {
            throw OllamaServiceError.commandFailed("ollama \(arguments.joined(separator: " "))", process.terminationStatus)
        }

        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        return String(decoding: data, as: UTF8.self)
    }

    private struct OllamaRunningModelsResponse: Decodable {
        let models: [OllamaRunningModelPayload]
    }

    private struct OllamaInstalledModelsResponse: Decodable {
        let models: [OllamaInstalledModelPayload]
    }

    private struct OllamaInstalledModelPayload: Decodable {
        let name: String
        let model: String
        let modifiedAt: String?
        let size: Int64?
        let details: OllamaInstalledModelDetails?
    }

    private struct OllamaInstalledModelDetails: Decodable {
        let parameterSize: String?
        let quantizationLevel: String?
    }

    private struct OllamaRunningModelPayload: Decodable {
        let name: String
        let size: Int64?
        let sizeVram: Int64?
        let expiresAt: Date?
    }
}

private struct OllamaLatestReleaseResponse: Decodable {
    let tagName: String
    let htmlURL: URL?
    let publishedAt: Date?

    enum CodingKeys: String, CodingKey {
        case tagName = "tag_name"
        case htmlURL = "html_url"
        case publishedAt = "published_at"
    }
}

private struct OllamaGenerateRequest: Encodable {
    let model: String
    let prompt: String
    let stream: Bool
}

private struct OllamaGenerateResponse: Decodable {
    let response: String
}

enum OllamaServiceError: LocalizedError {
    case notInstalled
    case serverDidNotStart
    case commandFailed(String, Int32)
    case commandTimedOut(String)
    case releaseCheckFailed
    case downloadFailed
    case invalidInstaller
    case generateFailed(String)

    var errorDescription: String? {
        switch self {
        case .notInstalled:
            "Ollama is not installed. Install Ollama first to use local Gemma 4 models."
        case .serverDidNotStart:
            "Ollama started too slowly or did not expose its local API."
        case .commandFailed(let command, let exitCode):
            "\(command) failed with exit code \(exitCode)."
        case .commandTimedOut(let command):
            "\(command) did not respond in time."
        case .releaseCheckFailed:
            "Could not fetch the latest Ollama release."
        case .downloadFailed:
            "Could not download the Ollama installer."
        case .invalidInstaller:
            "The downloaded Ollama installer did not look valid."
        case .generateFailed(let body):
            "Ollama test generation failed: \(body)"
        }
    }
}
