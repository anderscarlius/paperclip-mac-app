import Foundation

public enum AgentRuntimeStatus: String, Codable, CaseIterable, Identifiable, Sendable {
    case active
    case running
    case paused
    case error

    public var id: String { rawValue }
}

public struct Agent: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var companyID: String?
    public var name: String
    public var role: RoleKind
    public var modelID: String
    public var status: AgentRuntimeStatus
    public var reportsToAgentID: String?
    public var monthlyBudget: Double
    public var heartbeatIntervalSec: Int
    public var spendToday: Double
    public var lastRunSummary: String

    public init(
        id: String = UUID().uuidString,
        companyID: String? = nil,
        name: String,
        role: RoleKind,
        modelID: String,
        status: AgentRuntimeStatus = .active,
        reportsToAgentID: String? = nil,
        monthlyBudget: Double = 50,
        heartbeatIntervalSec: Int = 3600,
        spendToday: Double = 0,
        lastRunSummary: String = "No runs yet"
    ) {
        self.id = id
        self.companyID = companyID
        self.name = name
        self.role = role
        self.modelID = modelID
        self.status = status
        self.reportsToAgentID = reportsToAgentID
        self.monthlyBudget = monthlyBudget
        self.heartbeatIntervalSec = heartbeatIntervalSec
        self.spendToday = spendToday
        self.lastRunSummary = lastRunSummary
    }

    public static let previewAgents: [Agent] = [
        Agent(name: "CEO", role: .ceo, modelID: "grok-4.1-fast", spendToday: 0.42, lastRunSummary: "Delegated two roadmap tasks"),
        Agent(name: "CTO", role: .cto, modelID: "grok-4.1-fast", spendToday: 0.89, lastRunSummary: "Reviewed architecture handoff"),
        Agent(name: "BackendDev", role: .engineer, modelID: "grok-4.1-fast", status: .running, monthlyBudget: 80, heartbeatIntervalSec: 1800, spendToday: 1.23, lastRunSummary: "Implementing FHIR parser")
    ]
}

public struct Company: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var goal: String
    public var templateID: String
    public var spendToday: Double
    public var activeAgents: Int
    public var tasksInProgress: Int
    public var agents: [Agent]
    public var createdAt: Date

    public init(
        id: String = UUID().uuidString,
        name: String,
        goal: String,
        templateID: String,
        spendToday: Double = 0,
        activeAgents: Int = 0,
        tasksInProgress: Int = 0,
        agents: [Agent] = [],
        createdAt: Date = .now
    ) {
        self.id = id
        self.name = name
        self.goal = goal
        self.templateID = templateID
        self.spendToday = spendToday
        self.activeAgents = activeAgents
        self.tasksInProgress = tasksInProgress
        self.agents = agents
        self.createdAt = createdAt
    }

    public static let previewCompanies: [Company] = [
        Company(
            id: "nimloth",
            name: "Nimloth",
            goal: "Build FHIR-compliant health API",
            templateID: "software-company",
            spendToday: 3.21,
            activeAgents: 3,
            tasksInProgress: 12,
            agents: Agent.previewAgents
        ),
        Company(
            id: "freya-all",
            name: "Freya-all",
            goal: "Scale content and product operations",
            templateID: "marketing-agency",
            spendToday: 1.61,
            activeAgents: 1,
            tasksInProgress: 5,
            agents: Agent.previewAgents
        )
    ]
}
