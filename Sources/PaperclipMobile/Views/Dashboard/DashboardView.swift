import PaperclipShared
import SwiftUI

public struct DashboardView: View {
    @Bindable var model: MobileAppModel

    public init(model: MobileAppModel) {
        self.model = model
    }

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if model.isOffline {
                    OfflineBanner()
                }

                spendCard

                Text("Companies")
                    .font(.headline)

                ForEach(model.companies) { company in
                    CompanyCardView(company: company)
                }

                ActivityFeedView(activity: model.dashboard.activity)
            }
            .padding()
        }
        .navigationTitle("Dashboard")
    }

    private var spendCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Today's Spend")
                .font(.headline)

            Text("$\(model.dashboard.todaySpend, specifier: "%.2f") / $\(model.dashboard.dailyBudget, specifier: "%.0f") daily")
                .font(.title3.monospacedDigit())

            ProgressView(value: model.dashboard.todaySpend / max(model.dashboard.dailyBudget, 1))
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.thinMaterial)
        )
    }
}
