import AppKit
import SwiftUI

struct HelpSettingsView: View {
    @State private var selectedDocumentID: BundledHelpDocument.ID = BundledHelpDocument.all.first?.id ?? "quickstart"

    private var selectedDocument: BundledHelpDocument? {
        BundledHelpDocument.all.first(where: { $0.id == selectedDocumentID }) ?? BundledHelpDocument.all.first
    }

    var body: some View {
        Form {
            Section("Where Your Files Live") {
                GroupBox("Company Workspace") {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(DesktopPaths.workspaceRoot.path)
                            .font(.system(.caption, design: .monospaced))
                            .textSelection(.enabled)

                        Text("This is the normal Finder-visible workspace for company folders, agent instructions, and the files you want to add yourself.")
                            .foregroundStyle(.secondary)

                        Text("Each company gets a Files folder here:")
                            .foregroundStyle(.secondary)

                        Text("~/Documents/Paperclip Desktop/Companies/<company>/Files/")
                            .font(.system(.caption, design: .monospaced))
                            .textSelection(.enabled)

                        Button("Open Workspace in Finder") {
                            NSWorkspace.shared.activateFileViewerSelecting([DesktopPaths.workspaceRoot])
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                GroupBox("Private App Data") {
                    VStack(alignment: .leading, spacing: 10) {
                        Text(DesktopPaths.root.path)
                            .font(.system(.caption, design: .monospaced))
                            .textSelection(.enabled)

                        Text("This is where Paperclip Desktop keeps its private runtime files, logs, server install, and internal state.")
                            .foregroundStyle(.secondary)

                        Text("Most people only need this location for troubleshooting.")
                            .foregroundStyle(.secondary)

                        Button("Open Application Support in Finder") {
                            NSWorkspace.shared.activateFileViewerSelecting([DesktopPaths.root])
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }

                GroupBox("Simple Rule of Thumb") {
                    Text("If you want to browse, add, remove, or organize files yourself, use the Documents workspace. If you are checking logs or app internals, use Application Support.")
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            Section("Quick Start and How To") {
                Text("Choose a guide below. Quick Start gets you from first launch to a running dashboard. How To covers the everyday tasks most people need after setup.")
                    .foregroundStyle(.secondary)

                Picker("Guide", selection: $selectedDocumentID) {
                    ForEach(BundledHelpDocument.all) { document in
                        Text(document.title).tag(document.id)
                    }
                }
                .pickerStyle(.segmented)

                if let selectedDocument {
                    VStack(alignment: .leading, spacing: 12) {
                        Text(selectedDocument.title)
                            .font(.headline)

                        Text(selectedDocument.summary)
                            .foregroundStyle(.secondary)

                        ScrollView {
                            VStack(alignment: .leading, spacing: 18) {
                                ForEach(Array(selectedDocument.sections.enumerated()), id: \.offset) { _, section in
                                    VStack(alignment: .leading, spacing: 12) {
                                        Text(section.title)
                                            .font(.headline)

                                        ForEach(Array(section.blocks.enumerated()), id: \.offset) { blockIndex, block in
                                            blockView(block, index: blockIndex)
                                        }
                                    }
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(16)
                                    .background {
                                        RoundedRectangle(cornerRadius: 12)
                                            .fill(.background.opacity(0.65))
                                    }
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .textSelection(.enabled)
                            .padding(14)
                        }
                        .frame(minHeight: 320)
                        .background {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(.quaternary.opacity(0.35))
                        }
                    }
                }
            }
        }
        .formStyle(.grouped)
    }

    @ViewBuilder
    private func blockView(_ block: HelpDocumentBlock, index: Int) -> some View {
        switch block {
        case .paragraph(let text):
            Text(inlineMarkdown(text))
                .frame(maxWidth: .infinity, alignment: .leading)

        case .bullets(let items):
            VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top, spacing: 10) {
                        Text("•")
                            .foregroundStyle(.secondary)
                        Text(inlineMarkdown(item))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }

        case .steps(let items):
            VStack(alignment: .leading, spacing: 8) {
                ForEach(Array(items.enumerated()), id: \.offset) { stepIndex, item in
                    HStack(alignment: .top, spacing: 10) {
                        Text("\(stepIndex + 1).")
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                        Text(inlineMarkdown(item))
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }

        case .code(let text):
            Text(text)
                .font(.system(.caption, design: .monospaced))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(.quaternary.opacity(0.35))
                }
        }
    }

    private func inlineMarkdown(_ text: String) -> AttributedString {
        if let parsed = try? AttributedString(
            markdown: text,
            options: AttributedString.MarkdownParsingOptions(interpretedSyntax: .full)
        ) {
            return parsed
        }

        return AttributedString(text)
    }
}
