import Foundation

public struct ModelOption: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var provider: LLMProvider
    public var displayName: String
    public var tagline: String
    public var inputCostSummary: String
    public var outputCostSummary: String

    public init(
        id: String,
        provider: LLMProvider,
        displayName: String,
        tagline: String,
        inputCostSummary: String,
        outputCostSummary: String
    ) {
        self.id = id
        self.provider = provider
        self.displayName = displayName
        self.tagline = tagline
        self.inputCostSummary = inputCostSummary
        self.outputCostSummary = outputCostSummary
    }
}

public enum ModelCatalog {
    public static let cloudRecommended: [ModelOption] = [
        ModelOption(
            id: "grok-4.1-fast",
            provider: .openRouter,
            displayName: "Grok 4.1 Fast",
            tagline: "Best value, strong tool use",
            inputCostSummary: "$0.20/M in",
            outputCostSummary: "$0.90/M out"
        ),
        ModelOption(
            id: "gemini-3.1-pro",
            provider: .google,
            displayName: "Gemini 3.1 Pro",
            tagline: "Near-Opus quality",
            inputCostSummary: "$2.00/M in",
            outputCostSummary: "$8.00/M out"
        ),
        ModelOption(
            id: "claude-sonnet-4.6",
            provider: .anthropic,
            displayName: "Claude Sonnet 4.6",
            tagline: "Proven quality",
            inputCostSummary: "$3.00/M in",
            outputCostSummary: "$15.00/M out"
        ),
        ModelOption(
            id: "deepseek-v3.2",
            provider: .openRouter,
            displayName: "DeepSeek V3.2",
            tagline: "Budget fallback",
            inputCostSummary: "$0.26/M in",
            outputCostSummary: "$1.10/M out"
        )
    ]

    public static let localGemma4: [ModelOption] = [
        ModelOption(
            id: "gemma4:e2b",
            provider: .local,
            displayName: "Gemma 4 E2B",
            tagline: "Smallest local Gemma 4, strong default for tight memory budgets",
            inputCostSummary: "Local",
            outputCostSummary: "7.2 GB download"
        ),
        ModelOption(
            id: "gemma4:e4b",
            provider: .local,
            displayName: "Gemma 4 E4B",
            tagline: "Balanced local Gemma 4, best mix of quality and footprint",
            inputCostSummary: "Local",
            outputCostSummary: "9.6 GB download"
        ),
        ModelOption(
            id: "gemma4:26b",
            provider: .local,
            displayName: "Gemma 4 26B",
            tagline: "Larger local Gemma 4 for high-memory Macs",
            inputCostSummary: "Local",
            outputCostSummary: "18 GB download"
        ),
        ModelOption(
            id: "gemma4:31b",
            provider: .local,
            displayName: "Gemma 4 31B",
            tagline: "Largest Ollama Gemma 4 variant in this app catalog",
            inputCostSummary: "Local",
            outputCostSummary: "20 GB download"
        )
    ]

    public static let recommended = cloudRecommended

    public static let all: [ModelOption] = cloudRecommended + localGemma4

    public static func option(for id: String) -> ModelOption {
        all.first(where: { $0.id == id }) ?? cloudRecommended[0]
    }
}
