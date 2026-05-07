import Foundation
import PaperclipShared

struct LocalModelService {
    private let ollamaService = OllamaService()

    func runtimeStatus(
        config: LocalModelConfig,
        selectedModelID: String,
        ollamaStatus: OllamaServerStatus?
    ) -> LocalModelRuntimeStatus {
        let hardware = detectHardwareProfile()
        let selectedModel = LocalModelCatalog.option(for: selectedModelID)
        let recommendedModel = LocalModelCatalog.recommendedOption(forMemoryBudgetGB: config.memoryBudgetGB)
        let installedTags = ollamaService.installedModelTags()

        return LocalModelRuntimeStatus(
            hardwareProfile: hardware,
            selectedModel: selectedModel,
            recommendedModel: recommendedModel,
            isOllamaInstalled: ollamaService.isInstalled(),
            isOllamaServerReachable: ollamaStatus?.isReachable == true,
            installedModelTags: installedTags,
            runningModels: ollamaStatus?.runningModels ?? []
        )
    }

    func detectHardwareProfile() -> LocalHardwareProfile {
        let totalMemoryGB = max(8, Int(ProcessInfo.processInfo.physicalMemory / 1_073_741_824))
        let recommendedBudgetGB = max(8, min(totalMemoryGB - 4, 16))
        let candidateBudgets = [8, 12, 16, 24, 32, 48, 64, 96]
        let availableBudgets = candidateBudgets.filter { $0 <= max(8, totalMemoryGB - 2) }
        #if arch(arm64)
        let architectureDescription = "Apple Silicon"
        #else
        let architectureDescription = "Intel"
        #endif

        return LocalHardwareProfile(
            totalMemoryGB: totalMemoryGB,
            recommendedBudgetGB: availableBudgets.contains(recommendedBudgetGB) ? recommendedBudgetGB : (availableBudgets.last ?? 8),
            budgetOptionsGB: availableBudgets.isEmpty ? [8] : availableBudgets,
            architectureDescription: architectureDescription
        )
    }
}
