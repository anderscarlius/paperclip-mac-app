import Foundation
import PaperclipShared

struct LocalAISkillAssistantService {
    private let ollamaService = OllamaService()
    private let completionsURL = URL(string: "http://127.0.0.1:11434/v1/chat/completions")!

    func draftSkill(
        from request: String,
        for agent: Agent,
        modelID: String
    ) async throws -> String {
        try await ensureLocalModelReady(modelID: modelID)

        let systemPrompt = """
        You write practical SKILL.md files for autonomous AI agents.
        Return only markdown for a single SKILL.md file.
        Keep it concise, concrete, and easy to apply.
        """

        let userPrompt = """
        Create a SKILL.md file for the agent "\(agent.name)" with role "\(agent.role.title)".

        User request:
        \(request)

        The skill should include these sections:
        - Purpose
        - When to Use
        - Workflow
        - Guardrails
        - Output Style

        Make the skill safe, practical, and suitable for a professional desktop app.
        """

        return try await sendChat(systemPrompt: systemPrompt, userPrompt: userPrompt, modelID: modelID)
    }

    func reviewSkill(
        title: String,
        content: String,
        targetAgent: Agent?,
        modelID: String
    ) async throws -> String {
        try await ensureLocalModelReady(modelID: modelID)

        let targetSummary: String
        if let targetAgent {
            targetSummary = "Target agent: \(targetAgent.name) (\(targetAgent.role.title))."
        } else {
            targetSummary = "No specific target agent has been chosen yet."
        }

        let systemPrompt = """
        You review agent skills before installation.
        Be practical, direct, and easy to understand.
        """

        let userPrompt = """
        Review this candidate skill before it is installed.

        \(targetSummary)
        Skill title: \(title)

        Please respond with short sections:
        - Best Fit
        - What It Changes
        - Risks or Edits to Consider
        - Recommendation

        Candidate skill:
        ```md
        \(content)
        ```
        """

        return try await sendChat(systemPrompt: systemPrompt, userPrompt: userPrompt, modelID: modelID)
    }

    private func ensureLocalModelReady(modelID: String) async throws {
        guard ollamaService.isInstalled() else {
            throw LocalAISkillAssistantError.ollamaNotInstalled
        }

        _ = try await ollamaService.ensureServerRunning(currentProcess: nil)

        let selectedModel = LocalModelCatalog.option(for: modelID)
        let installedTags = Set(ollamaService.installedModelTags())
        guard installedTags.contains(selectedModel.ollamaTag) else {
            throw LocalAISkillAssistantError.modelNotInstalled(selectedModel.displayName)
        }
    }

    private func sendChat(
        systemPrompt: String,
        userPrompt: String,
        modelID: String
    ) async throws -> String {
        var request = URLRequest(url: completionsURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer ollama", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONEncoder().encode(
            LocalAIChatCompletionRequest(
                model: modelID,
                messages: [
                    .init(role: "system", content: systemPrompt),
                    .init(role: "user", content: userPrompt)
                ],
                stream: false
            )
        )

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse,
              200..<300 ~= httpResponse.statusCode else {
            throw LocalAISkillAssistantError.requestFailed
        }

        let completion = try JSONDecoder().decode(LocalAIChatCompletionResponse.self, from: data)
        guard let content = completion.choices.first?.message.content.trimmingCharacters(in: .whitespacesAndNewlines),
              !content.isEmpty else {
            throw LocalAISkillAssistantError.emptyResponse
        }

        return content
    }
}

private struct LocalAIChatCompletionRequest: Encodable {
    struct Message: Encodable {
        let role: String
        let content: String
    }

    let model: String
    let messages: [Message]
    let stream: Bool
}

private struct LocalAIChatCompletionResponse: Decodable {
    struct Choice: Decodable {
        struct Message: Decodable {
            let role: String
            let content: String
        }

        let message: Message
    }

    let choices: [Choice]
}

enum LocalAISkillAssistantError: LocalizedError {
    case ollamaNotInstalled
    case modelNotInstalled(String)
    case requestFailed
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .ollamaNotInstalled:
            return "Local AI is not ready yet. Install Ollama and set up your local model first."
        case .modelNotInstalled(let modelName):
            return "\(modelName) is not downloaded yet. Open Settings > Models and click Set Up Local AI first."
        case .requestFailed:
            return "The local AI review request did not complete successfully."
        case .emptyResponse:
            return "Local AI returned an empty response."
        }
    }
}
