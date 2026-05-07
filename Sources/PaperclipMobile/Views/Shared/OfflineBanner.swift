import SwiftUI

public struct OfflineBanner: View {
    public init() {}

    public var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "wifi.slash")
            Text("Offline: showing last-known state.")
                .font(.subheadline)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.orange.opacity(0.12))
        )
        .foregroundStyle(.orange)
    }
}
