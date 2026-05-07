import SwiftUI

public struct QRScannerView: View {
    public init() {}

    public var body: some View {
        ContentUnavailableView(
            "QR Scanner Scaffolded",
            systemImage: "qrcode.viewfinder",
            description: Text("Camera-backed QR onboarding can plug into this screen with AVFoundation in the iOS app target.")
        )
    }
}
