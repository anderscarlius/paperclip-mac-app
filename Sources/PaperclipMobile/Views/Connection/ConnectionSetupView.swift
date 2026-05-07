import SwiftUI

public struct ConnectionSetupView: View {
    @Bindable var model: MobileAppModel

    public init(model: MobileAppModel) {
        self.model = model
    }

    public var body: some View {
        VStack(spacing: 20) {
            Spacer()

            Image(systemName: "paperclip.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(.tint)

            Text("Paperclip Mobile")
                .font(.largeTitle.bold())

            Text("Connect to your Paperclip server.")
                .foregroundStyle(.secondary)

            VStack(spacing: 12) {
                TextField("Server URL", text: $model.connectionURLString)
                    .textFieldStyle(.roundedBorder)

                SecureField("API token", text: $model.token)
                    .textFieldStyle(.roundedBorder)
            }

            NavigationLink {
                QRScannerView()
            } label: {
                Label("Scan QR Code", systemImage: "qrcode.viewfinder")
            }

            Button("Connect") {
                Task { await model.connect() }
            }
            .buttonStyle(.borderedProminent)

            if let statusMessage = model.statusMessage {
                Text(statusMessage)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()
        }
        .padding(24)
    }
}
