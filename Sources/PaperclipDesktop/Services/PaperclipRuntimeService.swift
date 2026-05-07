import Foundation
import PaperclipShared

actor PaperclipRuntimeService {
    struct RuntimeCompanySummary: Decodable, Sendable {
        let id: String
        let name: String
    }

    struct RuntimeAgentSummary: Decodable, Sendable {
        let id: String
        let companyId: String
        let name: String
        let role: String
        let status: String
        let adapterType: String
        let adapterConfig: [String: RuntimeJSONValue]
    }

    struct AdapterEnvironmentCheck: Decodable, Sendable {
        let code: String
        let level: String
        let message: String
        let detail: String?
        let hint: String?
    }

    struct AdapterEnvironmentTestResult: Decodable, Sendable {
        let adapterType: String
        let status: String
        let checks: [AdapterEnvironmentCheck]
    }

    struct UpdateAgentRequest: Encodable {
        let adapterType: String
        let adapterConfig: [String: RuntimeJSONValue]
    }

    struct TestAdapterRequest: Encodable {
        let adapterConfig: [String: RuntimeJSONValue]
    }

    struct CreateAgentRequest: Encodable {
        let name: String
        let role: String
        let title: String?
        let capabilities: String?
        let reportsTo: String?
        let adapterType: String
        let adapterConfig: [String: RuntimeJSONValue]
        let runtimeConfig: [String: RuntimeJSONValue]
        let budgetMonthlyCents: Int
    }

    struct CreateIssueRequest: Encodable {
        let title: String
        let description: String?
        let status: String
        let priority: String
        let mode: String
        let assigneeAgentId: String?
    }

    private struct EmptyRequest: Encodable {}

    struct RuntimeLiveRunSummary: Decodable, Sendable {
        let id: String
        let status: String
        let invocationSource: String
        let triggerDetail: String?
        let startedAt: Date?
        let finishedAt: Date?
        let createdAt: Date
        let agentId: String
        let agentName: String
        let adapterType: String
    }

    struct RuntimeHeartbeatRunSummary: Decodable, Sendable {
        let id: String
        let companyId: String
        let agentId: String
        let agentName: String?
        let adapterType: String?
        let status: String
        let startedAt: Date?
        let finishedAt: Date?
        let createdAt: Date
        let usageJson: RuntimeJSONValue?
    }

    struct RuntimeIssueSummary: Decodable, Sendable {
        let id: String
        let companyId: String
        let title: String
        let description: String?
        let status: String
        let priority: String
        let assigneeAgentId: String?
    }

    struct RuntimeHeartbeatInvocationResult: Decodable, Sendable {
        let id: String?
        let status: String
        let companyId: String?
        let agentId: String?
        let startedAt: Date?
        let finishedAt: Date?
        let createdAt: Date?
    }

    struct RuntimeHeartbeatRunLog: Decodable, Sendable {
        let runId: String
        let store: String?
        let logRef: String?
        let content: String
    }

    struct RuntimeThroughputPoint: Decodable, Sendable {
        let seconds: Int
        let tokensPerSecond: Double
    }

    struct RuntimeThroughputSummary: Decodable, Sendable {
        let windows: [RuntimeThroughputPoint]
    }

    struct RuntimeRunDiagnosticPhase: Decodable, Sendable {
        let phase: String
        let firstAt: Date
        let lastAt: Date
        let count: Int
    }

    struct RuntimeRunDiagnosticToolCall: Decodable, Sendable, Identifiable {
        let name: String
        let status: String
        let query: String?
        let resultCount: Int?
        let firstAt: Date
        let lastAt: Date
        let count: Int
        let detail: String?

        var id: String {
            "\(name)-\(status)-\(firstAt.timeIntervalSince1970)"
        }
    }

    struct RuntimeRunDiagnostic: Decodable, Sendable {
        let runId: String
        let status: String
        let agentName: String?
        let adapterType: String?
        let model: String?
        let provider: String?
        let startedAt: Date?
        let finishedAt: Date?
        let inputTokens: Int?
        let outputTokens: Int?
        let cachedInputTokens: Int?
        let estimatedLiveTokens: Int
        let firstCodexEventAt: Date?
        let firstModelOutputAt: Date?
        let lastModelOutputAt: Date?
        let secondsToFirstCodexEvent: Double?
        let secondsToFirstModelOutput: Double?
        let secondsSinceLastModelOutput: Double?
        let phases: [RuntimeRunDiagnosticPhase]
        let toolCalls: [RuntimeRunDiagnosticToolCall]?
        let sessionReused: Bool?
        let error: String?
    }

    struct RuntimeHeartbeatTelemetry: Decodable, Sendable {
        let checkedAt: Date
        let local: RuntimeThroughputSummary
        let cloud: RuntimeThroughputSummary
        let diagnostics: [RuntimeRunDiagnostic]
    }

    struct RuntimePluginSummary: Decodable, Sendable {
        let id: String
        let pluginKey: String
        let status: String
        let version: String
    }

    struct RuntimePluginHealthCheck: Decodable, Sendable {
        let name: String
        let passed: Bool
        let message: String?
    }

    struct RuntimePluginHealth: Decodable, Sendable {
        let pluginId: String
        let status: String
        let healthy: Bool
        let checks: [RuntimePluginHealthCheck]
        let lastError: String?
    }

    struct RuntimePluginWorkerDashboard: Decodable, Sendable {
        let status: String
        let pid: Int?
        let uptime: Int?
        let consecutiveCrashes: Int
        let totalCrashes: Int
        let pendingRequests: Int
        let lastCrashAt: Int?
        let nextRestartAt: Int?
    }

    struct RuntimePluginDashboard: Decodable, Sendable {
        let pluginId: String
        let worker: RuntimePluginWorkerDashboard?
        let health: RuntimePluginHealth
        let checkedAt: Date
    }

    struct PluginToolRunContext: Encodable {
        let agentId: String
        let runId: String
        let companyId: String
        let projectId: String
    }

    struct RuntimePluginToolExecutionResult: Decodable, Sendable {
        let tool: String?
        let pluginId: String?
        let result: RuntimeJSONValue?
        let error: String?
    }

    struct PluginToolExecuteRequest: Encodable {
        let tool: String
        let parameters: RuntimeJSONValue
        let runContext: PluginToolRunContext
    }

    private let baseURL: URL
    private let session: URLSession
    private let encoder = JSONEncoder()
    private let decoder: JSONDecoder

    init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        self.decoder = decoder
    }

    func listCompanies() async throws -> [RuntimeCompanySummary] {
        try await request([RuntimeCompanySummary].self, method: .get, path: "/api/companies")
    }

    func listAgents(companyID: String) async throws -> [RuntimeAgentSummary] {
        try await request([RuntimeAgentSummary].self, method: .get, path: "/api/companies/\(companyID)/agents")
    }

    func testAdapter(
        companyID: String,
        adapterType: String,
        adapterConfig: [String: RuntimeJSONValue]
    ) async throws -> AdapterEnvironmentTestResult {
        try await request(
            AdapterEnvironmentTestResult.self,
            method: .post,
            path: "/api/companies/\(companyID)/adapters/\(adapterType)/test-environment",
            body: TestAdapterRequest(adapterConfig: adapterConfig)
        )
    }

    func updateAgent(
        id: String,
        adapterType: String,
        adapterConfig: [String: RuntimeJSONValue]
    ) async throws -> RuntimeAgentSummary {
        try await request(
            RuntimeAgentSummary.self,
            method: .patch,
            path: "/api/agents/\(id)",
            body: UpdateAgentRequest(adapterType: adapterType, adapterConfig: adapterConfig)
        )
    }

    func createAgent(
        companyID: String,
        name: String,
        role: String,
        title: String?,
        capabilities: String?,
        reportsTo: String?,
        adapterType: String,
        adapterConfig: [String: RuntimeJSONValue],
        runtimeConfig: [String: RuntimeJSONValue] = [:],
        budgetMonthlyCents: Int = 0
    ) async throws -> RuntimeAgentSummary {
        try await request(
            RuntimeAgentSummary.self,
            method: .post,
            path: "/api/companies/\(companyID)/agents",
            body: CreateAgentRequest(
                name: name,
                role: role,
                title: title,
                capabilities: capabilities,
                reportsTo: reportsTo,
                adapterType: adapterType,
                adapterConfig: adapterConfig,
                runtimeConfig: runtimeConfig,
                budgetMonthlyCents: budgetMonthlyCents
            )
        )
    }

    func resetAgentRuntimeSession(id: String) async throws {
        let _: RuntimeJSONValue = try await request(
            RuntimeJSONValue.self,
            method: .post,
            path: "/api/agents/\(id)/runtime-state/reset-session",
            body: EmptyRequest()
        )
    }

    func createIssue(
        companyID: String,
        title: String,
        description: String?,
        status: String = "in_progress",
        priority: String = "medium",
        mode: String = "fast",
        assigneeAgentID: String?
    ) async throws -> RuntimeIssueSummary {
        try await request(
            RuntimeIssueSummary.self,
            method: .post,
            path: "/api/companies/\(companyID)/issues",
            body: CreateIssueRequest(
                title: title,
                description: description,
                status: status,
                priority: priority,
                mode: mode,
                assigneeAgentId: assigneeAgentID
            )
        )
    }

    func invokeHeartbeat(agentID: String) async throws -> RuntimeHeartbeatInvocationResult {
        try await request(
            RuntimeHeartbeatInvocationResult.self,
            method: .post,
            path: "/api/agents/\(agentID)/heartbeat/invoke",
            body: EmptyRequest()
        )
    }

    func listLiveRuns(companyID: String, minCount: Int = 4) async throws -> [RuntimeLiveRunSummary] {
        try await request(
            [RuntimeLiveRunSummary].self,
            method: .get,
            path: "/api/companies/\(companyID)/live-runs?minCount=\(minCount)"
        )
    }

    func listHeartbeatRuns(companyID: String, limit: Int = 10) async throws -> [RuntimeHeartbeatRunSummary] {
        try await request(
            [RuntimeHeartbeatRunSummary].self,
            method: .get,
            path: "/api/companies/\(companyID)/heartbeat-runs?limit=\(limit)"
        )
    }

    func heartbeatRunLog(runID: String, limitBytes: Int = 120_000) async throws -> RuntimeHeartbeatRunLog {
        try await request(
            RuntimeHeartbeatRunLog.self,
            method: .get,
            path: "/api/heartbeat-runs/\(runID)/log?offset=0&limitBytes=\(limitBytes)"
        )
    }

    func heartbeatTelemetry(companyID: String, limit: Int = 100) async throws -> RuntimeHeartbeatTelemetry {
        try await request(
            RuntimeHeartbeatTelemetry.self,
            method: .get,
            path: "/api/companies/\(companyID)/heartbeat-telemetry?limit=\(limit)"
        )
    }

    func listPlugins() async throws -> [RuntimePluginSummary] {
        try await request([RuntimePluginSummary].self, method: .get, path: "/api/plugins")
    }

    func pluginDashboard(pluginID: String) async throws -> RuntimePluginDashboard {
        try await request(
            RuntimePluginDashboard.self,
            method: .get,
            path: "/api/plugins/\(pluginID)/dashboard"
        )
    }

    func executePluginTool(
        tool: String,
        parameters: RuntimeJSONValue,
        runContext: PluginToolRunContext
    ) async throws -> RuntimePluginToolExecutionResult {
        try await request(
            RuntimePluginToolExecutionResult.self,
            method: .post,
            path: "/api/plugins/tools/execute",
            body: PluginToolExecuteRequest(tool: tool, parameters: parameters, runContext: runContext)
        )
    }

    private func request<T: Decodable>(
        _ responseType: T.Type,
        method: HTTPMethod,
        path: String,
        body: Encodable? = nil
    ) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

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

        return try decoder.decode(T.self, from: data)
    }
}
