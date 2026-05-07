import Foundation
import Observation
import PaperclipShared

@MainActor
@Observable
public final class MobileAppModel {
    public var connectionURLString = "http://localhost:3100"
    public var token = ""
    public var isConnected = false
    public var isOffline = false
    public var statusMessage: String?
    public var dashboard = DashboardData.preview
    public var issues = Issue.previewIssues
    public var approvals = Approval.previewApprovals
    public var agents = Agent.previewAgents
    public var selectedCompanyID: String? = Company.previewCompanies.first?.id

    public init() {}

    public var companies: [Company] {
        dashboard.companies
    }

    public var selectedCompany: Company? {
        companies.first(where: { $0.id == selectedCompanyID }) ?? companies.first
    }

    public func connect() async {
        guard let url = URL(string: connectionURLString) else {
            statusMessage = "Enter a valid server URL."
            return
        }

        let connection = ServerConnection(baseURL: url, token: token)
        let client = PaperclipAPIClient(connection: connection)

        do {
            try await client.healthCheck()
            dashboard = try await client.getDashboard()
            issues = try await client.getIssues(companyID: selectedCompanyID ?? dashboard.companies.first?.id ?? "")
            approvals = try await client.getApprovals(companyID: selectedCompanyID ?? dashboard.companies.first?.id ?? "")
            agents = try await client.getAgents(companyID: selectedCompanyID ?? dashboard.companies.first?.id ?? "")
            isConnected = true
            isOffline = false
            statusMessage = nil
        } catch {
            isConnected = true
            isOffline = true
            loadPreviewData()
            statusMessage = "Server unreachable right now. Showing last-known scaffold data."
        }
    }

    public func createIssue(_ request: NewIssueRequest) {
        let companyID = selectedCompanyID ?? companies.first?.id ?? "local"
        let newIssue = Issue(
            id: "NEW-\(Int.random(in: 100...999))",
            companyID: companyID,
            title: request.title,
            summary: request.description,
            status: .todo,
            priority: request.priority,
            assigneeName: request.assigneeName
        )
        issues.insert(newIssue, at: 0)
    }

    public func approve(_ approval: Approval) {
        updateApproval(approval, status: .approved)
    }

    public func reject(_ approval: Approval) {
        updateApproval(approval, status: .rejected)
    }

    public func invoke(_ agent: Agent) {
        guard let index = agents.firstIndex(where: { $0.id == agent.id }) else { return }
        agents[index].status = .running
        agents[index].lastRunSummary = "Manual heartbeat triggered from mobile."
    }

    public func togglePaused(_ agent: Agent) {
        guard let index = agents.firstIndex(where: { $0.id == agent.id }) else { return }
        agents[index].status = agents[index].status == .paused ? .active : .paused
    }

    public func filteredIssues(for status: IssueStatus) -> [Issue] {
        issues.filter { issue in
            issue.companyID == (selectedCompanyID ?? issue.companyID) && issue.status == status
        }
    }

    private func loadPreviewData() {
        dashboard = .preview
        issues = Issue.previewIssues
        approvals = Approval.previewApprovals
        agents = Agent.previewAgents
        selectedCompanyID = Company.previewCompanies.first?.id
    }

    private func updateApproval(_ approval: Approval, status: ApprovalStatus) {
        guard let index = approvals.firstIndex(where: { $0.id == approval.id }) else { return }
        approvals[index].status = status
    }
}
