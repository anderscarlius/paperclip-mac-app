import Foundation

struct LocalHardwareProfile: Equatable {
    let totalMemoryGB: Int
    let recommendedBudgetGB: Int
    let budgetOptionsGB: [Int]
    let architectureDescription: String
}

struct LocalModelRuntimeStatus: Equatable {
    let hardwareProfile: LocalHardwareProfile
    let selectedModel: LocalModelOption
    let recommendedModel: LocalModelOption
    let isOllamaInstalled: Bool
    let isOllamaServerReachable: Bool
    let installedModelTags: [String]
    let runningModels: [OllamaRunningModel]

    var selectedModelInstalled: Bool {
        installedModelTags.contains(selectedModel.ollamaTag)
    }
}

struct LocalModelPreparationResult: Equatable {
    let userMessage: String
}
