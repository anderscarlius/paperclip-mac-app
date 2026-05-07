import PaperclipShared
import SwiftUI

struct InstructionStepView: View {
    @Binding var instructionMode: InstructionProvisionMode
    @Binding var language: InstructionLanguage

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Text("Step 3 of 4: Agent Instructions")
                .font(.title2.bold())

            ForEach(InstructionProvisionMode.allCases) { mode in
                Button {
                    instructionMode = mode
                } label: {
                    HStack(spacing: 14) {
                        Image(systemName: instructionMode == mode ? "largecircle.fill.circle" : "circle")
                        VStack(alignment: .leading, spacing: 4) {
                            Text(mode.title)
                            Text(description(for: mode))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(instructionMode == mode ? Color.accentColor.opacity(0.12) : Color.secondary.opacity(0.08))
                    )
                }
                .buttonStyle(.plain)
            }

            Picker("Instruction language", selection: $language) {
                ForEach(InstructionLanguage.allCases) { language in
                    Text(language.title).tag(language)
                }
            }

            Spacer()
        }
        .padding(24)
    }

    private func description(for mode: InstructionProvisionMode) -> String {
        switch mode {
        case .template:
            "Pre-written role templates that you can edit later."
        case .custom:
            "Reserved for a guided per-agent editor pass next."
        case .skip:
            "Create the company now and leave instructions blank."
        }
    }
}
