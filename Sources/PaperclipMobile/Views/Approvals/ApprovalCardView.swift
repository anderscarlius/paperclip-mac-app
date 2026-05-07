import PaperclipShared
import SwiftUI

public struct ApprovalCardView: View {
    let approval: Approval
    let onApprove: () -> Void
    let onReject: () -> Void

    public init(approval: Approval, onApprove: @escaping () -> Void, onReject: @escaping () -> Void) {
        self.approval = approval
        self.onApprove = onApprove
        self.onReject = onReject
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(approval.title)
                .font(.headline)

            Text("Requested by \(approval.requestedBy)")
                .foregroundStyle(.secondary)

            if let modelSummary = approval.modelSummary {
                Text(modelSummary)
                    .font(.subheadline)
            }

            HStack {
                StatusBadge(text: approval.status.rawValue.capitalized, style: badgeStyle(for: approval.status))
                Spacer()
                if approval.status == .pending {
                    Button("Reject", role: .destructive, action: onReject)
                    Button("Approve", action: onApprove)
                        .buttonStyle(.borderedProminent)
                }
            }
        }
        .padding(.vertical, 6)
    }

    private func badgeStyle(for status: ApprovalStatus) -> StatusBadge.Style {
        switch status {
        case .pending: .warning
        case .approved: .success
        case .rejected: .danger
        }
    }
}
