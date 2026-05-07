import Foundation

enum PaperclipSourceOrigin: String, Codable, Equatable {
    case bundledSnapshot
    case upstreamGitHub

    var title: String {
        switch self {
        case .bundledSnapshot:
            "Bundled Snapshot"
        case .upstreamGitHub:
            "GitHub"
        }
    }
}

struct PaperclipSourceMetadata: Codable, Equatable {
    var origin: PaperclipSourceOrigin
    var repositoryURL: URL?
    var referenceName: String?
    var revision: String?
    var installedAt: Date?

    static func bundledDefault() -> PaperclipSourceMetadata {
        PaperclipSourceMetadata(
            origin: .bundledSnapshot,
            repositoryURL: URL(string: "https://github.com/paperclipai/paperclip"),
            referenceName: nil,
            revision: nil,
            installedAt: nil
        )
    }
}
