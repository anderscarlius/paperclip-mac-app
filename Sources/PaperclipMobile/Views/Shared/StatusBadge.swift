import SwiftUI

public struct StatusBadge: View {
    public enum Style {
        case info
        case success
        case warning
        case danger

        var color: Color {
            switch self {
            case .info: .blue
            case .success: .green
            case .warning: .orange
            case .danger: .red
            }
        }
    }

    let text: String
    let style: Style

    public init(text: String, style: Style) {
        self.text = text
        self.style = style
    }

    public var body: some View {
        Text(text)
            .font(.caption.bold())
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(style.color.opacity(0.14))
            .foregroundStyle(style.color)
            .clipShape(Capsule())
    }
}
