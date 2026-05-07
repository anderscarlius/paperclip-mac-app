import Foundation

public enum IssuePriority: String, Codable, CaseIterable, Identifiable, Sendable {
    case low
    case medium
    case high

    public var id: String { rawValue }
}

public enum IssueStatus: String, Codable, CaseIterable, Identifiable, Sendable {
    case todo
    case inProgress = "in_progress"
    case blocked
    case done

    public var id: String { rawValue }
}

public struct IssueComment: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var author: String
    public var body: String
    public var createdAt: Date

    public init(
        id: String = UUID().uuidString,
        author: String,
        body: String,
        createdAt: Date = .now
    ) {
        self.id = id
        self.author = author
        self.body = body
        self.createdAt = createdAt
    }
}

public struct Issue: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var companyID: String
    public var title: String
    public var summary: String
    public var status: IssueStatus
    public var priority: IssuePriority
    public var assigneeName: String
    public var parentIssueID: String?
    public var comments: [IssueComment]

    public init(
        id: String,
        companyID: String,
        title: String,
        summary: String,
        status: IssueStatus,
        priority: IssuePriority,
        assigneeName: String,
        parentIssueID: String? = nil,
        comments: [IssueComment] = []
    ) {
        self.id = id
        self.companyID = companyID
        self.title = title
        self.summary = summary
        self.status = status
        self.priority = priority
        self.assigneeName = assigneeName
        self.parentIssueID = parentIssueID
        self.comments = comments
    }

    public static let previewIssues: [Issue] = [
        Issue(
            id: "NIM-42",
            companyID: "nimloth",
            title: "Implement FHIR parser",
            summary: "Parse Patient FHIR R4 bundles and map them to the internal schema.",
            status: .inProgress,
            priority: .high,
            assigneeName: "BackendDev",
            parentIssueID: "NIM-12",
            comments: [
                IssueComment(author: "BackendDev", body: "Parsing works for basic Patient resources."),
                IssueComment(author: "QA", body: "Need edge cases for contained resources.")
            ]
        ),
        Issue(
            id: "NIM-55",
            companyID: "nimloth",
            title: "Add unit tests for auth middleware",
            summary: "Cover token expiry and malformed header flows.",
            status: .todo,
            priority: .medium,
            assigneeName: "QA"
        )
    ]
}
