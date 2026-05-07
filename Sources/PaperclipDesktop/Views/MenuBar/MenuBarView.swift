import AppKit
import SwiftUI

struct MenuBarView: View {
    @Bindable var model: DesktopAppModel
    @Environment(\.openWindow) private var openWindow

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label(model.processManager.runtimeState.title, systemImage: model.processManager.runtimeState.symbolName)

            Text("Port: \(model.config.port)")
                .foregroundStyle(.secondary)

            Divider()

            if model.companies.isEmpty {
                Text("No companies yet")
                    .foregroundStyle(.secondary)
            } else {
                Text("Companies")
                    .font(.headline)

                ForEach(model.companies.prefix(5)) { company in
                    Text("\(company.name) (\(company.agents.count) agents)")
                }
            }

            Text("Active runs: \(model.companies.flatMap(\.agents).filter { $0.status == .running }.count)")
            Text("Today's spend: $\(model.companies.reduce(0) { $0 + $1.spendToday }, specifier: "%.2f")")
                .monospacedDigit()

            Divider()

            Button("Open Dashboard") {
                openWindow(id: "main")
            }

            Button("About Paperclip Desktop") {
                openWindow(id: "about")
            }

            SettingsLink {
                Text("Settings...")
            }

            Button(serverActionTitle) {
                switch model.processManager.runtimeState {
                case .running:
                    model.stopServer()
                case .starting:
                    break
                default:
                    Task { await model.startServer() }
                }
            }
            .disabled(model.processManager.runtimeState == .starting)

            Divider()

            Button("Quit") {
                NSApp.terminate(nil)
            }
        }
        .padding(14)
        .frame(minWidth: 260)
    }

    private var serverActionTitle: String {
        switch model.processManager.runtimeState {
        case .running:
            "Stop Server"
        case .starting:
            "Starting..."
        case .stopped, .failed:
            "Start Server"
        }
    }
}
