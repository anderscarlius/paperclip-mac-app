import PaperclipShared
import SwiftUI

public struct AgentDetailView: View {
    @Bindable var model: MobileAppModel
    let agent: Agent

    public init(model: MobileAppModel, agent: Agent) {
        self.model = model
        self.agent = agent
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text(agent.name)
                    .font(.largeTitle.bold())

                StatusBadge(text: agent.status.rawValue.capitalized, style: .info)

                Text("Model: \(ModelCatalog.option(for: agent.modelID).displayName)")
                Text("Today: $\(agent.spendToday, specifier: "%.2f")")
                    .monospacedDigit()
                Text("Last run: \(agent.lastRunSummary)")
                    .foregroundStyle(.secondary)

                HStack {
                    Button("Invoke") {
                        model.invoke(agent)
                    }
                    .buttonStyle(.borderedProminent)

                    Button(agent.status == .paused ? "Resume" : "Pause") {
                        model.togglePaused(agent)
                    }
                }
            }
            .padding()
        }
    }
}
