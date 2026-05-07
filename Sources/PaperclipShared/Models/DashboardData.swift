import Foundation

public struct ActivityEvent: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var message: String
    public var createdAt: Date

    public init(id: String = UUID().uuidString, message: String, createdAt: Date = .now) {
        self.id = id
        self.message = message
        self.createdAt = createdAt
    }

    public static let previewFeed: [ActivityEvent] = [
        ActivityEvent(message: "CEO checked out NIM-42"),
        ActivityEvent(message: "QA completed FRE-18"),
        ActivityEvent(message: "BackendDev started NIM-55")
    ]
}

public struct DashboardData: Codable, Hashable, Sendable {
    public var todaySpend: Double
    public var dailyBudget: Double
    public var companies: [Company]
    public var activity: [ActivityEvent]

    public init(
        todaySpend: Double,
        dailyBudget: Double,
        companies: [Company],
        activity: [ActivityEvent]
    ) {
        self.todaySpend = todaySpend
        self.dailyBudget = dailyBudget
        self.companies = companies
        self.activity = activity
    }

    public static let preview = DashboardData(
        todaySpend: 4.82,
        dailyBudget: 50,
        companies: Company.previewCompanies,
        activity: ActivityEvent.previewFeed
    )
}
