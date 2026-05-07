import Foundation

public struct ServerConnection: Codable, Hashable, Sendable {
    public var baseURL: URL
    public var token: String

    public init(baseURL: URL = URL(string: "http://localhost:3100")!, token: String = "") {
        self.baseURL = baseURL
        self.token = token
    }
}
