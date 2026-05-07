import Foundation

public enum HTTPMethod: String, Sendable {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case delete = "DELETE"
}

public struct EmptyResponse: Decodable, Sendable {
    public init() {}
}

public enum APIClientError: Error, LocalizedError, Sendable {
    case invalidResponse
    case requestFailed(statusCode: Int, body: String)

    public var errorDescription: String? {
        switch self {
        case .invalidResponse:
            "The server returned an invalid response."
        case .requestFailed(let statusCode, let body):
            "The server returned \(statusCode): \(body)"
        }
    }
}

public actor PaperclipAPIClient {
    public let connection: ServerConnection
    private let session: URLSession
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    public init(
        connection: ServerConnection,
        session: URLSession = .shared
    ) {
        self.connection = connection
        self.session = session
        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()
        self.encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        self.decoder.dateDecodingStrategy = .iso8601
        self.encoder.dateEncodingStrategy = .iso8601
    }

    public func getCompanies() async throws -> [Company] {
        try await request([Company].self, method: .get, path: "/api/companies")
    }

    public func getDashboard() async throws -> DashboardData {
        try await request(DashboardData.self, method: .get, path: "/api/dashboard")
    }

    public func getAgents(companyID: String) async throws -> [Agent] {
        try await request([Agent].self, method: .get, path: "/api/companies/\(companyID)/agents")
    }

    public func getIssues(companyID: String) async throws -> [Issue] {
        try await request([Issue].self, method: .get, path: "/api/companies/\(companyID)/issues")
    }

    public func getApprovals(companyID: String) async throws -> [Approval] {
        try await request([Approval].self, method: .get, path: "/api/companies/\(companyID)/approvals")
    }

    public func createIssue(companyID: String, issue: NewIssueRequest) async throws -> Issue {
        try await request(Issue.self, method: .post, path: "/api/companies/\(companyID)/issues", body: issue)
    }

    public func approve(id: String) async throws {
        _ = try await request(EmptyResponse.self, method: .post, path: "/api/approvals/\(id)/approve")
    }

    public func reject(id: String) async throws {
        _ = try await request(EmptyResponse.self, method: .post, path: "/api/approvals/\(id)/reject")
    }

    public func invokeAgent(id: String) async throws {
        _ = try await request(EmptyResponse.self, method: .post, path: "/api/agents/\(id)/invoke")
    }

    public func healthCheck() async throws {
        _ = try await request(EmptyResponse.self, method: .get, path: "/api/health")
    }

    public func request<T: Decodable>(
        _ responseType: T.Type,
        method: HTTPMethod,
        path: String,
        body: Encodable? = nil
    ) async throws -> T {
        var request = URLRequest(url: connection.baseURL.appending(path: path))
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if !connection.token.isEmpty {
            request.setValue("Bearer \(connection.token)", forHTTPHeaderField: "Authorization")
        }

        if let body {
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIClientError.invalidResponse
        }

        guard 200..<300 ~= httpResponse.statusCode else {
            let body = String(decoding: data, as: UTF8.self)
            throw APIClientError.requestFailed(statusCode: httpResponse.statusCode, body: body)
        }

        if T.self == EmptyResponse.self {
            return EmptyResponse() as! T
        }

        return try decoder.decode(T.self, from: data)
    }
}

public struct NewIssueRequest: Codable, Sendable {
    public var title: String
    public var description: String
    public var priority: IssuePriority
    public var assigneeName: String
    public var projectName: String

    public init(
        title: String,
        description: String,
        priority: IssuePriority,
        assigneeName: String,
        projectName: String = "Default"
    ) {
        self.title = title
        self.description = description
        self.priority = priority
        self.assigneeName = assigneeName
        self.projectName = projectName
    }
}
