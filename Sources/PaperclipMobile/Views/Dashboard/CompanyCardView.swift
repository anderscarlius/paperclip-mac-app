import PaperclipShared
import SwiftUI

public struct CompanyCardView: View {
    let company: Company

    public init(company: Company) {
        self.company = company
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(company.name)
                .font(.headline)

            Text("\(company.agents.count) agents · \(company.activeAgents) active")
                .foregroundStyle(.secondary)

            Text("\(company.tasksInProgress) tasks in progress")
                .foregroundStyle(.secondary)

            Text("Spend today: $\(company.spendToday, specifier: "%.2f")")
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.background)
        )
    }
}
