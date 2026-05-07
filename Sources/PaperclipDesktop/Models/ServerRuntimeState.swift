import Foundation

enum ServerRuntimeState: Equatable {
    case stopped
    case starting
    case running(URL)
    case failed(String)

    var title: String {
        switch self {
        case .stopped: "Stopped"
        case .starting: "Starting"
        case .running: "Running"
        case .failed: "Error"
        }
    }

    var symbolName: String {
        switch self {
        case .stopped: "pause.circle"
        case .starting: "arrow.trianglehead.2.clockwise.rotate.90"
        case .running: "play.circle.fill"
        case .failed: "exclamationmark.triangle.fill"
        }
    }
}
