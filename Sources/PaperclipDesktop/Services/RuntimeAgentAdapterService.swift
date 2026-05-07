import Foundation
import PaperclipShared

struct RuntimeAgentAdapterService {
    func recommendedChoice(config: AppConfig, companyID: String) -> RuntimeAgentAdapterChoice? {
        if config.localModel.isEnabled,
           config.localModel.useAsPrimaryModel,
           commandExists("codex") {
            return RuntimeAgentAdapterChoice(
                adapterType: "codex_local",
                adapterConfig: localCodexAdapterConfig(config: config, companyID: companyID),
                title: "Local Codex + Ollama",
                message: "Codex is installed, so Paperclip agents can run locally on this Mac through Ollama using your selected Gemma 4 model.",
                requiresExactConfiguration: true
            )
        }

        if commandExists("codex") {
            return RuntimeAgentAdapterChoice(
                adapterType: "codex_local",
                adapterConfig: [
                    "extraArgs": .stringArray(["--skip-git-repo-check"])
                ],
                title: "Codex",
                message: "Codex is installed and can run Paperclip agents reliably on this Mac when the git repository check is skipped for generated workspaces.",
                requiresExactConfiguration: false
            )
        }

        if commandExists("claude") {
            return RuntimeAgentAdapterChoice(
                adapterType: "claude_local",
                adapterConfig: [:],
                title: "Claude Code",
                message: "Claude Code is installed and can be used as the Paperclip agent runtime on this Mac.",
                requiresExactConfiguration: false
            )
        }

        if commandExists("gemini") {
            return RuntimeAgentAdapterChoice(
                adapterType: "gemini_local",
                adapterConfig: [:],
                title: "Gemini CLI",
                message: "Gemini CLI is installed and can be used as the Paperclip agent runtime on this Mac.",
                requiresExactConfiguration: false
            )
        }

        return nil
    }

    func repairPlan(
        for agent: PaperclipRuntimeService.RuntimeAgentSummary,
        testResult: PaperclipRuntimeService.AdapterEnvironmentTestResult,
        recommendedChoice: RuntimeAgentAdapterChoice
    ) -> RuntimeAgentAdapterChoice? {
        if recommendedChoice.requiresExactConfiguration,
           (agent.adapterType != recommendedChoice.adapterType || agent.adapterConfig != recommendedChoice.adapterConfig) {
            return recommendedChoice
        }

        if needsCodexWorkspaceFix(testResult), recommendedChoice.adapterType == "codex_local" {
            return recommendedChoice
        }

        if testResult.status == "fail" && agent.adapterType != recommendedChoice.adapterType {
            return recommendedChoice
        }

        if hasMissingCommand(testResult) && agent.adapterType != recommendedChoice.adapterType {
            return recommendedChoice
        }

        return nil
    }

    private func hasMissingCommand(_ result: PaperclipRuntimeService.AdapterEnvironmentTestResult) -> Bool {
        result.checks.contains(where: { $0.code.contains("command_unresolvable") })
    }

    private func needsCodexWorkspaceFix(_ result: PaperclipRuntimeService.AdapterEnvironmentTestResult) -> Bool {
        result.checks.contains { check in
            check.code == "codex_hello_probe_failed"
            && ((check.detail ?? "").contains("--skip-git-repo-check")
                || (check.hint ?? "").contains("--skip-git-repo-check"))
        }
    }

    private func commandExists(_ name: String) -> Bool {
        let envPath = ProcessInfo.processInfo.environment["PATH"] ?? ""
        let paths = envPath.split(separator: ":").map(String.init)

        for path in paths {
            let candidate = URL(filePath: path, directoryHint: .isDirectory)
                .appending(path: name, directoryHint: .notDirectory)
            if FileManager.default.isExecutableFile(atPath: candidate.path) {
                return true
            }
        }

        return false
    }

    private func localCodexAdapterConfig(
        config: AppConfig,
        companyID: String
    ) -> [String: RuntimeJSONValue] {
        [
            "model": .string(config.localModel.selectedModelID),
            "extraArgs": .stringArray([
                "--oss",
                "--local-provider=ollama",
                "--skip-git-repo-check"
            ]),
            "env": .object([
                "CODEX_HOME": .string(DesktopPaths.paperclipCodexHomeDirectory(companyID: companyID).path)
            ])
        ]
    }
}
