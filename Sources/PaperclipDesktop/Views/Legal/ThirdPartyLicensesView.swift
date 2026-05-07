import SwiftUI

struct ThirdPartyLicensesView: View {
    @State private var selectedID: ThirdPartyLicenseNotice.ID? = ThirdPartyLicenseNotice.all.first?.id

    private var selectedNotice: ThirdPartyLicenseNotice? {
        ThirdPartyLicenseNotice.all.first(where: { $0.id == selectedID }) ?? ThirdPartyLicenseNotice.all.first
    }

    var body: some View {
        HStack(spacing: 0) {
            List(ThirdPartyLicenseNotice.all, selection: $selectedID) { notice in
                VStack(alignment: .leading, spacing: 4) {
                    Text(notice.name)
                    Text(notice.licenseName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 2)
            }
            .frame(minWidth: 220, idealWidth: 240, maxWidth: 260)

            Divider()

            if let selectedNotice {
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("Third-Party Licenses")
                            .font(.title2.bold())

                        Text("This app includes open source components distributed under the MIT License. The full license text for each component is shown below and is bundled with the app.")
                            .foregroundStyle(.secondary)

                        VStack(alignment: .leading, spacing: 8) {
                            LabeledContent("Component", value: selectedNotice.name)
                            LabeledContent("License", value: selectedNotice.licenseName)
                            LabeledContent("Copyright", value: selectedNotice.copyrightLine)
                            LabeledContent("Bundled file", value: "\(selectedNotice.bundledFileName).txt")
                        }

                        Link(selectedNotice.projectURL.absoluteString, destination: selectedNotice.projectURL)

                        ScrollView(.vertical) {
                            Text(selectedNotice.bundledText)
                                .font(.system(.caption, design: .monospaced))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .textSelection(.enabled)
                                .padding(12)
                        }
                        .frame(minHeight: 320)
                        .background {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.quaternary.opacity(0.35))
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(20)
                }
            } else {
                ContentUnavailableView(
                    "No License Selected",
                    systemImage: "doc.text.magnifyingglass",
                    description: Text("Select a component to read its license.")
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}
