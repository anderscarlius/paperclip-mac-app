import Foundation

struct DesktopSidebarSnapshot: Equatable {
    let activeRunCount: Int
    let queuedRunCount: Int
    let latestLocalRun: DesktopSidebarRunSummary?
    let localThroughput: DesktopSidebarThroughputSummary
    let cloudThroughput: DesktopSidebarThroughputSummary
    let ollamaStatus: OllamaServerStatus?
    let localModelActivity: DesktopLocalModelActivitySummary
}

struct DesktopSidebarRunSummary: Equatable {
    let runID: String
    let agentName: String
    let model: String?
    let provider: String?
    let status: String
    let startedAt: Date?
    let finishedAt: Date?
    let inputTokens: Int
    let outputTokens: Int
    let cachedInputTokens: Int

    var totalTokens: Int {
        inputTokens + outputTokens + cachedInputTokens
    }

    var durationSeconds: TimeInterval? {
        guard let startedAt else { return nil }
        return max(1, (finishedAt ?? .now).timeIntervalSince(startedAt))
    }

    var totalTokensPerSecond: Double? {
        guard let durationSeconds else { return nil }
        return Double(totalTokens) / durationSeconds
    }

    var outputTokensPerSecond: Double? {
        guard let durationSeconds else { return nil }
        return Double(outputTokens) / durationSeconds
    }
}

struct DesktopSidebarThroughputPoint: Equatable, Identifiable {
    let seconds: Int
    let tokensPerSecond: Double

    var id: Int { seconds }
}

struct DesktopSidebarThroughputSummary: Equatable {
    let label: String
    let windows: [DesktopSidebarThroughputPoint]

    var hasActivity: Bool {
        windows.contains { $0.tokensPerSecond > 0.05 }
    }
}

enum DesktopLocalModelActivityState: String, Equatable {
    case idle
    case starting
    case loadingModel
    case waitingForOutput
    case noOutput
    case writing
    case notResponding
    case restarting
    case unavailable
}

struct DesktopLocalModelActivitySummary: Equatable {
    let state: DesktopLocalModelActivityState
    let title: String
    let detail: String
    let runID: String?
    let secondsSinceRunStart: TimeInterval?
    let secondsToFirstOutput: TimeInterval?
    let secondsSinceLastOutput: TimeInterval?
    let liveTokens: Int
    let liveTokensPerSecond: Double?

    static let unavailable = DesktopLocalModelActivitySummary(
        state: .unavailable,
        title: "Local model",
        detail: "Local AI is not enabled",
        runID: nil,
        secondsSinceRunStart: nil,
        secondsToFirstOutput: nil,
        secondsSinceLastOutput: nil,
        liveTokens: 0,
        liveTokensPerSecond: nil
    )
}

enum WatchdogEventAction: String, Equatable {
    case observed
    case skippedExternal
    case restarting
    case recovered
    case failed
}

struct WatchdogEvent: Equatable, Identifiable {
    let id = UUID()
    let occurredAt: Date
    let action: WatchdogEventAction
    let reason: String
    let detail: String

    var summary: String {
        "\(action.displayName): \(reason)"
    }
}

extension WatchdogEventAction {
    var displayName: String {
        switch self {
        case .observed:
            "Observed"
        case .skippedExternal:
            "Skipped External Ollama"
        case .restarting:
            "Restarting Ollama"
        case .recovered:
            "Recovered"
        case .failed:
            "Recovery failed"
        }
    }
}

struct OllamaRunningModel: Equatable, Identifiable {
    let id: String
    let name: String
    let sizeBytes: Int64?
    let sizeVRAMBytes: Int64?
    let expiresAt: Date?
}

struct OllamaInstalledModel: Equatable, Identifiable {
    let id: String
    let name: String
    let model: String
    let modifiedAt: String?
    let sizeBytes: Int64?
    let parameterSize: String?
    let quantizationLevel: String?
}

struct OllamaServerStatus: Equatable {
    let isReachable: Bool
    let runningModels: [OllamaRunningModel]

    var loadedModelCount: Int {
        runningModels.count
    }

    var totalVRAMBytes: Int64? {
        let values = runningModels.compactMap(\.sizeVRAMBytes)
        guard !values.isEmpty else { return nil }
        return values.reduce(0, +)
    }
}
