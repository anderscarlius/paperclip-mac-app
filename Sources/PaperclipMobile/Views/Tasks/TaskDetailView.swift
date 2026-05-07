import PaperclipShared
import SwiftUI

public struct TaskDetailView: View {
    let issue: Issue

    public init(issue: Issue) {
        self.issue = issue
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(issue.id)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Text(issue.title)
                    .font(.title2.bold())

                StatusBadge(text: issue.status.rawValue.replacingOccurrences(of: "_", with: " ").capitalized, style: .info)
                PriorityIndicator(priority: issue.priority)

                VStack(alignment: .leading, spacing: 8) {
                    Text("Description")
                        .font(.headline)
                    Text(issue.summary)
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Comments")
                        .font(.headline)

                    ForEach(issue.comments) { comment in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(comment.author)
                                .font(.subheadline.bold())
                            Text(comment.body)
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(.thinMaterial)
                        )
                    }
                }
            }
            .padding()
        }
    }
}
