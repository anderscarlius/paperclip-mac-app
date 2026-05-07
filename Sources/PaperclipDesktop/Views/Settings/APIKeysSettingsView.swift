import PaperclipShared
import SwiftUI

struct APIKeysSettingsView: View {
    @Bindable var model: DesktopAppModel

    var body: some View {
        Form {
            Section("Providers") {
                Text("Add the provider keys you want Paperclip Desktop to use. Keys are stored locally in Keychain, and only the providers you fill in will be available to the Paperclip runtime.")
                    .foregroundStyle(.secondary)

                ForEach(LLMProvider.credentialProviders) { provider in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(provider.title)
                            .font(.headline)

                        SecureField(
                            provider.placeholder,
                            text: Binding(
                                get: { model.providerKeyDrafts[provider, default: ""] },
                                set: { model.providerKeyDrafts[provider] = $0 }
                            )
                        )
                        .textFieldStyle(.roundedBorder)

                        if let envKey = provider.envKey {
                            Text(envKey)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }

            Section {
                Button("Save API Keys") {
                    model.saveSettings()
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .formStyle(.grouped)
    }
}
