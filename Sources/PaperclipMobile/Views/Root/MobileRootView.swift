import SwiftUI

public struct MobileRootView: View {
    @State private var model = MobileAppModel()

    public init() {}

    public var body: some View {
        Group {
            if model.isConnected {
                TabView {
                    NavigationStack {
                        DashboardView(model: model)
                    }
                    .tabItem {
                        Label("Home", systemImage: "house.fill")
                    }

                    NavigationStack {
                        TaskListView(model: model)
                    }
                    .tabItem {
                        Label("Tasks", systemImage: "list.bullet.rectangle")
                    }

                    NavigationStack {
                        ApprovalListView(model: model)
                    }
                    .tabItem {
                        Label("Approvals", systemImage: "checkmark.circle")
                    }

                    NavigationStack {
                        AgentListView(model: model)
                    }
                    .tabItem {
                        Label("Agents", systemImage: "bolt.horizontal.circle")
                    }
                }
            } else {
                ConnectionSetupView(model: model)
            }
        }
    }
}
