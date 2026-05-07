import PaperclipShared
import SwiftUI

struct OrgChartEditorView: View {
    @Binding var agents: [CompanyTemplateAgent]

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Step 2 of 4: Organization")
                .font(.title2.bold())

            Text("Refine the initial org chart. This first version supports fast add/remove and basic budget tuning.")
                .foregroundStyle(.secondary)

            HStack {
                Button("Add Engineer") {
                    agents.append(
                        CompanyTemplateAgent(
                            id: "engineer-\(UUID().uuidString.prefix(6))",
                            role: .engineer,
                            title: "Engineer",
                            icon: "hammer.fill",
                            reportsTo: agents.first(where: { $0.role == .cto })?.id ?? agents.first?.id,
                            defaultModelID: "grok-4.1-fast",
                            capabilities: "Implementation",
                            heartbeatIntervalSec: 1800,
                            monthlyBudget: 60,
                            instructions: .blank
                        )
                    )
                }

                Button("Add Generalist") {
                    agents.append(
                        CompanyTemplateAgent(
                            id: "general-\(UUID().uuidString.prefix(6))",
                            role: .general,
                            title: "Generalist",
                            icon: "person.fill.badge.plus",
                            reportsTo: agents.first?.id,
                            defaultModelID: "grok-4.1-fast",
                            capabilities: "Flexible support",
                            heartbeatIntervalSec: 1800,
                            monthlyBudget: 40,
                            instructions: .blank
                        )
                    )
                }
            }

            List {
                ForEach(Array(agents.enumerated()), id: \.element.id) { index, agent in
                    HStack {
                        Label(agent.title, systemImage: agent.icon)
                        Spacer()
                        Text(agent.role.title)
                            .foregroundStyle(.secondary)
                        Stepper(
                            value: Binding(
                                get: { Int(agents[index].monthlyBudget) },
                                set: { agents[index].monthlyBudget = Double($0) }
                            ),
                            in: 10...500,
                            step: 10
                        ) {
                            Text("$\(Int(agents[index].monthlyBudget))/mo")
                                .monospacedDigit()
                        }
                        .frame(width: 160)

                        if index != 0 {
                            Button(role: .destructive) {
                                agents.remove(at: index)
                            } label: {
                                Image(systemName: "trash")
                            }
                            .buttonStyle(.borderless)
                        }
                    }
                }
            }
        }
        .padding(24)
    }
}
