import PaperclipShared
import SwiftUI

struct APIKeyStepView: View {
    @Binding var providerKeys: [LLMProvider: String]
    var compact = false

    var body: some View {
        Group {
            if compact {
                content
            } else {
                ScrollView {
                    content
                }
            }
        }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 20) {
            if !compact {
                Text("API Keys")
                    .font(.title2.bold())

                Text("Choose the providers you want to use. Keys are stored in the Keychain, not in plain text.")
                    .foregroundStyle(.secondary)
            } else {
                Text("Optional for cloud-first. Keys are stored in the Keychain, not in plain text.")
                    .foregroundStyle(.secondary)
            }

            ForEach(LLMProvider.credentialProviders) { provider in
                VStack(alignment: .leading, spacing: 8) {
                    Text(provider.title)
                        .font(.headline)

                    SecureField(
                        provider.placeholder,
                        text: Binding(
                            get: { providerKeys[provider, default: ""] },
                            set: { providerKeys[provider] = $0 }
                        )
                    )
                    .textFieldStyle(.roundedBorder)

                    if let envKey = provider.envKey {
                        Text(envKey)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .fill(.background.opacity(0.7))
                )
            }
        }
        .padding(compact ? 0 : 32)
        .frame(maxWidth: 700, alignment: .leading)
    }
}
