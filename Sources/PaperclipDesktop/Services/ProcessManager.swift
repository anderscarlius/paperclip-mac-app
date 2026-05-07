import Foundation
import Observation
import PaperclipShared

@MainActor
@Observable
final class ProcessManager {
    var runtimeState: ServerRuntimeState = .stopped
    var logOutput = ""
    var lastExitStatus: Int32?

    private var process: Process?
    private var ollamaProcess: Process?
    private var ollamaIdleMonitorTask: Task<Void, Never>?
    private var ollamaBecameIdleAt: Date?
    private let healthCheckService = HealthCheckService()
    private let sourceInstaller = PaperclipSourceInstaller()
    private let upstreamService = PaperclipUpstreamService()
    private let toolchain = PaperclipToolchain()
    private let ollamaService = OllamaService()

    var isManagingProcess: Bool {
        process != nil
    }

    var isManagingOllamaProcess: Bool {
        ollamaProcess != nil
    }

    func syncRuntimeState(port: Int) async {
        let url = URL(string: "http://localhost:\(port)")!

        if await healthCheckService.isServerHealthy(port: port) {
            runtimeState = .running(url)
        } else if process == nil {
            runtimeState = .stopped
        }
    }

    func installBundledRuntime(config: AppConfig, keychainService: KeychainService) async throws {
        let shouldRestart = try await prepareForManagedRuntimeInstall(port: config.port)
        appendLog("[update] Installing bundled Paperclip runtime...\n")

        do {
            try DesktopPaths.ensureBaseDirectories()
            let installedSource = try sourceInstaller.synchronizeIfNeeded(force: true)
            try await finalizeRuntimeInstall(
                using: installedSource,
                config: config,
                keychainService: keychainService,
                shouldRestart: shouldRestart,
                forceDependencyRefresh: true
            )
        } catch {
            appendLog("[error] \(error.localizedDescription)\n")
            runtimeState = .failed(error.localizedDescription)
            throw error
        }
    }

    func installLatestUpstreamRuntime(
        release: PaperclipUpstreamRelease,
        config: AppConfig,
        keychainService: KeychainService
    ) async throws {
        let shouldRestart = try await prepareForManagedRuntimeInstall(port: config.port)
        appendLog("[update] Downloading Paperclip \(release.shortRevision) from GitHub...\n")

        do {
            let upstreamSource = try await upstreamService.downloadSource(for: release)
            let metadata = PaperclipSourceMetadata(
                origin: .upstreamGitHub,
                repositoryURL: release.repositoryURL,
                referenceName: release.defaultBranch,
                revision: release.revision,
                installedAt: Date()
            )
            let installedSource = try sourceInstaller.installSource(
                from: upstreamSource,
                sourceSignature: release.revision,
                metadata: metadata,
                force: true
            )
            try await finalizeRuntimeInstall(
                using: installedSource,
                config: config,
                keychainService: keychainService,
                shouldRestart: shouldRestart,
                forceDependencyRefresh: true
            )
        } catch {
            appendLog("[error] \(error.localizedDescription)\n")
            runtimeState = .failed(error.localizedDescription)
            throw error
        }
    }

    func prepareLocalModel(config: LocalModelConfig, allowDownload: Bool = true) async throws -> LocalModelPreparationResult {
        guard config.isEnabled else {
            return LocalModelPreparationResult(userMessage: "Local model support is not enabled.")
        }

        guard config.engine == .ollama else {
            throw ProcessManagerError.unsupportedLocalModelEngine
        }

        appendLog("[local] Preparing local model \(config.selectedModelID)...\n")

        let selectedModel = LocalModelCatalog.option(for: config.selectedModelID)
        if !ollamaService.isInstalled() {
            appendLog("[local] Ollama is missing. Installing the latest version automatically...\n")
            let latestRelease = try await ollamaService.fetchLatestRelease()
            _ = try await installOrUpdateOllama(release: latestRelease)
        }

        ollamaProcess = try await ollamaService.ensureServerRunning(currentProcess: ollamaProcess)
        startOllamaIdleMonitorIfNeeded(config: config)

        let installedTags = ollamaService.installedModelTags()
        if !installedTags.contains(selectedModel.ollamaTag) {
            guard allowDownload else {
                throw ProcessManagerError.localModelNotPrepared(selectedModel.displayName)
            }
            appendLog("[local] Downloading \(selectedModel.ollamaTag) via Ollama...\n")
            try await ollamaService.pullModel(tag: selectedModel.ollamaTag) { [weak self] chunk in
                self?.appendLog(chunk)
            }
        }

        return LocalModelPreparationResult(
            userMessage: "\(selectedModel.displayName) is ready locally through Ollama."
        )
    }

    func installOrUpdateOllama(release: OllamaRelease) async throws -> OllamaInstallResult {
        let shouldRestartManagedServer = ollamaProcess?.isRunning == true

        if shouldRestartManagedServer {
            appendLog("[local] Stopping the managed Ollama server before updating...\n")
            ollamaProcess?.terminate()
            ollamaProcess = nil
        }

        appendLog("[local] Installing Ollama \(release.shortTitle)...\n")
        let result = try await ollamaService.installOrUpdate(release: release) { [weak self] chunk in
            self?.appendLog(chunk)
        }

        if shouldRestartManagedServer {
            appendLog("[local] Restarting Ollama after the update...\n")
            ollamaProcess = try await ollamaService.ensureServerRunning(currentProcess: nil)
            startOllamaIdleMonitorIfNeeded(config: .init())
        }

        appendLog("[local] \(result.message)\n")
        return result
    }

    func start(config: AppConfig, keychainService: KeychainService) async {
        if process != nil {
            await syncRuntimeState(port: config.port)
            return
        }

        let serverURL = URL(string: "http://localhost:\(config.port)")!
        if await healthCheckService.isServerHealthy(port: config.port) {
            runtimeState = .running(serverURL)
            return
        }

        runtimeState = .starting
        logOutput = ""

        do {
            if config.localModel.isEnabled && config.localModel.useAsPrimaryModel {
                _ = try await prepareLocalModel(
                    config: config.localModel,
                    allowDownload: config.localModel.autoDownload
                )
            }

            try DesktopPaths.ensureBaseDirectories()
            let installedSource = try sourceInstaller.synchronizeIfNeeded()
            try DesktopPaths.ensurePaperclipRuntimeDirectories()
            try EnvFileWriter(config: config, keychainService: keychainService)
                .writePaperclipEnvFile(to: DesktopPaths.paperclipRuntimeEnvURL())

            try await ensureDependenciesInstalled(for: installedSource)
            try await ensureWorkspaceBuildArtifacts(for: installedSource)
            try await ensureOnboarded(sourceDirectory: installedSource.sourceDirectory)

            let serverCommand = toolchain.pnpmCommand(
                arguments: [
                    "paperclipai",
                    "run",
                    "--data-dir",
                    DesktopPaths.paperclipHomeDirectory.path
                ],
                currentDirectoryURL: installedSource.sourceDirectory
            )

            let pipe = Pipe()
            let process = Process()
            process.executableURL = serverCommand.executableURL
            process.arguments = serverCommand.arguments
            process.environment = serverCommand.environment
            process.currentDirectoryURL = serverCommand.currentDirectoryURL
            process.standardOutput = pipe
            process.standardError = pipe

            pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
                let data = handle.availableData
                guard !data.isEmpty else { return }
                let chunk = String(decoding: data, as: UTF8.self)
                Task { @MainActor in
                    self?.appendLog(chunk)
                }
            }

            process.terminationHandler = { [weak self] process in
                Task { @MainActor in
                    self?.lastExitStatus = process.terminationStatus
                    self?.runtimeState = .failed("Paperclip stopped unexpectedly with exit code \(process.terminationStatus).")
                    self?.process = nil
                }
            }

            try process.run()
            self.process = process
            try await healthCheckService.waitForServer(port: config.port, timeout: 20)
            runtimeState = .running(serverURL)
        } catch {
            appendLog("[error] \(error.localizedDescription)\n")
            runtimeState = .failed(error.localizedDescription)
            process = nil
        }
    }

    func stop() {
        guard let process else {
            return
        }

        process.terminationHandler = nil
        process.terminate()
        self.process = nil
        runtimeState = .stopped
    }

    func restart(config: AppConfig, keychainService: KeychainService) async {
        stop()
        await start(config: config, keychainService: keychainService)
    }

    func recoverManagedOllama(
        config: LocalModelConfig,
        reason: String,
        allowStartWhenStopped: Bool = false
    ) async -> ManagedOllamaRecoveryOutcome {
        guard config.isEnabled, config.engine == .ollama else {
            return .skipped("Local Ollama support is not enabled.")
        }

        let status = await ollamaService.serverStatus()

        guard let ollamaProcess, ollamaProcess.isRunning else {
            if allowStartWhenStopped && status == nil {
                appendLog("[local] \(reason). Starting a managed Ollama server...\n")
                do {
                    self.ollamaProcess = try await ollamaService.ensureServerRunning(currentProcess: nil)
                    startOllamaIdleMonitorIfNeeded(config: config)
                    appendLog("[local] Managed Ollama started successfully.\n")
                    return .recovered("Managed Ollama started successfully.")
                } catch {
                    appendLog("[local] Failed to start managed Ollama: \(error.localizedDescription)\n")
                    return .failed("Failed to start managed Ollama: \(error.localizedDescription)")
                }
            }

            if status != nil {
                appendLog("[local] \(reason). Ollama is reachable, but this process is not managed by Paperclip Desktop; leaving it running.\n")
                return .skipped("Ollama is reachable, but it is not managed by Paperclip Desktop.")
            }

            appendLog("[local] \(reason). Ollama is not reachable, and Paperclip Desktop does not own a managed Ollama process to restart.\n")
            return .skipped("Ollama is not reachable, and Paperclip Desktop does not own a managed Ollama process to restart.")
        }

        appendLog("[local] \(reason). Restarting the managed Ollama server...\n")
        ollamaIdleMonitorTask?.cancel()
        ollamaBecameIdleAt = nil
        ollamaProcess.terminationHandler = nil
        ollamaProcess.terminate()
        self.ollamaProcess = nil

        do {
            try await Task.sleep(for: .seconds(1))
            self.ollamaProcess = try await ollamaService.ensureServerRunning(currentProcess: nil)
            startOllamaIdleMonitorIfNeeded(config: config)
            appendLog("[local] Managed Ollama restarted successfully.\n")
            return .recovered("Managed Ollama restarted successfully.")
        } catch {
            appendLog("[local] Failed to restart managed Ollama: \(error.localizedDescription)\n")
            return .failed("Failed to restart managed Ollama: \(error.localizedDescription)")
        }
    }

    func appendWatchdogLog(_ event: WatchdogEvent) {
        appendLog("[watchdog] \(event.action.displayName): \(event.reason). \(event.detail)\n")
    }

    private func appendLog(_ chunk: String) {
        logOutput += chunk
        if logOutput.count > 24_000 {
            logOutput = String(logOutput.suffix(24_000))
        }
    }

    private func prepareForManagedRuntimeInstall(port: Int) async throws -> Bool {
        if await healthCheckService.isServerHealthy(port: port), process == nil {
            throw ProcessManagerError.externalServerRunning(port)
        }

        let shouldRestart = process != nil
        if shouldRestart {
            stop()
        }

        runtimeState = .starting
        return shouldRestart
    }

    private func finalizeRuntimeInstall(
        using installedSource: InstalledPaperclipSource,
        config: AppConfig,
        keychainService: KeychainService,
        shouldRestart: Bool,
        forceDependencyRefresh: Bool
    ) async throws {
        try DesktopPaths.ensurePaperclipRuntimeDirectories()
        try EnvFileWriter(config: config, keychainService: keychainService)
            .writePaperclipEnvFile(to: DesktopPaths.paperclipRuntimeEnvURL())

        try await ensureDependenciesInstalled(for: installedSource, force: forceDependencyRefresh)
        try await ensureWorkspaceBuildArtifacts(for: installedSource, force: forceDependencyRefresh)
        try await ensureOnboarded(sourceDirectory: installedSource.sourceDirectory)

        runtimeState = .stopped

        if shouldRestart {
            await start(config: config, keychainService: keychainService)
        } else {
            await syncRuntimeState(port: config.port)
        }
    }

    private func ensureDependenciesInstalled(for installedSource: InstalledPaperclipSource, force: Bool = false) async throws {
        let currentReceipt = try? String(contentsOf: DesktopPaths.paperclipInstallReceiptURL, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let nodeModulesPath = installedSource.sourceDirectory
            .appending(path: "node_modules", directoryHint: .isDirectory)
            .path

        guard force ||
                currentReceipt != installedSource.sourceSignature ||
                !FileManager.default.fileExists(atPath: nodeModulesPath) else {
            return
        }

        appendLog("[setup] Installing vendored Paperclip dependencies...\n")
        try await runOneOffCommand(
            toolchain.pnpmCommand(
                arguments: ["install", "--frozen-lockfile"],
                currentDirectoryURL: installedSource.sourceDirectory
            ),
            label: "pnpm install"
        )
        try installedSource.sourceSignature.write(to: DesktopPaths.paperclipInstallReceiptURL, atomically: true, encoding: .utf8)
    }

    private func ensureWorkspaceBuildArtifacts(for installedSource: InstalledPaperclipSource, force: Bool = false) async throws {
        let currentReceipt = try? String(contentsOf: DesktopPaths.paperclipBuildReceiptURL, encoding: .utf8)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let pluginSDKDistPath = installedSource.sourceDirectory
            .appending(path: "packages/plugins/sdk/dist/index.js", directoryHint: .notDirectory)
            .path

        guard force ||
                currentReceipt != installedSource.sourceSignature ||
                !FileManager.default.fileExists(atPath: pluginSDKDistPath) else {
            return
        }

        appendLog("[setup] Building required Paperclip workspace artifacts...\n")
        try await runOneOffCommand(
            toolchain.pnpmCommand(
                arguments: ["--filter", "@paperclipai/plugin-sdk", "build"],
                currentDirectoryURL: installedSource.sourceDirectory
            ),
            label: "pnpm --filter @paperclipai/plugin-sdk build"
        )
        try installedSource.sourceSignature.write(to: DesktopPaths.paperclipBuildReceiptURL, atomically: true, encoding: .utf8)
    }

    private func ensureOnboarded(sourceDirectory: URL) async throws {
        guard !FileManager.default.fileExists(atPath: DesktopPaths.paperclipRuntimeConfigURL().path) else {
            return
        }

        appendLog("[setup] Running paperclipai onboard --yes...\n")
        try await runOneOffCommand(
            toolchain.pnpmCommand(
                arguments: [
                    "paperclipai",
                    "onboard",
                    "--yes",
                    "--data-dir",
                    DesktopPaths.paperclipHomeDirectory.path
                ],
                currentDirectoryURL: sourceDirectory
            ),
            label: "paperclipai onboard"
        )
    }

    private func runOneOffCommand(_ command: ResolvedProcessCommand, label: String) async throws {
        let pipe = Pipe()
        let process = Process()
        process.executableURL = command.executableURL
        process.arguments = command.arguments
        process.environment = command.environment
        process.currentDirectoryURL = command.currentDirectoryURL
        process.standardOutput = pipe
        process.standardError = pipe

        pipe.fileHandleForReading.readabilityHandler = { [weak self] handle in
            let data = handle.availableData
            guard !data.isEmpty else { return }
            let chunk = String(decoding: data, as: UTF8.self)
            Task { @MainActor in
                self?.appendLog(chunk)
            }
        }

        try process.run()

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            process.terminationHandler = { process in
                pipe.fileHandleForReading.readabilityHandler = nil
                if process.terminationStatus == 0 {
                    continuation.resume()
                } else {
                    continuation.resume(throwing: ProcessManagerError.commandFailed(label, process.terminationStatus))
                }
            }
        }
    }

    private func startOllamaIdleMonitorIfNeeded(config: LocalModelConfig) {
        ollamaIdleMonitorTask?.cancel()
        ollamaBecameIdleAt = nil

        guard config.autoStopOllamaWhenIdle, ollamaProcess != nil else {
            return
        }

        ollamaIdleMonitorTask = Task { @MainActor [weak self] in
            guard let self else { return }

            while !Task.isCancelled {
                guard let ollamaProcess = self.ollamaProcess, ollamaProcess.isRunning else {
                    self.ollamaBecameIdleAt = nil
                    return
                }

                let status = await self.ollamaService.serverStatus()

                if status?.runningModels.isEmpty == false {
                    self.ollamaBecameIdleAt = nil
                } else {
                    if self.ollamaBecameIdleAt == nil {
                        self.ollamaBecameIdleAt = .now
                    } else if let idleSince = self.ollamaBecameIdleAt,
                              Date().timeIntervalSince(idleSince) >= Double(config.ollamaIdleShutdownMinutes * 60) {
                        self.appendLog("[local] Ollama was idle for \(config.ollamaIdleShutdownMinutes) minutes with no loaded models, so Paperclip Desktop stopped the managed Ollama server.\n")
                        ollamaProcess.terminationHandler = nil
                        ollamaProcess.terminate()
                        self.ollamaProcess = nil
                        self.ollamaBecameIdleAt = nil
                        return
                    }
                }

                try? await Task.sleep(for: .seconds(30))
            }
        }
    }
}

enum ManagedOllamaRecoveryOutcome: Equatable {
    case skipped(String)
    case recovered(String)
    case failed(String)
}

enum ProcessManagerError: LocalizedError {
    case commandFailed(String, Int32)
    case externalServerRunning(Int)
    case unsupportedLocalModelEngine
    case localModelNotPrepared(String)

    var errorDescription: String? {
        switch self {
        case .commandFailed(let label, let exitCode):
            "\(label) failed with exit code \(exitCode)."
        case .externalServerRunning(let port):
            "A Paperclip server is already running on port \(port), but it is not managed by Paperclip Desktop. Stop that server before installing a runtime update."
        case .unsupportedLocalModelEngine:
            "The selected local model engine is not supported yet."
        case .localModelNotPrepared(let modelName):
            "\(modelName) has not been downloaded yet. Download it from Model Settings, or enable automatic downloads."
        }
    }
}
