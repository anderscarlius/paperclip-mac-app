import SwiftUI

struct RunDetailSettingsView: View {
    @Bindable var model: DesktopAppModel
    @State private var selectedRunID: String?

    var body: some View {
        Form {
            Section("Runs") {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Run Timeline")
                            .font(.headline)
                        Text("Follow startup, model loading, tool calls, first output, and final result without reading raw logs.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button {
                        Task {
                            await model.refreshDesktopSidebar()
                        }
                    } label: {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                }

                if model.latestRunDiagnostics.isEmpty {
                    ContentUnavailableView(
                        "No Runs Yet",
                        systemImage: "clock.badge.questionmark",
                        description: Text("Start an agent run and the latest timeline, tool calls, and timing summary will appear here.")
                    )
                } else {
                    Picker("Run", selection: selectedRunBinding) {
                        ForEach(model.latestRunDiagnostics, id: \.runId) { diagnostic in
                            Text(runPickerLabel(for: diagnostic)).tag(diagnostic.runId)
                        }
                    }
                }
            }

            if let selectedRunDiagnostic {
                Section {
                    RunDetailView(
                        diagnostic: selectedRunDiagnostic,
                        runSummary: selectedRunSummary,
                        formatDuration: formatDuration
                    )
                }
            }
        }
        .formStyle(.grouped)
        .task {
            await model.refreshDesktopSidebar()
        }
    }

    private var selectedRunBinding: Binding<String> {
        Binding(
            get: { selectedRunID ?? model.latestRunDiagnostics.first?.runId ?? "" },
            set: { selectedRunID = $0 }
        )
    }

    private var selectedRunDiagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic? {
        let resolvedID = selectedRunID ?? model.latestRunDiagnostics.first?.runId
        return model.latestRunDiagnostics.first(where: { $0.runId == resolvedID })
    }

    private var selectedRunSummary: DesktopSidebarRunSummary? {
        guard let selectedRunID = selectedRunDiagnostic?.runId,
              model.sidebarSnapshot?.latestLocalRun?.runID == selectedRunID else {
            return nil
        }
        return model.sidebarSnapshot?.latestLocalRun
    }

    private func runPickerLabel(for diagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic) -> String {
        let shortID = String(diagnostic.runId.prefix(8))
        let agent = diagnostic.agentName ?? "Agent"
        let model = diagnostic.model ?? diagnostic.adapterType ?? "unknown"
        return "\(shortID) · \(agent) · \(diagnostic.status.capitalized) · \(model)"
    }

    private func formatDuration(_ seconds: Double) -> String {
        let rounded = max(0, Int(seconds.rounded()))
        if rounded < 60 {
            return "\(rounded)s"
        }
        return "\(rounded / 60)m \(rounded % 60)s"
    }
}
