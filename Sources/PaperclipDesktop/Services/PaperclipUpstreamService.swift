import Foundation

struct PaperclipUpstreamService {
    private let repositoryOwner = "paperclipai"
    private let repositoryName = "paperclip"

    func fetchLatestRelease() async throws -> PaperclipUpstreamRelease {
        let repositoryURL = URL(string: "https://api.github.com/repos/\(repositoryOwner)/\(repositoryName)")!
        let repository: RepositoryResponse = try await requestJSON(from: repositoryURL)

        let commitURL = URL(string: "https://api.github.com/repos/\(repositoryOwner)/\(repositoryName)/commits/\(repository.defaultBranch)")!
        let commit: CommitResponse = try await requestJSON(from: commitURL)

        return PaperclipUpstreamRelease(
            repositoryOwner: repositoryOwner,
            repositoryName: repositoryName,
            defaultBranch: repository.defaultBranch,
            revision: commit.sha,
            message: commit.commit.message.components(separatedBy: .newlines).first ?? commit.commit.message,
            publishedAt: commit.commit.committer?.date,
            htmlURL: commit.htmlURL
        )
    }

    func downloadSource(for release: PaperclipUpstreamRelease) async throws -> URL {
        let tarballURL = URL(string: "https://api.github.com/repos/\(release.repositoryOwner)/\(release.repositoryName)/tarball/\(release.revision)")!
        var request = URLRequest(url: tarballURL)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("PaperclipDesktop", forHTTPHeaderField: "User-Agent")

        let (archiveURL, response) = try await URLSession.shared.download(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw PaperclipUpstreamServiceError.requestFailed
        }

        let extractionDirectory = FileManager.default.temporaryDirectory
            .appending(path: "paperclip-upstream-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: extractionDirectory, withIntermediateDirectories: true)

        try await extractTarball(at: archiveURL, into: extractionDirectory)

        let extractedRoots = try FileManager.default.contentsOfDirectory(at: extractionDirectory, includingPropertiesForKeys: nil)
        guard let sourceDirectory = extractedRoots.first(where: {
            FileManager.default.fileExists(atPath: $0.appending(path: "package.json", directoryHint: .notDirectory).path)
        }) else {
            throw PaperclipUpstreamServiceError.invalidArchive
        }

        return sourceDirectory
    }

    private func requestJSON<Response: Decodable>(from url: URL) async throws -> Response {
        var request = URLRequest(url: url)
        request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
        request.setValue("PaperclipDesktop", forHTTPHeaderField: "User-Agent")

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw PaperclipUpstreamServiceError.requestFailed
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode(Response.self, from: data)
    }

    private func extractTarball(at archiveURL: URL, into destinationDirectory: URL) async throws {
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/tar")
        process.arguments = ["-xzf", archiveURL.path, "-C", destinationDirectory.path]

        try process.run()

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            process.terminationHandler = { process in
                if process.terminationStatus == 0 {
                    continuation.resume()
                } else {
                    continuation.resume(throwing: PaperclipUpstreamServiceError.extractFailed(process.terminationStatus))
                }
            }
        }
    }
}

private struct RepositoryResponse: Decodable {
    let defaultBranch: String

    enum CodingKeys: String, CodingKey {
        case defaultBranch = "default_branch"
    }
}

private struct CommitResponse: Decodable {
    let sha: String
    let htmlURL: URL?
    let commit: NestedCommit

    enum CodingKeys: String, CodingKey {
        case sha
        case htmlURL = "html_url"
        case commit
    }

    struct NestedCommit: Decodable {
        let message: String
        let committer: CommitPerson?
    }

    struct CommitPerson: Decodable {
        let date: Date?
    }
}

enum PaperclipUpstreamServiceError: LocalizedError {
    case requestFailed
    case invalidArchive
    case extractFailed(Int32)

    var errorDescription: String? {
        switch self {
        case .requestFailed:
            "GitHub did not return a valid Paperclip response."
        case .invalidArchive:
            "The downloaded Paperclip archive did not contain a valid source tree."
        case .extractFailed(let status):
            "Failed to extract the downloaded Paperclip archive with exit code \(status)."
        }
    }
}
