import Foundation

struct ResolvedProcessCommand {
    let executableURL: URL
    let arguments: [String]
    let currentDirectoryURL: URL
    let environment: [String: String]
}

struct PaperclipToolchain {
    func pnpmCommand(
        arguments: [String],
        currentDirectoryURL: URL,
        additionalEnvironment: [String: String] = [:]
    ) -> ResolvedProcessCommand {
        let environment = ProcessInfo.processInfo.environment.merging(additionalEnvironment) { _, new in new }

        if let bundled = bundledPnpmCommand(arguments: arguments, currentDirectoryURL: currentDirectoryURL, environment: environment) {
            return bundled
        }

        return ResolvedProcessCommand(
            executableURL: URL(fileURLWithPath: "/usr/bin/env"),
            arguments: ["pnpm"] + arguments,
            currentDirectoryURL: currentDirectoryURL,
            environment: environment
        )
    }

    private func bundledPnpmCommand(
        arguments: [String],
        currentDirectoryURL: URL,
        environment: [String: String]
    ) -> ResolvedProcessCommand? {
        guard let resources = Bundle.main.resourceURL else { return nil }

        let nodeURL = resources.appending(path: "node/bin/node", directoryHint: .notDirectory)
        let pnpmScriptURL = resources.appending(path: "pnpm/dist/pnpm.cjs", directoryHint: .notDirectory)

        guard FileManager.default.isExecutableFile(atPath: nodeURL.path),
              FileManager.default.fileExists(atPath: pnpmScriptURL.path) else {
            return nil
        }

        return ResolvedProcessCommand(
            executableURL: nodeURL,
            arguments: [pnpmScriptURL.path] + arguments,
            currentDirectoryURL: currentDirectoryURL,
            environment: environment
        )
    }
}
