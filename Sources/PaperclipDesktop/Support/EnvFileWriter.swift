import Foundation
import PaperclipShared

struct EnvFileWriter {
    let config: AppConfig
    let keychainService: KeychainService

    func contents() throws -> String {
        let localModelPrimary = config.localModel.isEnabled && config.localModel.useAsPrimaryModel
        var lines: [String] = [
            "PAPERCLIP_DEPLOYMENT_MODE=\(config.remoteAccessEnabled ? "authenticated" : "local_trusted")",
            "PAPERCLIP_DEPLOYMENT_EXPOSURE=private",
            "PORT=\(config.port)",
            "HOST=\(config.remoteAccessEnabled ? "0.0.0.0" : "127.0.0.1")",
            "SERVE_UI=true",
            "BETTER_AUTH_SECRET=\(config.authSecret)"
        ]

        for provider in LLMProvider.credentialProviders {
            guard let envKey = provider.envKey else { continue }
            if let key = try keychainService.string(for: envKey), !key.isEmpty {
                lines.append("\(envKey)=\(key)")
            }
        }

        if localModelPrimary {
            lines.append("OPENAI_BASE_URL=http://127.0.0.1:11434/v1")
            if (try keychainService.string(for: "OPENAI_API_KEY"))?.isEmpty ?? true {
                lines.append("OPENAI_API_KEY=ollama")
            }
        }

        return lines.joined(separator: "\n")
    }

    func writePaperclipEnvFile(to fileURL: URL) throws {
        try DesktopPaths.ensurePaperclipRuntimeDirectories()
        try contents().write(
            to: fileURL,
            atomically: true,
            encoding: .utf8
        )
    }
}
