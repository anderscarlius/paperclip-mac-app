import Foundation
import PaperclipShared

struct AppConfigStore {
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init() {
        encoder = JSONEncoder()
        decoder = JSONDecoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    func load() throws -> AppConfig {
        try DesktopPaths.ensureBaseDirectories()
        guard FileManager.default.fileExists(atPath: DesktopPaths.configURL.path) else {
            return .default
        }

        let data = try Data(contentsOf: DesktopPaths.configURL)
        return try decoder.decode(AppConfig.self, from: data)
    }

    func save(_ config: AppConfig) throws {
        try DesktopPaths.ensureBaseDirectories()
        let data = try encoder.encode(config)
        try data.write(to: DesktopPaths.configURL, options: .atomic)
    }
}
