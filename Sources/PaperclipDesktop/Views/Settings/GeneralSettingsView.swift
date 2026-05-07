import PaperclipShared
import SwiftUI

struct GeneralSettingsView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        Form {
            Section("Appearance") {
                Picker("Theme", selection: $model.config.themePreference) {
                    ForEach(ThemePreference.allCases) { preference in
                        Text(preference.title).tag(preference)
                    }
                }
            }

            Section("Launch") {
                Toggle("Start at login", isOn: $model.config.launchAtLogin)
            }

            Section {
                Button("Save General Settings") {
                    model.saveSettings()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .formStyle(.grouped)
    }
}
