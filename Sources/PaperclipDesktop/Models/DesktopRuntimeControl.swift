import Foundation

enum DesktopCapabilityHealthState: Equatable {
    case ready
    case working
    case warning
    case bad
    case neutral
}

struct DesktopCapabilityHealthSummary: Equatable {
    let title: String
    let detail: String
    let state: DesktopCapabilityHealthState
}

enum OllamaControlState: Equatable {
    case managed
    case external
    case offline
}

struct OllamaControlSummary: Equatable {
    let state: OllamaControlState
    let title: String
    let detail: String
    let policyDetail: String

    var canRestartManagedOllama: Bool {
        state == .managed
    }
}

enum DesktopWatchdogState: Equatable {
    case healthy
    case slowNoOutput
    case ollamaNotResponding
    case restartingManagedOllama
    case recovered
    case failedRecovery
    case unavailable
}

struct DesktopWatchdogStatusSummary: Equatable {
    let state: DesktopWatchdogState
    let title: String
    let detail: String
}

func buildOllamaControlSummary(
    isReachable: Bool,
    isManaged: Bool,
    loadedModelCount: Int
) -> OllamaControlSummary {
    let loadedDetail: String
    switch loadedModelCount {
    case 1:
        loadedDetail = "1 model loaded"
    case let count where count > 1:
        loadedDetail = "\(count) models loaded"
    default:
        loadedDetail = "no models loaded"
    }

    if isManaged {
        return OllamaControlSummary(
            state: .managed,
            title: "Managed",
            detail: isReachable
                ? "Paperclip Desktop owns this Ollama server. \(loadedDetail)."
                : "Paperclip Desktop owns this Ollama server, but it is not responding.",
            policyDetail: "Paperclip Desktop may restart this managed Ollama server when recovery is needed."
        )
    }

    if isReachable {
        return OllamaControlSummary(
            state: .external,
            title: "External",
            detail: "An external Ollama server is running. \(loadedDetail).",
            policyDetail: "Paperclip Desktop will read status, but it will not stop or restart an external Ollama server."
        )
    }

    return OllamaControlSummary(
        state: .offline,
        title: "Offline",
        detail: "Ollama is not responding right now.",
        policyDetail: "Paperclip Desktop can only restart Ollama after it has started a managed server."
    )
}

func buildWatchdogStatusSummary(
    localModelEnabled: Bool,
    activity: DesktopLocalModelActivitySummary?,
    latestEvent: WatchdogEvent?,
    isManagingOllamaProcess: Bool
) -> DesktopWatchdogStatusSummary {
    guard localModelEnabled else {
        return DesktopWatchdogStatusSummary(
            state: .unavailable,
            title: "Unavailable",
            detail: "Enable local AI to turn on the Ollama watchdog."
        )
    }

    if let latestEvent {
        switch latestEvent.action {
        case .restarting:
            return DesktopWatchdogStatusSummary(
                state: .restartingManagedOllama,
                title: "Restarting managed Ollama",
                detail: latestEvent.detail
            )
        case .recovered:
            return DesktopWatchdogStatusSummary(
                state: .recovered,
                title: "Recovered",
                detail: latestEvent.detail
            )
        case .failed:
            return DesktopWatchdogStatusSummary(
                state: .failedRecovery,
                title: "Failed recovery",
                detail: latestEvent.detail
            )
        case .skippedExternal:
            return DesktopWatchdogStatusSummary(
                state: .healthy,
                title: "Watching external Ollama",
                detail: latestEvent.detail
            )
        case .observed:
            break
        }
    }

    guard let activity else {
        return DesktopWatchdogStatusSummary(
            state: .healthy,
            title: "Healthy",
            detail: "No local Ollama issue has been observed in this app session."
        )
    }

    switch activity.state {
    case .notResponding:
        return DesktopWatchdogStatusSummary(
            state: .ollamaNotResponding,
            title: "Ollama not responding",
            detail: isManagingOllamaProcess
                ? "Managed Ollama is not responding. Paperclip Desktop can restart it."
                : "Ollama is not responding. Paperclip Desktop does not own the server, so it will only report status."
        )
    case .noOutput:
        return DesktopWatchdogStatusSummary(
            state: .slowNoOutput,
            title: "Slow / no output",
            detail: activity.detail
        )
    case .restarting:
        return DesktopWatchdogStatusSummary(
            state: .restartingManagedOllama,
            title: "Restarting managed Ollama",
            detail: activity.detail
        )
    case .unavailable:
        return DesktopWatchdogStatusSummary(
            state: .unavailable,
            title: "Unavailable",
            detail: activity.detail
        )
    case .idle:
        return DesktopWatchdogStatusSummary(
            state: .healthy,
            title: "Healthy",
            detail: "No local run is active. Watchdog is idle."
        )
    case .starting, .loadingModel, .waitingForOutput, .writing:
        return DesktopWatchdogStatusSummary(
            state: .healthy,
            title: "Healthy",
            detail: "Watching the active local run for slow output or an unresponsive Ollama server."
        )
    }
}
