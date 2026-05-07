import Foundation

struct HealthCheckService {
    func isServerHealthy(port: Int) async -> Bool {
        let url = URL(string: "http://localhost:\(port)/api/health")!

        guard let (_, response) = try? await URLSession.shared.data(from: url),
              let httpResponse = response as? HTTPURLResponse else {
            return false
        }

        return 200..<300 ~= httpResponse.statusCode
    }

    func waitForServer(port: Int, timeout: TimeInterval = 30) async throws {
        let deadline = Date().addingTimeInterval(timeout)

        while Date() < deadline {
            if await isServerHealthy(port: port) {
                return
            }

            try await Task.sleep(for: .seconds(1))
        }

        throw HealthCheckError.startupTimeout
    }
}

enum HealthCheckError: LocalizedError {
    case startupTimeout

    var errorDescription: String? {
        switch self {
        case .startupTimeout:
            "Timed out waiting for the Paperclip server to become healthy."
        }
    }
}
