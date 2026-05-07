import SwiftUI

struct ServerSettingsView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        Form {
            Section("Server") {
                LabeledContent("Status", value: model.processManager.runtimeState.title)

                TextField("Port", value: $model.config.port, format: .number)
                    .textFieldStyle(.roundedBorder)

                HStack {
                    Button("Start") {
                        Task { await model.startServer() }
                    }
                    .disabled(model.processManager.runtimeState == .starting)

                    Button("Stop") {
                        model.stopServer()
                    }

                    Button("Restart") {
                        Task { await model.restartServer() }
                    }
                }

                Text("Paperclip Desktop runs the embedded Paperclip server here. If an agent runtime is missing or misconfigured, you can repair broken adapter settings below.")
                    .foregroundStyle(.secondary)
            }

            Section("Agent Runtime Compatibility") {
                if let runtimeAgentMessage = model.runtimeAgentMessage {
                    Text(runtimeAgentMessage)
                        .foregroundStyle(.secondary)
                } else {
                    Text("No runtime compatibility check has been run yet.")
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Button("Repair Broken Agent Adapters") {
                        Task {
                            await model.repairBrokenRuntimeAgents()
                        }
                    }
                    .disabled(model.isRepairingRuntimeAgents || model.processManager.runtimeState == .starting)

                    if model.isRepairingRuntimeAgents {
                        ProgressView()
                            .controlSize(.small)
                    }
                }
            }

            Section("Logs") {
                ScrollView {
                    Text(model.processManager.logOutput.isEmpty ? "No logs yet." : model.processManager.logOutput)
                        .font(.system(.caption, design: .monospaced))
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .textSelection(.enabled)
                }
                .frame(minHeight: 220)
            }

            Section {
                Button("Save Server Settings") {
                    model.saveSettings()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .formStyle(.grouped)
    }
}
