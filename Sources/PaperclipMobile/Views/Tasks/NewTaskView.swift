import PaperclipShared
import SwiftUI

public struct NewTaskView: View {
    @Bindable var model: MobileAppModel
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var priority: IssuePriority = .medium
    @State private var assigneeName = "CEO"

    public init(model: MobileAppModel) {
        self.model = model
    }

    public var body: some View {
        NavigationStack {
            Form {
                TextField("Title", text: $title)
                TextField("Description", text: $description, axis: .vertical)
                Picker("Priority", selection: $priority) {
                    ForEach(IssuePriority.allCases) { priority in
                        Text(priority.rawValue.capitalized).tag(priority)
                    }
                }
                TextField("Assign to", text: $assigneeName)
            }
            .navigationTitle("New Task")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") {
                        model.createIssue(
                            NewIssueRequest(
                                title: title,
                                description: description,
                                priority: priority,
                                assigneeName: assigneeName
                            )
                        )
                        dismiss()
                    }
                    .disabled(title.isEmpty)
                }
            }
        }
    }
}
