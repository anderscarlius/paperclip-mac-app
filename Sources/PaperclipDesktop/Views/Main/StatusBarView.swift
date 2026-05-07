import SwiftUI

struct StatusBarView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        HStack(spacing: 14) {
            Label(model.processManager.runtimeState.title, systemImage: model.processManager.runtimeState.symbolName)
                .font(.headline)

            Spacer()

            if model.config.localModel.isEnabled || !model.installedOllamaModels.isEmpty {
                Menu {
                    Section("Preferred Local Model") {
                        ForEach(LocalModelCatalog.gemma4) { option in
                            Button {
                                model.choosePreferredLocalModel(option)
                                Task {
                                    await model.refreshOllamaStatus()
                                    await model.refreshModelInventory()
                                    await model.refreshDesktopSidebar()
                                }
                            } label: {
                                Label(
                                    option.displayName,
                                    systemImage: model.config.localModel.selectedModelID == option.id
                                        ? "checkmark.circle.fill"
                                        : "circle"
                                )
                            }
                        }
                    }

                    Section("Status") {
                        Text(model.localModelReadinessTitle)
                        Text(model.localModelReadinessDetail)
                    }

                    if !model.installedOllamaModels.isEmpty {
                        Section("Installed in Ollama") {
                            ForEach(model.installedOllamaModelDisplayNames, id: \.self) { modelName in
                                Text(modelName)
                            }
                        }
                    }

                    if !model.loadedOllamaModelNames.isEmpty {
                        Section("Loaded Now") {
                            ForEach(model.loadedOllamaModelDisplayNames, id: \.self) { modelName in
                                Text(modelName)
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 6) {
                        Text("Model")
                        Text(model.selectedLocalModelOption.displayName)
                            .foregroundStyle(.secondary)
                        Text(model.localModelReadinessTitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Image(systemName: "chevron.up.chevron.down")
                            .foregroundStyle(.secondary)
                    }
                }
                .menuStyle(.borderlessButton)
            }

            switch model.processManager.runtimeState {
            case .running:
                Button("Stop") {
                    model.stopServer()
                }
            case .starting:
                ProgressView()
                    .controlSize(.small)
            default:
                Button("Start") {
                    Task { await model.startServer() }
                }
            }

            SettingsLink {
                Label("Settings", systemImage: "gearshape")
            }
            .buttonStyle(.bordered)
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 14)
        .background(.regularMaterial)
    }
}
