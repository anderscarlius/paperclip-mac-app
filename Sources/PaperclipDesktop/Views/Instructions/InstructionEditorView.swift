import PaperclipShared
import SwiftUI

struct InstructionEditorView: View {
    @Bindable var model: DesktopAppModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        if let session = model.instructionEditorSession {
            VStack(spacing: 0) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Agent Instructions: \(session.agent.name)")
                            .font(.title2.bold())
                        Text(session.company.name)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button("Close") {
                        dismiss()
                    }
                }
                .padding(20)

                Divider()

                HStack(spacing: 0) {
                    List(InstructionFileKind.allCases, selection: selectedKindBinding) { kind in
                        Text(kind.title)
                            .tag(kind)
                    }
                    .frame(width: 180)

                    Divider()

                    VStack(alignment: .leading, spacing: 12) {
                        TextEditor(text: documentTextBinding)
                            .font(.system(.body, design: .monospaced))
                            .scrollContentBackground(.hidden)
                            .padding(12)
                            .background(Color(nsColor: .textBackgroundColor))
                            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

                        let tokenCount = TokenCounter.approximateCount(in: documentTextBinding.wrappedValue)
                        Text("Token count: \(tokenCount) / 1200 recommended")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(20)
                }

                Divider()

                HStack {
                    Button("Reset to Template") {
                        model.resetInstruction(kind: selectedKindBinding.wrappedValue)
                    }

                    Spacer()

                    Button("Save") {
                        model.saveInstructionEditorSession()
                    }

                    Button("Save & Restart") {
                        model.saveInstructionEditorSession()
                        Task { await model.restartServer() }
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(20)
            }
            .frame(width: 960, height: 680)
        } else {
            ContentUnavailableView("No Agent Selected", systemImage: "doc.text")
        }
    }

    private var selectedKindBinding: Binding<InstructionFileKind> {
        Binding(
            get: { model.instructionEditorSession?.selectedKind ?? .soul },
            set: { newValue in
                guard var session = model.instructionEditorSession else { return }
                session.selectedKind = newValue
                model.instructionEditorSession = session
            }
        )
    }

    private var documentTextBinding: Binding<String> {
        Binding(
            get: {
                guard let session = model.instructionEditorSession else { return "" }
                return session.documents[session.selectedKind] ?? ""
            },
            set: { newValue in
                guard var session = model.instructionEditorSession else { return }
                session.documents[session.selectedKind] = newValue
                model.instructionEditorSession = session
            }
        )
    }
}
