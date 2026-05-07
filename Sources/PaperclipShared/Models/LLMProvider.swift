import Foundation

public enum LLMProvider: String, Codable, CaseIterable, Identifiable, Sendable {
    case openRouter
    case anthropic
    case openAI
    case google
    case local

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .openRouter: "OpenRouter"
        case .anthropic: "Anthropic"
        case .openAI: "OpenAI"
        case .google: "Google"
        case .local: "Local"
        }
    }

    public var envKey: String? {
        switch self {
        case .openRouter: "OPENROUTER_API_KEY"
        case .anthropic: "ANTHROPIC_API_KEY"
        case .openAI: "OPENAI_API_KEY"
        case .google: "GOOGLE_API_KEY"
        case .local: nil
        }
    }

    public var placeholder: String {
        switch self {
        case .openRouter: "sk-or-v1-..."
        case .anthropic: "sk-ant-..."
        case .openAI: "sk-proj-..."
        case .google: "AIza..."
        case .local: ""
        }
    }

    public static var credentialProviders: [LLMProvider] {
        [.openRouter, .anthropic, .openAI, .google]
    }
}
