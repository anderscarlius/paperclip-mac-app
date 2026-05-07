import PaperclipShared
import SwiftUI

struct CompanyStepView: View {
    @Binding var selectedTemplateID: String
    @Binding var companyName: String
    @Binding var companyGoal: String

    private var selectedTemplate: CompanyTemplate {
        CompanyTemplateCatalog.templates.first(where: { $0.id == selectedTemplateID }) ?? CompanyTemplateCatalog.soloFounder
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Create Your First Company")
                    .font(.title2.bold())

                Text("Start with a template that feels close to how you want to work. You can create more companies later.")
                    .foregroundStyle(.secondary)

                Text("Starter template")
                    .font(.headline)

                LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: 12)], spacing: 12) {
                    ForEach(CompanyTemplateCatalog.templates.filter { $0.id != CompanyTemplateCatalog.custom.id }) { template in
                        Button {
                            selectedTemplateID = template.id
                            if companyName.isEmpty {
                                companyName = template.name
                            }
                        } label: {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(template.name)
                                    .font(.headline)
                                Text(template.description)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .multilineTextAlignment(.leading)
                                Text("\(template.agents.count) starter agent\(template.agents.count == 1 ? "" : "s")")
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(template.id == selectedTemplateID ? Color.accentColor : Color.secondary)
                            }
                            .frame(maxWidth: .infinity, minHeight: 120, alignment: .topLeading)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .fill(template.id == selectedTemplateID ? Color.accentColor.opacity(0.12) : Color.secondary.opacity(0.08))
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 16, style: .continuous)
                                    .stroke(template.id == selectedTemplateID ? Color.accentColor : Color.clear, lineWidth: 2)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }

                GroupBox("What this creates") {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(selectedTemplate.name)
                            .font(.headline)
                        Text(selectedTemplate.description)
                            .foregroundStyle(.secondary)
                        Text(selectedTemplate.agents.map(\.title).joined(separator: " · "))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                VStack(alignment: .leading, spacing: 12) {
                    Text("Company name")
                        .font(.headline)
                    TextField(selectedTemplate.name, text: $companyName)
                        .textFieldStyle(.roundedBorder)

                    Text("Goal")
                        .font(.headline)
                        .padding(.top, 8)
                    TextEditor(text: $companyGoal)
                        .frame(height: 160)
                        .padding(10)
                        .background(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(.background.opacity(0.7))
                        )
                    Text("Tip: write the outcome you want, not the tooling. Example: “Ship a local-first Mac app for customer support teams.”")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(32)
            .frame(maxWidth: 760, alignment: .leading)
        }
    }
}
