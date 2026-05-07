import SwiftUI

struct SettingsView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        TabView {
            GeneralSettingsView(model: model)
                .tabItem {
                    Label("General", systemImage: "gearshape")
                }

            APIKeysSettingsView(model: model)
                .tabItem {
                    Label("API Keys", systemImage: "key")
                }

            ModelSettingsView(model: model)
                .tabItem {
                    Label("Models", systemImage: "cpu")
                }

            SkillsSettingsView(model: model)
                .tabItem {
                    Label("Skills", systemImage: "sparkles")
                }

            ServerSettingsView(model: model)
                .tabItem {
                    Label("Server", systemImage: "server.rack")
                }

            RunDetailSettingsView(model: model)
                .tabItem {
                    Label("Runs", systemImage: "timeline.selection")
                }

            NetworkSettingsView(model: model)
                .tabItem {
                    Label("Network", systemImage: "network")
                }

            DiagnosticsSettingsView(model: model)
                .tabItem {
                    Label("Diagnostics", systemImage: "stethoscope")
                }

            AdvancedSettingsView(model: model)
                .tabItem {
                    Label("Advanced", systemImage: "wrench.and.screwdriver")
                }

            HelpSettingsView()
                .tabItem {
                    Label("Help", systemImage: "questionmark.circle")
                }

            LegalSettingsView()
                .tabItem {
                    Label("Legal", systemImage: "doc.text")
                }
        }
        .padding(20)
    }
}
