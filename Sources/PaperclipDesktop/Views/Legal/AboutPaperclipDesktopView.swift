import SwiftUI

struct AboutPaperclipDesktopView: View {
    private var shortVersion: String {
        Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "Development"
    }

    private var buildVersion: String {
        Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "Local"
    }

    var body: some View {
        VStack(spacing: 0) {
            VStack(alignment: .leading, spacing: 16) {
                HStack(alignment: .top, spacing: 16) {
                    Image(systemName: "paperclip.circle.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.tint)

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Paperclip Desktop")
                            .font(.title.bold())

                        Text("Run AI companies locally on your Mac with Paperclip as the runtime and support for both cloud models and local Gemma 4 through Ollama.")
                            .foregroundStyle(.secondary)

                        HStack(spacing: 12) {
                            Label("Version \(shortVersion)", systemImage: "shippingbox")
                            Label("Build \(buildVersion)", systemImage: "hammer")
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Legal Notices")
                        .font(.headline)

                    Text("This app distributes third-party software including Paperclip and Ollama. The full MIT licenses are shown below and are included in the app bundle.")
                        .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)

            Divider()

            ThirdPartyLicensesView()
        }
        .frame(minWidth: 820, minHeight: 620)
    }
}
