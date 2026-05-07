import Foundation

struct PaperclipUpstreamRelease: Equatable {
    let repositoryOwner: String
    let repositoryName: String
    let defaultBranch: String
    let revision: String
    let message: String
    let publishedAt: Date?
    let htmlURL: URL?

    var shortRevision: String {
        String(revision.prefix(12))
    }

    var repositoryURL: URL {
        URL(string: "https://github.com/\(repositoryOwner)/\(repositoryName)")!
    }
}
