import PaperclipShared
import SwiftUI

struct NewCompanyWizardView: View {
    let defaultModelID: String
    let onCreate: (CompanyWizardDraft) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var step = 0
    @State private var companyName = ""
    @State private var companyGoal = ""
    @State private var selectedTemplateID = CompanyTemplateCatalog.soloFounder.id
    @State private var agents = CompanyTemplateCatalog.soloFounder.agents
    @State private var instructionMode: InstructionProvisionMode = .template
    @State private var language: InstructionLanguage = .english

    var selectedTemplate: CompanyTemplate {
        CompanyTemplateCatalog.templates.first(where: { $0.id == selectedTemplateID }) ?? CompanyTemplateCatalog.softwareCompany
    }

    var body: some View {
        VStack(spacing: 0) {
            Text("New Company Wizard")
                .font(.title.bold())
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(24)

            Divider()

            Group {
                switch step {
                case 0:
                    detailsStep
                case 1:
                    OrgChartEditorView(agents: $agents)
                case 2:
                    InstructionStepView(instructionMode: $instructionMode, language: $language)
                default:
                    ReviewStepView(
                        name: companyName,
                        goal: companyGoal,
                        agents: agents,
                        defaultModelID: defaultModelID
                    )
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            Divider()

            HStack {
                Button("Cancel", role: .cancel) {
                    dismiss()
                }

                Spacer()

                Button("Back") {
                    step = max(0, step - 1)
                }
                .disabled(step == 0)

                if step < 3 {
                    Button("Next") {
                        step += 1
                    }
                    .buttonStyle(.borderedProminent)
                } else {
                    Button("Create Company") {
                        onCreate(
                            CompanyWizardDraft(
                                name: companyName.isEmpty ? "Untitled Company" : companyName,
                                goal: companyGoal,
                                template: selectedTemplate,
                                agents: agents,
                                instructionMode: instructionMode,
                                language: language,
                                defaultModelID: defaultModelID
                            )
                        )
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .padding(20)
        }
        .frame(width: 840, height: 640)
        .onChange(of: selectedTemplateID) { _, newValue in
            let template = CompanyTemplateCatalog.templates.first(where: { $0.id == newValue }) ?? CompanyTemplateCatalog.softwareCompany
            agents = template.agents
        }
    }

    private var detailsStep: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Text("Step 1 of 4: Company Details")
                    .font(.title2.bold())

                TextField("Company name", text: $companyName)
                    .textFieldStyle(.roundedBorder)

                TextEditor(text: $companyGoal)
                    .frame(height: 120)
                    .padding(10)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(.background)
                    )

                Text("Template")
                    .font(.headline)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 12)], spacing: 12) {
                    ForEach(CompanyTemplateCatalog.templates) { template in
                        Button {
                            selectedTemplateID = template.id
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(template.name)
                                    .font(.headline)
                                Text(template.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.leading)
                            }
                            .frame(maxWidth: .infinity, minHeight: 110, alignment: .topLeading)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 18, style: .continuous)
                                    .fill(template.id == selectedTemplateID ? Color.accentColor.opacity(0.14) : Color.secondary.opacity(0.08))
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(24)
        }
    }
}
