import SwiftUI

struct NetworkSettingsView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        Form {
            Section("Remote Access") {
                Toggle("Enable remote access", isOn: $model.config.remoteAccessEnabled)

                Text(model.config.remoteAccessEnabled ? "Authenticated private mode will be used for mobile connections." : "Local trusted mode keeps the server on localhost for single-machine use.")
                    .foregroundStyle(.secondary)
            }

            Section("Connection") {
                LabeledContent("Desktop URL", value: model.serverURL.absoluteString)
                Text("QR code generation and API key provisioning for iOS can plug into this settings surface next.")
                    .foregroundStyle(.secondary)
            }

            Section {
                Button("Save Network Settings") {
                    model.saveSettings()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .formStyle(.grouped)
    }
}
