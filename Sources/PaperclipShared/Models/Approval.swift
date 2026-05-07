import Foundation

public enum ApprovalKind: String, Codable, CaseIterable, Identifiable, Sendable {
    case hire
    case strategy
    case budget

    public var id: String { rawValue }
}

public enum ApprovalStatus: String, Codable, CaseIterable, Identifiable, Sendable {
    case pending
    case approved
    case rejected

    public var id: String { rawValue }
}

public struct Approval: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var companyID: String
    public var title: String
    public var kind: ApprovalKind
    public var requestedBy: String
    public var modelSummary: String?
    public var status: ApprovalStatus

    public init(
        id: String = UUID().uuidString,
        companyID: String,
        title: String,
        kind: ApprovalKind,
        requestedBy: String,
        modelSummary: String? = nil,
        status: ApprovalStatus = .pending
    ) {
        self.id = id
        self.companyID = companyID
        self.title = title
        self.kind = kind
        self.requestedBy = requestedBy
        self.modelSummary = modelSummary
        self.status = status
    }

    public static let previewApprovals: [Approval] = [
        Approval(companyID: "nimloth", title: "Hire: Data Analyst", kind: .hire, requestedBy: "CEO", modelSummary: "Grok 4.1 Fast"),
        Approval(companyID: "nimloth", title: "Strategy: Q3 Plan", kind: .strategy, requestedBy: "CEO")
    ]
}
