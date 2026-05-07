import Foundation

struct ThirdPartyLicenseNotice: Identifiable, Hashable {
    let id: String
    let name: String
    let projectURL: URL
    let licenseName: String
    let bundledFileName: String
    let copyrightLine: String

    var bundledText: String {
        guard let url = bundledFileURL(),
        let text = try? String(contentsOf: url, encoding: .utf8) else {
            return "Could not read the bundled license text for \(name)."
        }

        return text
    }

    private func bundledFileURL() -> URL? {
        let bundle = Bundle.module
        return bundle.url(forResource: bundledFileName, withExtension: "txt")
            ?? bundle.url(forResource: bundledFileName, withExtension: "txt", subdirectory: "Licenses")
    }

    static let all: [ThirdPartyLicenseNotice] = [
        ThirdPartyLicenseNotice(
            id: "paperclip",
            name: "Paperclip",
            projectURL: URL(string: "https://github.com/paperclipai/paperclip")!,
            licenseName: "MIT License",
            bundledFileName: "LICENSE-paperclip",
            copyrightLine: "Copyright (c) 2025 Paperclip AI"
        ),
        ThirdPartyLicenseNotice(
            id: "ollama",
            name: "Ollama",
            projectURL: URL(string: "https://github.com/ollama/ollama")!,
            licenseName: "MIT License",
            bundledFileName: "LICENSE-ollama",
            copyrightLine: "Copyright (c) Ollama"
        )
    ]
}
