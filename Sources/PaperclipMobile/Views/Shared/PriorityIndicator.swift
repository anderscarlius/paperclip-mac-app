import PaperclipShared
import SwiftUI

public struct PriorityIndicator: View {
    let priority: IssuePriority

    public init(priority: IssuePriority) {
        self.priority = priority
    }

    public var body: some View {
        Text(label)
            .font(.caption.bold())
            .foregroundStyle(color)
    }

    private var label: String {
        switch priority {
        case .high: "High"
        case .medium: "Medium"
        case .low: "Low"
        }
    }

    private var color: Color {
        switch priority {
        case .high: .red
        case .medium: .orange
        case .low: .green
        }
    }
}
