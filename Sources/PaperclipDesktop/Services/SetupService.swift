import Foundation
import PaperclipShared

struct SetupService {
    let configStore: AppConfigStore
    let keychainService: KeychainService

    func completeSetup(
        with data: SetupWizardData,
        existingConfig: AppConfig
    ) throws -> AppConfig {
        for (provider, key) in data.providerKeys where !key.isEmpty {
            guard let envKey = provider.envKey else { continue }
            try keychainService.set(key, for: envKey)
        }

        var updated = existingConfig
        switch data.modelTrack {
        case .cloudFirst:
            updated.defaultModelID = ModelCatalog.cloudRecommended.first(where: { $0.id == data.defaultModelID })?.id
                ?? ModelCatalog.cloudRecommended[0].id
            updated.localModel.useAsPrimaryModel = false

        case .localAI:
            let selectedLocalModelID = LocalModelCatalog.option(for: data.defaultModelID).id
            updated.defaultModelID = selectedLocalModelID
            updated.localModel.isEnabled = true
            updated.localModel.useAsPrimaryModel = true
            updated.localModel.selectedModelID = selectedLocalModelID
        }

        updated.onboarding = OnboardingState(
            hasCompletedSetup: true,
            initialCompanyName: data.companyName.isEmpty ? nil : data.companyName,
            initialCompanyGoal: data.companyGoal.isEmpty ? nil : data.companyGoal
        )

        try configStore.save(updated)
        return updated
    }
}
