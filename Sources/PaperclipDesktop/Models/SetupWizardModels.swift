import Foundation
import PaperclipShared

enum InstructionProvisionMode: String, CaseIterable, Identifiable {
    case template
    case custom
    case skip

    var id: String { rawValue }

    var title: String {
        switch self {
        case .template: "Use Template Instructions"
        case .custom: "Write Custom Instructions Now"
        case .skip: "Skip For Now"
        }
    }
}

enum OnboardingModelTrack: String, CaseIterable, Identifiable {
    case cloudFirst
    case localAI

    var id: String { rawValue }
}

struct SetupWizardData {
    var providerKeys: [LLMProvider: String]
    var defaultModelID: String
    var modelTrack: OnboardingModelTrack
    var companyTemplateID: String
    var companyName: String
    var companyGoal: String
}

enum SetupVerificationPhase: String, Equatable {
    case idle
    case creatingCompany
    case startingServer
    case preparingRuntime
    case creatingIssue
    case waitingForRun
    case startingOllama
    case loadingModel
    case waitingForFirstOutput
    case writing
    case completed
    case failed

    var title: String {
        switch self {
        case .idle:
            "Idle"
        case .creatingCompany:
            "Creating company"
        case .startingServer:
            "Starting Paperclip server"
        case .preparingRuntime:
            "Preparing agent runtime"
        case .creatingIssue:
            "Creating first test issue"
        case .waitingForRun:
            "Waiting for run"
        case .startingOllama:
            "Starting Ollama"
        case .loadingModel:
            "Loading model"
        case .waitingForFirstOutput:
            "Waiting for first output"
        case .writing:
            "Writing"
        case .completed:
            "Completed"
        case .failed:
            "Failed"
        }
    }

    var systemImage: String {
        switch self {
        case .idle:
            "pause.circle"
        case .creatingCompany:
            "building.2"
        case .startingServer:
            "server.rack"
        case .preparingRuntime:
            "gearshape.2"
        case .creatingIssue:
            "checklist"
        case .waitingForRun:
            "clock.arrow.circlepath"
        case .startingOllama:
            "cpu"
        case .loadingModel:
            "hourglass"
        case .waitingForFirstOutput:
            "clock"
        case .writing:
            "pencil.and.outline"
        case .completed:
            "checkmark.circle"
        case .failed:
            "xmark.octagon"
        }
    }
}

struct SetupVerificationState {
    var attemptCount = 0
    var phase: SetupVerificationPhase = .idle
    var detail = "Ready to run the first verification."
    var companyID: String?
    var companyName: String?
    var agentID: String?
    var agentName: String?
    var issueID: String?
    var issueTitle: String?
    var runID: String?
    var diagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic?
    var startedAt: Date?
    var completedAt: Date?
    var errorMessage: String?

    var isRunning: Bool {
        !isTerminal && phase != .idle
    }

    var isTerminal: Bool {
        phase == .completed || phase == .failed
    }
}

struct CompanyWizardDraft {
    var name: String
    var goal: String
    var template: CompanyTemplate
    var agents: [CompanyTemplateAgent]
    var instructionMode: InstructionProvisionMode
    var language: InstructionLanguage
    var defaultModelID: String
}

struct InstructionEditorSession: Identifiable {
    let id = UUID()
    var company: Company
    var agent: Agent
    var documents: [InstructionFileKind: String]
    var selectedKind: InstructionFileKind = .soul
}
