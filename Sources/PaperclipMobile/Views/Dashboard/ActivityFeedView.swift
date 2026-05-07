import PaperclipShared
import SwiftUI

public struct ActivityFeedView: View {
    let activity: [ActivityEvent]

    public init(activity: [ActivityEvent]) {
        self.activity = activity
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recent Activity")
                .font(.headline)

            ForEach(activity) { item in
                Text("• \(item.message)")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.background)
        )
    }
}
