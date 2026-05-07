import Foundation

public enum InstructionFileKind: String, Codable, CaseIterable, Identifiable, Sendable {
    case soul = "SOUL.md"
    case agents = "AGENTS.md"
    case heartbeat = "HEARTBEAT.md"
    case tools = "TOOLS.md"
    case memory = "MEMORY.md"
    case user = "USER.md"

    public var id: String { rawValue }

    public var title: String {
        rawValue.replacingOccurrences(of: ".md", with: "")
    }
}

public struct InstructionTemplateSet: Codable, Hashable, Sendable {
    public var files: [InstructionFileKind: String]

    public init(files: [InstructionFileKind: String]) {
        self.files = files
    }

    public func text(for kind: InstructionFileKind) -> String {
        files[kind] ?? ""
    }

    public static let blank = InstructionTemplateSet(files: [:])
}

public struct CompanyTemplateAgent: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var role: RoleKind
    public var title: String
    public var icon: String
    public var reportsTo: String?
    public var defaultModelID: String
    public var capabilities: String
    public var heartbeatIntervalSec: Int
    public var monthlyBudget: Double
    public var instructions: InstructionTemplateSet

    public init(
        id: String,
        role: RoleKind,
        title: String,
        icon: String,
        reportsTo: String?,
        defaultModelID: String,
        capabilities: String,
        heartbeatIntervalSec: Int,
        monthlyBudget: Double,
        instructions: InstructionTemplateSet
    ) {
        self.id = id
        self.role = role
        self.title = title
        self.icon = icon
        self.reportsTo = reportsTo
        self.defaultModelID = defaultModelID
        self.capabilities = capabilities
        self.heartbeatIntervalSec = heartbeatIntervalSec
        self.monthlyBudget = monthlyBudget
        self.instructions = instructions
    }
}

public struct CompanyTemplate: Identifiable, Codable, Hashable, Sendable {
    public var id: String
    public var name: String
    public var description: String
    public var agents: [CompanyTemplateAgent]

    public init(id: String, name: String, description: String, agents: [CompanyTemplateAgent]) {
        self.id = id
        self.name = name
        self.description = description
        self.agents = agents
    }
}

public enum CompanyTemplateCatalog {
    public static let templates: [CompanyTemplate] = [
        soloFounder,
        softwareCompany,
        marketingAgency,
        researchLab,
        personalAssistant,
        custom
    ]

    public static let soloFounder = CompanyTemplate(
        id: "solo-founder",
        name: "Solo Founder",
        description: "A lean one-person setup for planning, writing, shipping, and decision support.",
        agents: [
            CompanyTemplateAgent(
                id: "founder",
                role: .ceo,
                title: "Founder",
                icon: "person.crop.circle.badge.star",
                reportsTo: nil,
                defaultModelID: "grok-4.1-fast",
                capabilities: "Planning, prioritization, writing, and founder support",
                heartbeatIntervalSec: 1800,
                monthlyBudget: 40,
                instructions: .swedishExecutive(roleTitle: "Founder")
            )
        ]
    )

    public static let softwareCompany = CompanyTemplate(
        id: "software-company",
        name: "Local Coding Squad",
        description: "A product-minded coding team for planning, implementation, QA, and local development work.",
        agents: [
            CompanyTemplateAgent(
                id: "ceo",
                role: .ceo,
                title: "CEO",
                icon: "crown.fill",
                reportsTo: nil,
                defaultModelID: "grok-4.1-fast",
                capabilities: "Strategic leadership, delegation, hiring",
                heartbeatIntervalSec: 3600,
                monthlyBudget: 50,
                instructions: .swedishExecutive(roleTitle: "CEO")
            ),
            CompanyTemplateAgent(
                id: "cto",
                role: .cto,
                title: "CTO",
                icon: "laptopcomputer",
                reportsTo: "ceo",
                defaultModelID: "grok-4.1-fast",
                capabilities: "Technical architecture, code quality, delegation",
                heartbeatIntervalSec: 3600,
                monthlyBudget: 50,
                instructions: .swedishTechnicalLead(roleTitle: "CTO")
            ),
            CompanyTemplateAgent(
                id: "backend-dev",
                role: .engineer,
                title: "Backend Developer",
                icon: "bolt.fill",
                reportsTo: "cto",
                defaultModelID: "grok-4.1-fast",
                capabilities: "Backend implementation, APIs, database",
                heartbeatIntervalSec: 1800,
                monthlyBudget: 80,
                instructions: .swedishEngineer(roleTitle: "Backend Developer")
            ),
            CompanyTemplateAgent(
                id: "frontend-dev",
                role: .engineer,
                title: "Frontend Developer",
                icon: "paintbrush.fill",
                reportsTo: "cto",
                defaultModelID: "grok-4.1-fast",
                capabilities: "Frontend UI, components, responsive design",
                heartbeatIntervalSec: 1800,
                monthlyBudget: 60,
                instructions: .swedishEngineer(roleTitle: "Frontend Developer")
            ),
            CompanyTemplateAgent(
                id: "qa-engineer",
                role: .qa,
                title: "QA Engineer",
                icon: "checkmark.shield.fill",
                reportsTo: "cto",
                defaultModelID: "grok-4.1-fast",
                capabilities: "Testing, bug reports, quality assurance",
                heartbeatIntervalSec: 1800,
                monthlyBudget: 40,
                instructions: .swedishQA
            )
        ]
    )

    public static let marketingAgency = CompanyTemplate(
        id: "marketing-agency",
        name: "Marketing Team",
        description: "A content and growth team for campaigns, messaging, briefs, and launch support.",
        agents: [
            CompanyTemplateAgent(id: "ceo", role: .ceo, title: "CEO", icon: "crown.fill", reportsTo: nil, defaultModelID: "grok-4.1-fast", capabilities: "Strategy, growth, prioritization", heartbeatIntervalSec: 3600, monthlyBudget: 50, instructions: .swedishExecutive(roleTitle: "CEO")),
            CompanyTemplateAgent(id: "cmo", role: .cmo, title: "CMO", icon: "chart.bar.fill", reportsTo: "ceo", defaultModelID: "grok-4.1-fast", capabilities: "Campaign strategy, messaging", heartbeatIntervalSec: 3600, monthlyBudget: 50, instructions: .swedishGeneral(roleTitle: "CMO")),
            CompanyTemplateAgent(id: "content-writer", role: .general, title: "Content Writer", icon: "doc.text.fill", reportsTo: "cmo", defaultModelID: "grok-4.1-fast", capabilities: "Long-form writing and briefs", heartbeatIntervalSec: 1800, monthlyBudget: 45, instructions: .swedishGeneral(roleTitle: "Content Writer")),
            CompanyTemplateAgent(id: "ux-designer", role: .designer, title: "UX Designer", icon: "paintbrush.fill", reportsTo: "cmo", defaultModelID: "grok-4.1-fast", capabilities: "Creative direction, design feedback", heartbeatIntervalSec: 1800, monthlyBudget: 45, instructions: .swedishGeneral(roleTitle: "UX Designer"))
        ]
    )

    public static let researchLab = CompanyTemplate(
        id: "research-lab",
        name: "Research Team",
        description: "A research-focused team for analysis, evidence gathering, synthesis, and reporting.",
        agents: [
            CompanyTemplateAgent(id: "lead-researcher", role: .ceo, title: "Lead Researcher", icon: "crown.fill", reportsTo: nil, defaultModelID: "grok-4.1-fast", capabilities: "Research direction and delegation", heartbeatIntervalSec: 3600, monthlyBudget: 60, instructions: .swedishGeneral(roleTitle: "Lead Researcher")),
            CompanyTemplateAgent(id: "analyst-1", role: .researcher, title: "Research Analyst", icon: "magnifyingglass", reportsTo: "lead-researcher", defaultModelID: "grok-4.1-fast", capabilities: "Analysis and evidence gathering", heartbeatIntervalSec: 1800, monthlyBudget: 50, instructions: .swedishGeneral(roleTitle: "Research Analyst")),
            CompanyTemplateAgent(id: "analyst-2", role: .researcher, title: "Data Analyst", icon: "chart.bar.xaxis", reportsTo: "lead-researcher", defaultModelID: "grok-4.1-fast", capabilities: "Data synthesis and metrics", heartbeatIntervalSec: 1800, monthlyBudget: 50, instructions: .swedishGeneral(roleTitle: "Data Analyst")),
            CompanyTemplateAgent(id: "writer", role: .general, title: "Technical Writer", icon: "doc.plaintext", reportsTo: "lead-researcher", defaultModelID: "grok-4.1-fast", capabilities: "Reports and summaries", heartbeatIntervalSec: 1800, monthlyBudget: 40, instructions: .swedishGeneral(roleTitle: "Technical Writer"))
        ]
    )

    public static let custom = CompanyTemplate(
        id: "custom",
        name: "Custom",
        description: "Start blank and define the organization yourself.",
        agents: [
            CompanyTemplateAgent(
                id: "ceo",
                role: .ceo,
                title: "CEO",
                icon: "crown.fill",
                reportsTo: nil,
                defaultModelID: "grok-4.1-fast",
                capabilities: "Leadership and delegation",
                heartbeatIntervalSec: 3600,
                monthlyBudget: 50,
                instructions: .swedishExecutive(roleTitle: "CEO")
            )
        ]
    )

    public static let personalAssistant = CompanyTemplate(
        id: "personal-assistant",
        name: "Personal Assistant",
        description: "A single assistant for notes, planning, reminders, research briefs, and personal workflow support.",
        agents: [
            CompanyTemplateAgent(
                id: "assistant",
                role: .general,
                title: "Assistant",
                icon: "sparkles",
                reportsTo: nil,
                defaultModelID: "grok-4.1-fast",
                capabilities: "Planning, writing, research briefs, summaries, and reminders",
                heartbeatIntervalSec: 1800,
                monthlyBudget: 30,
                instructions: .swedishGeneral(roleTitle: "Personal Assistant")
            )
        ]
    )
}

private extension InstructionTemplateSet {
    static func swedishExecutive(roleTitle: String) -> InstructionTemplateSet {
        InstructionTemplateSet(
            files: [
                .soul: "# SOUL.md\n\nYou are \(roleTitle). Core values: clarity, delegation, measurable goals, and cost awareness.",
                .agents: """
                # AGENTS.md

                ROLE: Strategic leadership and fast, direct board replies.

                Primary behavior:
                - For simple board questions, answer directly in 1-3 sentences.
                - For work that should be done by a specialist, delegate it.
                - Do not spend time writing long internal process notes unless they help move the task forward.
                - Do not use planning tools, repo exploration, or skill-execution attempts for simple questions.
                - Do not turn short questions into a multi-step workflow.
                - If the title or latest comment already contains the answerable question, answer it immediately.

                Delegation guide:
                - Technical work -> CTO
                - Marketing or content work -> CMO
                - Design work -> UX or design lead

                Rule:
                - Be brief.
                - Move work forward.
                - If a direct answer is clearly more useful than a delegation essay, give the direct answer first.
                - For simple math, counting, wording, or comparison questions: reply with the answer and stop.
                """,
                .heartbeat: "# HEARTBEAT.md\n\nEvery 60 minutes: review the inbox, make priority calls, and delegate only the work that truly needs a specialist.\nEvery 24 hours: write a short status summary.",
                .tools: "# TOOLS.md\n\n- Paperclip API\n- Issues and delegation\n- Hiring requests\n\nUse tools only when they help unblock work quickly.",
                .memory: "# MEMORY.md\n\nSave only important decisions, budget rules, and ongoing strategic initiatives. Skip memory work for simple one-off replies.",
                .user: "# USER.md\n\nWhen you need help from the user, ask short and clear questions with a recommendation. Default to concise direct answers."
            ]
        )
    }

    static func swedishTechnicalLead(roleTitle: String) -> InstructionTemplateSet {
        InstructionTemplateSet(
            files: [
                .soul: "# SOUL.md\n\nYou are \(roleTitle). Core values: code quality, security, and scalability.",
                .agents: "# AGENTS.md\n\nROLE: Technical decisions and delegation to engineers.\nRestriction: avoid writing production code when a specialist can do it better.",
                .heartbeat: "# HEARTBEAT.md\n\nEvery 60 minutes: prioritize technical work.\nEvery 24 hours: summarize architecture and quality risks.",
                .tools: "# TOOLS.md\n\n- Paperclip API\n- Git for reading and code review",
                .memory: "# MEMORY.md\n\nPreserve important design decisions, risks, and technical tradeoffs.",
                .user: "# USER.md\n\nEscalate technical decisions only when they clearly affect scope, cost, or risk."
            ]
        )
    }

    static func swedishEngineer(roleTitle: String) -> InstructionTemplateSet {
        InstructionTemplateSet(
            files: [
                .soul: "# SOUL.md\n\nYou are \(roleTitle). Core values: quality, clarity, and safe delivery.",
                .agents: "# AGENTS.md\n\nROLE: Implement, test, and document clearly.\nFocus on one task at a time.",
                .heartbeat: "# HEARTBEAT.md\n\nEvery 30 minutes: continue with the highest-priority task and report blockers early.",
                .tools: "# TOOLS.md\n\n- Paperclip API\n- Code tools and tests",
                .memory: "# MEMORY.md\n\nSave implementation notes, testing gaps, and follow-up items.",
                .user: "# USER.md\n\nBe short, concrete, and clear about what is complete and what remains."
            ]
        )
    }

    static let swedishQA = InstructionTemplateSet(
        files: [
            .soul: "# SOUL.md\n\nYou are a QA Engineer. Core values: reproducibility, risk focus, and clear reporting.",
            .agents: "# AGENTS.md\n\nROLE: Test, verify, and write clear bug reports.",
            .heartbeat: "# HEARTBEAT.md\n\nEvery 30 minutes: verify current deliveries and log risks.",
            .tools: "# TOOLS.md\n\n- Paperclip API\n- Test tools\n- Issue tracking",
            .memory: "# MEMORY.md\n\nSave recurring failure patterns and regressions.",
            .user: "# USER.md\n\nReport risk level, reproduction steps, and the recommended next action."
        ]
    )

    static func swedishGeneral(roleTitle: String) -> InstructionTemplateSet {
        InstructionTemplateSet(
            files: [
                .soul: "# SOUL.md\n\nYou are \(roleTitle). Work in a structured and clear way, with focus on the final outcome.",
                .agents: "# AGENTS.md\n\nROLE: Take ownership of your area and communicate briefly and clearly.",
                .heartbeat: "# HEARTBEAT.md\n\nEvery 30-60 minutes: continue the highest-priority task and report status.",
                .tools: "# TOOLS.md\n\n- Paperclip API\n- Relevant work tools",
                .memory: "# MEMORY.md\n\nSave important context, assumptions, and follow-up points.",
                .user: "# USER.md\n\nEscalate only when a decision affects goals, budget, or direction."
            ]
        )
    }
}
