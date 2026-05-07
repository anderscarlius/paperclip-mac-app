import PaperclipShared
import SwiftUI

public struct TaskListView: View {
    @Bindable var model: MobileAppModel
    @State private var selectedIssue: Issue?
    @State private var showingNewTask = false

    public init(model: MobileAppModel) {
        self.model = model
    }

    public var body: some View {
        List {
            issueSection(title: "In Progress", status: .inProgress)
            issueSection(title: "Blocked", status: .blocked)
            issueSection(title: "Todo", status: .todo)
        }
        .navigationTitle("Tasks")
        .toolbar {
            Button {
                showingNewTask = true
            } label: {
                Label("New", systemImage: "plus")
            }
        }
        .sheet(item: $selectedIssue) { issue in
            TaskDetailView(issue: issue)
        }
        .sheet(isPresented: $showingNewTask) {
            NewTaskView(model: model)
        }
    }

    @ViewBuilder
    private func issueSection(title: String, status: IssueStatus) -> some View {
        Section("\(title) (\(model.filteredIssues(for: status).count))") {
            ForEach(model.filteredIssues(for: status)) { issue in
                Button {
                    selectedIssue = issue
                } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(issue.id)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(issue.title)
                            .font(.headline)
                        HStack {
                            Text(issue.assigneeName)
                            Spacer()
                            PriorityIndicator(priority: issue.priority)
                        }
                        .font(.subheadline)
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }
}
