import Foundation

struct LocalModelOption: Identifiable, Equatable {
    let id: String
    let displayName: String
    let ollamaTag: String
    let minimumBudgetGB: Int
    let recommendedMemoryGB: Int
    let downloadSizeSummary: String
    let tagline: String
}

enum LocalModelCatalog {
    static let gemma4: [LocalModelOption] = [
        LocalModelOption(
            id: "gemma4:e2b",
            displayName: "Gemma 4 E2B",
            ollamaTag: "gemma4:e2b",
            minimumBudgetGB: 8,
            recommendedMemoryGB: 10,
            downloadSizeSummary: "7.2 GB",
            tagline: "Smallest-memory Gemma 4 option"
        ),
        LocalModelOption(
            id: "gemma4:e4b",
            displayName: "Gemma 4 E4B",
            ollamaTag: "gemma4:e4b",
            minimumBudgetGB: 12,
            recommendedMemoryGB: 14,
            downloadSizeSummary: "9.6 GB",
            tagline: "Best balance between quality and size"
        ),
        LocalModelOption(
            id: "gemma4:26b",
            displayName: "Gemma 4 26B",
            ollamaTag: "gemma4:26b",
            minimumBudgetGB: 24,
            recommendedMemoryGB: 28,
            downloadSizeSummary: "18 GB",
            tagline: "Best for Macs with plenty of RAM"
        ),
        LocalModelOption(
            id: "gemma4:31b",
            displayName: "Gemma 4 31B",
            ollamaTag: "gemma4:31b",
            minimumBudgetGB: 28,
            recommendedMemoryGB: 32,
            downloadSizeSummary: "20 GB",
            tagline: "Largest Gemma 4 variant in this app"
        )
    ]

    static func option(for id: String) -> LocalModelOption {
        gemma4.first(where: { $0.id == id }) ?? gemma4[1]
    }

    static func supportedOptions(forMemoryBudgetGB budgetGB: Int) -> [LocalModelOption] {
        let options = gemma4.filter { $0.minimumBudgetGB <= budgetGB }
        return options.isEmpty ? [gemma4[0]] : options
    }

    static func recommendedOption(forMemoryBudgetGB budgetGB: Int) -> LocalModelOption {
        supportedOptions(forMemoryBudgetGB: budgetGB).last ?? gemma4[0]
    }
}
