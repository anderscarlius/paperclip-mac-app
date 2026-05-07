import PaperclipShared
import SwiftUI

struct ReviewStepView: View {
    let name: String
    let goal: String
    let agents: [CompanyTemplateAgent]
    let defaultModelID: String

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Step 4 of 4: Review & Create")
                .font(.title2.bold())

            Text(name.isEmpty ? "Untitled Company" : name)
                .font(.title3.bold())

            Text(goal.isEmpty ? "No goal entered yet." : goal)
                .foregroundStyle(.secondary)

            HStack(spacing: 20) {
                metric(title: "Agents", value: "\(agents.count)")
                metric(title: "Default Model", value: ModelCatalog.option(for: defaultModelID).displayName)
                metric(title: "Budget / mo", value: "$\(Int(agents.reduce(0) { $0 + $1.monthlyBudget }))")
            }

            List(agents) { agent in
                HStack {
                    Text(agent.title)
                    Spacer()
                    Text(ModelCatalog.option(for: defaultModelID).displayName)
                        .foregroundStyle(.secondary)
                    Text("$\(Int(agent.monthlyBudget))")
                        .monospacedDigit()
                }
            }
        }
        .padding(24)
    }

    private func metric(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.headline)
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(.background)
        )
    }
}
