import Foundation
import SwiftUI

public enum ThemePreference: String, Codable, CaseIterable, Identifiable, Sendable {
    case system
    case light
    case dark

    public var id: String { rawValue }
    public var title: String {
        switch self {
        case .system: "System"
        case .light: "Light"
        case .dark: "Dark"
        }
    }

    public var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

public enum LocalModelEngine: String, Codable, CaseIterable, Identifiable, Sendable {
    case ollama

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .ollama: "Ollama"
        }
    }
}

public struct LocalModelConfig: Codable, Equatable, Sendable {
    public var isEnabled: Bool
    public var engine: LocalModelEngine
    public var selectedModelID: String
    public var memoryBudgetGB: Int
    public var autoDownload: Bool
    public var useAsPrimaryModel: Bool
    public var autoStopOllamaWhenIdle: Bool
    public var ollamaIdleShutdownMinutes: Int

    public init(
        isEnabled: Bool = false,
        engine: LocalModelEngine = .ollama,
        selectedModelID: String = "gemma4:e4b",
        memoryBudgetGB: Int = 12,
        autoDownload: Bool = true,
        useAsPrimaryModel: Bool = false,
        autoStopOllamaWhenIdle: Bool = true,
        ollamaIdleShutdownMinutes: Int = 10
    ) {
        self.isEnabled = isEnabled
        self.engine = engine
        self.selectedModelID = selectedModelID
        self.memoryBudgetGB = memoryBudgetGB
        self.autoDownload = autoDownload
        self.useAsPrimaryModel = useAsPrimaryModel
        self.autoStopOllamaWhenIdle = autoStopOllamaWhenIdle
        self.ollamaIdleShutdownMinutes = ollamaIdleShutdownMinutes
    }
}

public enum RoleKind: String, Codable, CaseIterable, Identifiable, Sendable {
    case ceo
    case coo
    case cto
    case cmo
    case engineer
    case qa
    case designer
    case researcher
    case general

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .ceo: "CEO"
        case .coo: "COO"
        case .cto: "CTO"
        case .cmo: "CMO"
        case .engineer: "Engineer"
        case .qa: "QA"
        case .designer: "Designer"
        case .researcher: "Researcher"
        case .general: "Generalist"
        }
    }
}

public enum InstructionLanguage: String, Codable, CaseIterable, Identifiable, Sendable {
    case swedish
    case english

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .swedish: "Swedish"
        case .english: "English"
        }
    }
}

public struct OnboardingState: Codable, Equatable, Sendable {
    public var hasCompletedSetup: Bool
    public var initialCompanyName: String?
    public var initialCompanyGoal: String?

    public init(
        hasCompletedSetup: Bool = false,
        initialCompanyName: String? = nil,
        initialCompanyGoal: String? = nil
    ) {
        self.hasCompletedSetup = hasCompletedSetup
        self.initialCompanyName = initialCompanyName
        self.initialCompanyGoal = initialCompanyGoal
    }
}

public struct AppConfig: Codable, Equatable, Sendable {
    public var port: Int
    public var launchAtLogin: Bool
    public var themePreference: ThemePreference
    public var defaultModelID: String
    public var remoteAccessEnabled: Bool
    public var authSecret: String
    public var onboarding: OnboardingState
    public var localModel: LocalModelConfig

    public init(
        port: Int = 3100,
        launchAtLogin: Bool = true,
        themePreference: ThemePreference = .system,
        defaultModelID: String = "grok-4.1-fast",
        remoteAccessEnabled: Bool = false,
        authSecret: String = UUID().uuidString.replacingOccurrences(of: "-", with: ""),
        onboarding: OnboardingState = .init(),
        localModel: LocalModelConfig = .init()
    ) {
        self.port = port
        self.launchAtLogin = launchAtLogin
        self.themePreference = themePreference
        self.defaultModelID = defaultModelID
        self.remoteAccessEnabled = remoteAccessEnabled
        self.authSecret = authSecret
        self.onboarding = onboarding
        self.localModel = localModel
    }

    public static let `default` = AppConfig()

    enum CodingKeys: String, CodingKey {
        case port
        case launchAtLogin
        case themePreference
        case defaultModelID
        case remoteAccessEnabled
        case authSecret
        case onboarding
        case localModel
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        port = try container.decodeIfPresent(Int.self, forKey: .port) ?? 3100
        launchAtLogin = try container.decodeIfPresent(Bool.self, forKey: .launchAtLogin) ?? true
        themePreference = try container.decodeIfPresent(ThemePreference.self, forKey: .themePreference) ?? .system
        defaultModelID = try container.decodeIfPresent(String.self, forKey: .defaultModelID) ?? "grok-4.1-fast"
        remoteAccessEnabled = try container.decodeIfPresent(Bool.self, forKey: .remoteAccessEnabled) ?? false
        authSecret = try container.decodeIfPresent(String.self, forKey: .authSecret) ?? UUID().uuidString.replacingOccurrences(of: "-", with: "")
        onboarding = try container.decodeIfPresent(OnboardingState.self, forKey: .onboarding) ?? .init()
        localModel = try container.decodeIfPresent(LocalModelConfig.self, forKey: .localModel) ?? .init()
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(port, forKey: .port)
        try container.encode(launchAtLogin, forKey: .launchAtLogin)
        try container.encode(themePreference, forKey: .themePreference)
        try container.encode(defaultModelID, forKey: .defaultModelID)
        try container.encode(remoteAccessEnabled, forKey: .remoteAccessEnabled)
        try container.encode(authSecret, forKey: .authSecret)
        try container.encode(onboarding, forKey: .onboarding)
        try container.encode(localModel, forKey: .localModel)
    }
}
