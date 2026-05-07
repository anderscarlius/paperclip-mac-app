import PaperclipShared
import SwiftUI

public struct ApprovalListView: View {
    @Bindable var model: MobileAppModel

    public init(model: MobileAppModel) {
        self.model = model
    }

    public var body: some View {
        List {
            Section("Pending") {
                ForEach(model.approvals.filter { $0.status == .pending }) { approval in
                    ApprovalCardView(
                        approval: approval,
                        onApprove: { model.approve(approval) },
                        onReject: { model.reject(approval) }
                    )
                }
            }

            Section("Recent") {
                ForEach(model.approvals.filter { $0.status != .pending }) { approval in
                    ApprovalCardView(approval: approval, onApprove: {}, onReject: {})
                }
            }
        }
        .navigationTitle("Approvals")
    }
}
