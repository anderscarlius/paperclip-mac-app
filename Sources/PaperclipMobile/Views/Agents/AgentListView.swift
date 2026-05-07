import PaperclipShared
import SwiftUI

public struct AgentListView: View {
    @Bindable var model: MobileAppModel

    public init(model: MobileAppModel) {
        self.model = model
    }

    public var body: some View {
        List(model.agents) { agent in
            NavigationLink {
                AgentDetailView(model: model, agent: agent)
            } label: {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(agent.name)
                            .font(.headline)
                        Spacer()
                        StatusBadge(text: agent.status.rawValue.capitalized, style: badgeStyle(for: agent.status))
                    }

                    Text(ModelCatalog.option(for: agent.modelID).displayName)
                        .foregroundStyle(.secondary)

                    Text("Today: $\(agent.spendToday, specifier: "%.2f")")
                        .font(.subheadline.monospacedDigit())
                }
            }
        }
        .navigationTitle("Agents")
    }

    private func badgeStyle(for status: AgentRuntimeStatus) -> StatusBadge.Style {
        switch status {
        case .active: .success
        case .running: .info
        case .paused: .warning
        case .error: .danger
        }
    }
}
