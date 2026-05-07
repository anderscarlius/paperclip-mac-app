import Foundation

struct HelpDocumentSection: Hashable {
    let title: String
    let blocks: [HelpDocumentBlock]
}

enum HelpDocumentBlock: Hashable {
    case paragraph(String)
    case bullets([String])
    case steps([String])
    case code(String)
}

struct BundledHelpDocument: Identifiable, Hashable {
    let id: String
    let title: String
    let summary: String
    let bundledFileName: String

    var bundledText: String {
        guard let url = bundledFileURL(),
              let text = try? String(contentsOf: url, encoding: .utf8) else {
            return "Could not read the bundled help document for \(title)."
        }

        return text
    }

    var sections: [HelpDocumentSection] {
        HelpDocumentParser.parse(bundledText)
    }

    private func bundledFileURL() -> URL? {
        let bundle = Bundle.module
        return bundle.url(forResource: bundledFileName, withExtension: "md")
            ?? bundle.url(forResource: bundledFileName, withExtension: "md", subdirectory: "Help")
    }

    static let all: [BundledHelpDocument] = [
        BundledHelpDocument(
            id: "quickstart",
            title: "Quick Start",
            summary: "The fastest path from first launch to a running Paperclip dashboard.",
            bundledFileName: "QUICKSTART"
        ),
        BundledHelpDocument(
            id: "howto",
            title: "How To",
            summary: "Everyday tasks like files, local AI, server controls, and updates.",
            bundledFileName: "HOWTO"
        )
    ]
}

private enum HelpDocumentParser {
    static func parse(_ text: String) -> [HelpDocumentSection] {
        let lines = text.components(separatedBy: .newlines)

        var sections: [HelpDocumentSection] = []
        var currentTitle: String?
        var currentBlocks: [HelpDocumentBlock] = []

        var paragraphLines: [String] = []
        var bulletItems: [String] = []
        var stepItems: [String] = []
        var codeLines: [String] = []
        var isInsideCodeBlock = false

        func flushParagraph() {
            guard !paragraphLines.isEmpty else { return }
            currentBlocks.append(.paragraph(paragraphLines.joined(separator: " ")))
            paragraphLines.removeAll()
        }

        func flushBullets() {
            guard !bulletItems.isEmpty else { return }
            currentBlocks.append(.bullets(bulletItems))
            bulletItems.removeAll()
        }

        func flushSteps() {
            guard !stepItems.isEmpty else { return }
            currentBlocks.append(.steps(stepItems))
            stepItems.removeAll()
        }

        func flushCode() {
            guard !codeLines.isEmpty else { return }
            currentBlocks.append(.code(codeLines.joined(separator: "\n")))
            codeLines.removeAll()
        }

        func flushPendingBlocks() {
            flushParagraph()
            flushBullets()
            flushSteps()
            flushCode()
        }

        func commitSectionIfNeeded() {
            flushPendingBlocks()
            guard let currentTitle, !currentBlocks.isEmpty else { return }
            sections.append(HelpDocumentSection(title: currentTitle, blocks: currentBlocks))
            currentBlocks.removeAll()
        }

        for rawLine in lines {
            let line = rawLine.trimmingCharacters(in: .whitespaces)

            if isInsideCodeBlock {
                if line.hasPrefix("```") {
                    isInsideCodeBlock = false
                    flushCode()
                } else {
                    codeLines.append(rawLine)
                }
                continue
            }

            if line.hasPrefix("```") {
                flushParagraph()
                flushBullets()
                flushSteps()
                isInsideCodeBlock = true
                continue
            }

            if line.hasPrefix("# ") {
                continue
            }

            if line.hasPrefix("## ") {
                commitSectionIfNeeded()
                currentTitle = String(line.dropFirst(3))
                continue
            }

            if line.isEmpty {
                flushPendingBlocks()
                continue
            }

            if line.hasPrefix("- ") {
                flushParagraph()
                flushSteps()
                bulletItems.append(String(line.dropFirst(2)))
                continue
            }

            if let stepText = numberedStepText(in: line) {
                flushParagraph()
                flushBullets()
                stepItems.append(stepText)
                continue
            }

            paragraphLines.append(line)
        }

        commitSectionIfNeeded()
        return sections
    }

    private static func numberedStepText(in line: String) -> String? {
        let parts = line.split(separator: ".", maxSplits: 1, omittingEmptySubsequences: false)
        guard parts.count == 2,
              parts[0].allSatisfy(\.isNumber) else {
            return nil
        }

        let candidate = parts[1].trimmingCharacters(in: .whitespaces)
        return candidate.isEmpty ? nil : candidate
    }
}
