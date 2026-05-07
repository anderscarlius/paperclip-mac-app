import SwiftUI

struct RunDetailView: View {
    let diagnostic: PaperclipRuntimeService.RuntimeRunDiagnostic
    let runSummary: DesktopSidebarRunSummary?
    let formatDuration: (Double) -> String

    var body: some View {
        GroupBox("Run Detail") {
            VStack(alignment: .leading, spacing: 16) {
                header
                currentStatus
                metricsGrid

                if let error = diagnostic.error, !error.isEmpty {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .font(.caption)
                        .foregroundStyle(.red)
                        .textSelection(.enabled)
                }

                timeline

                if !toolCallRows.isEmpty {
                    toolCalls
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 4) {
                Text(diagnostic.runId)
                    .font(.system(.caption, design: .monospaced))
                    .textSelection(.enabled)
                Text(resultSummary)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Text(resultTitle)
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Capsule().fill(statusTone.color.opacity(0.14)))
                .foregroundStyle(statusTone.color)
        }
    }

    private var currentStatus: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: currentRunState.systemImage)
                .foregroundStyle(currentRunState.tone.color)
                .frame(width: 18)
            VStack(alignment: .leading, spacing: 2) {
                Text(currentRunState.title)
                    .font(.headline)
                Text(currentRunState.detail)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            }
            Spacer()
        }
        .padding(10)
        .background(RoundedRectangle(cornerRadius: 8).fill(currentRunState.tone.color.opacity(0.08)))
    }

    private var metricsGrid: some View {
        Grid(alignment: .leading, horizontalSpacing: 18, verticalSpacing: 8) {
            metricRow("Agent", diagnostic.agentName ?? runSummary?.agentName ?? "Agent")
            metricRow("Adapter", diagnostic.adapterType ?? "unknown")
            metricRow("Model", modelLabel)
            metricRow("Provider", providerLabel)
            metricRow("Local / Cloud", isLocalRun ? "local" : "cloud or external")
            metricRow("Session", sessionLabel)
            metricRow("Total time", totalDuration.map(formatDuration) ?? "running")
            metricRow("Output tokens", "\(outputTokens)")
            metricRow("Approx output speed", summaryOutputTokensPerSecondLabel)
            metricRow("Time to first Codex event", diagnostic.secondsToFirstCodexEvent.map(formatDuration) ?? "waiting")
            metricRow("Time to first model output", diagnostic.secondsToFirstModelOutput.map(formatDuration) ?? "waiting")
            metricRow("Seconds since last output", diagnostic.secondsSinceLastModelOutput.map(formatDuration) ?? "none yet")
        }
    }

    private var timeline: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Timeline")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            ForEach(timelineRows) { row in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: row.systemImage)
                        .foregroundStyle(row.tone.color)
                        .frame(width: 16)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(row.title)
                            .font(.caption.weight(.semibold))
                        Text(row.detail)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                    }
                }
            }
        }
    }

    private var toolCalls: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Tool Calls")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)

            ForEach(toolCallRows) { call in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: toolIcon(for: call.status))
                        .foregroundStyle(toolTone(for: call.status).color)
                        .frame(width: 16)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text(call.name)
                                .font(.caption.weight(.semibold))
                            Text(call.status.capitalized)
                                .font(.caption2.weight(.semibold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Capsule().fill(toolTone(for: call.status).color.opacity(0.14)))
                                .foregroundStyle(toolTone(for: call.status).color)
                        }
                        Text(toolDetail(for: call))
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func metricRow(_ label: String, _ value: String) -> some View {
        GridRow {
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption)
                .textSelection(.enabled)
        }
    }

    private var providerLabel: String {
        let provider = diagnostic.provider ?? runSummary?.provider
        guard let provider, !provider.isEmpty else {
            return isLocalRun ? "local" : "unknown"
        }
        return isLocalRun ? "\(provider) · local" : provider
    }

    private var toolCallRows: [PaperclipRuntimeService.RuntimeRunDiagnosticToolCall] {
        diagnostic.toolCalls ?? []
    }

    private var modelLabel: String {
        diagnostic.model ?? runSummary?.model ?? "unknown"
    }

    private var isLocalRun: Bool {
        let adapter = diagnostic.adapterType?.lowercased() ?? ""
        return adapter.hasSuffix("_local") || adapter == "cursor" || diagnostic.provider == "ollama" || runSummary?.provider == "ollama"
    }

    private var resultSummary: String {
        let duration = totalDuration.map(formatDuration) ?? "running"
        return [duration, providerLabel, "\(outputTokens) output tokens"].filter { !$0.isEmpty }.joined(separator: " · ")
    }

    private var totalDuration: Double? {
        guard let startedAt = diagnostic.startedAt else { return nil }
        return max(0, (diagnostic.finishedAt ?? .now).timeIntervalSince(startedAt))
    }

    private var sessionLabel: String {
        if diagnostic.sessionReused == true {
            return "reused"
        }
        if diagnostic.sessionReused == false {
            return "fresh"
        }
        return "unknown"
    }

    private var outputTokens: Int {
        [diagnostic.outputTokens ?? 0, runSummary?.outputTokens ?? 0, diagnostic.estimatedLiveTokens].max() ?? 0
    }

    private var summaryOutputTokensPerSecondLabel: String {
        guard let totalDuration, totalDuration > 0, outputTokens > 0 else {
            return "not available"
        }
        return String(format: "%.1f output tok/s over the run", Double(outputTokens) / totalDuration)
    }

    private var statusTone: RunDetailTone {
        switch diagnostic.status {
        case "succeeded":
            .good
        case "failed", "timed_out", "cancelled":
            .bad
        case "running":
            .working
        case "queued":
            .warning
        default:
            .neutral
        }
    }

    private var timelineRows: [RunTimelineRow] {
        var rows: [RunTimelineRow] = []
        if let startedAt = diagnostic.startedAt {
            rows.append(RunTimelineRow(
                sortDate: startedAt,
                title: "Startup",
                detail: "Run created at \(timeLabel(startedAt))",
                systemImage: "power",
                tone: .working
            ))

            if isLocalRun {
                rows.append(RunTimelineRow(
                    sortDate: startedAt.addingTimeInterval(0.001),
                    title: "Starting Ollama",
                    detail: "Preparing local runtime for \(modelLabel)",
                    systemImage: "cpu",
                    tone: .working
                ))
            }
        }

        if let modelLoading = diagnostic.phases.first(where: { $0.phase == "model_loading" }) {
            rows.append(RunTimelineRow(
                sortDate: modelLoading.firstAt,
                title: "Loading Model",
                detail: "\(timeLabel(modelLoading.firstAt)) · \(modelLoading.count) model event\(modelLoading.count == 1 ? "" : "s")",
                systemImage: "hourglass",
                tone: .working
            ))
        }

        if let firstEvent = diagnostic.firstCodexEventAt {
            rows.append(RunTimelineRow(
                sortDate: firstEvent,
                title: "First Codex Event",
                detail: diagnostic.secondsToFirstCodexEvent.map { "\(formatDuration($0)) after start" } ?? timeLabel(firstEvent),
                systemImage: "terminal",
                tone: .working
            ))
        }

        if let firstEvent = diagnostic.firstCodexEventAt {
            let end = diagnostic.firstModelOutputAt ?? diagnostic.finishedAt ?? .now
            let wait = max(0, end.timeIntervalSince(firstEvent))
            rows.append(RunTimelineRow(
                sortDate: firstEvent.addingTimeInterval(0.002),
                title: "Waiting for First Output",
                detail: diagnostic.firstModelOutputAt == nil
                    ? "Still waiting · \(formatDuration(wait))"
                    : "\(formatDuration(wait)) until the model started writing",
                systemImage: "clock",
                tone: diagnostic.firstModelOutputAt == nil ? .warning : .working
            ))
        }

        if let firstOutput = diagnostic.firstModelOutputAt {
            rows.append(RunTimelineRow(
                sortDate: firstOutput,
                title: "First Model Output",
                detail: diagnostic.secondsToFirstModelOutput.map { "\(formatDuration($0)) after start" } ?? timeLabel(firstOutput),
                systemImage: "text.bubble",
                tone: .good
            ))
        }

        if let firstOutput = diagnostic.firstModelOutputAt,
           let lastOutput = diagnostic.lastModelOutputAt {
            rows.append(RunTimelineRow(
                sortDate: firstOutput.addingTimeInterval(0.002),
                title: "Writing",
                detail: "\(outputTokens) output tokens · last output \(timeLabel(lastOutput))",
                systemImage: "pencil.and.outline",
                tone: .good
            ))
        }

        for phase in diagnostic.phases
            .filter({ !["startup", "model_loading", "tool_call"].contains($0.phase) })
            .sorted(by: { $0.firstAt < $1.firstAt }) {
            rows.append(RunTimelineRow(
                sortDate: phase.firstAt,
                title: phaseTitle(phase.phase),
                detail: "\(timeLabel(phase.firstAt)) · \(phase.count) event\(phase.count == 1 ? "" : "s")",
                systemImage: phaseIcon(phase.phase),
                tone: phaseTone(phase.phase)
            ))
        }

        for call in toolCallRows.sorted(by: { $0.firstAt < $1.firstAt }) {
            rows.append(RunTimelineRow(
                sortDate: call.firstAt,
                title: "Tool Call: \(toolTitle(for: call.name))",
                detail: toolDetail(for: call),
                systemImage: toolIcon(for: call.status),
                tone: toolTone(for: call.status)
            ))
        }

        if let finishedAt = diagnostic.finishedAt {
            rows.append(RunTimelineRow(
                sortDate: finishedAt,
                title: resultTitle,
                detail: timeLabel(finishedAt),
                systemImage: diagnostic.status == "succeeded" ? "checkmark.circle" : "xmark.octagon",
                tone: diagnostic.status == "succeeded" ? .good : .bad
            ))
        } else if diagnostic.status == "running" {
            rows.append(RunTimelineRow(
                sortDate: .now,
                title: "Still Running",
                detail: diagnostic.secondsSinceLastModelOutput.map { "Last output \(formatDuration($0)) ago" } ?? "Waiting for model output",
                systemImage: "dot.radiowaves.left.and.right",
                tone: .working
            ))
        }

        return rows.sorted(by: { $0.sortDate < $1.sortDate })
    }

    private var resultTitle: String {
        switch diagnostic.status {
        case "succeeded":
            "Completed"
        case "failed", "timed_out":
            "Failed"
        case "cancelled":
            "Cancelled"
        default:
            diagnostic.status.capitalized
        }
    }

    private var currentRunState: RunPresentationState {
        switch diagnostic.status {
        case "succeeded":
            return RunPresentationState(
                title: "Completed",
                detail: finalSummaryDetail,
                systemImage: "checkmark.circle",
                tone: .good
            )
        case "failed", "timed_out":
            return RunPresentationState(
                title: "Failed",
                detail: diagnostic.error?.isEmpty == false ? diagnostic.error! : finalSummaryDetail,
                systemImage: "xmark.octagon",
                tone: .bad
            )
        case "cancelled":
            return RunPresentationState(
                title: "Cancelled",
                detail: "The run was cancelled before completion.",
                systemImage: "xmark.octagon",
                tone: .bad
            )
        case "queued":
            return RunPresentationState(
                title: "Idle",
                detail: "Queued and waiting for the agent runtime.",
                systemImage: "pause.circle",
                tone: .warning
            )
        case "running":
            return runningPresentationState
        default:
            return RunPresentationState(
                title: diagnostic.status.capitalized,
                detail: resultSummary,
                systemImage: "circle",
                tone: .neutral
            )
        }
    }

    private var runningPresentationState: RunPresentationState {
        if let lastOutput = diagnostic.secondsSinceLastModelOutput,
           lastOutput >= 45 {
            return RunPresentationState(
                title: "No output for \(formatDuration(lastOutput))",
                detail: "The model has written before, but no new output has arrived recently.",
                systemImage: "clock.badge.exclamationmark",
                tone: .warning
            )
        }

        if diagnostic.firstModelOutputAt != nil || diagnostic.estimatedLiveTokens > 0 {
            let rate = liveOutputRateLabel.map { " · \($0)" } ?? ""
            return RunPresentationState(
                title: "Writing",
                detail: "\(outputTokens) output tokens\(rate)",
                systemImage: "pencil.and.outline",
                tone: .good
            )
        }

        if diagnostic.phases.contains(where: { $0.phase == "model_loading" }) {
            return RunPresentationState(
                title: "Loading model",
                detail: "Ollama is preparing \(modelLabel). First output has not arrived yet.",
                systemImage: "hourglass",
                tone: .working
            )
        }

        if diagnostic.firstCodexEventAt != nil {
            return RunPresentationState(
                title: "Waiting for first output",
                detail: "Codex is running and the model has not streamed content yet.",
                systemImage: "clock",
                tone: .working
            )
        }

        return RunPresentationState(
            title: "Starting Ollama",
            detail: "Paperclip is preparing the local run.",
            systemImage: "cpu",
            tone: .working
        )
    }

    private var finalSummaryDetail: String {
        [
            totalDuration.map { "total \(formatDuration($0))" },
            "\(outputTokens) output tokens",
            summaryOutputTokensPerSecondLabel == "not available" ? nil : summaryOutputTokensPerSecondLabel,
            modelLabel,
            isLocalRun ? "local" : "cloud/external",
            "session \(sessionLabel)",
        ]
            .compactMap { $0 }
            .joined(separator: " · ")
    }

    private var liveOutputRateLabel: String? {
        guard diagnostic.status == "running",
              let lastOutput = diagnostic.secondsSinceLastModelOutput,
              lastOutput < 5,
              let startedAt = diagnostic.firstModelOutputAt,
              outputTokens > 0 else {
            return nil
        }

        let elapsed = max(1, Date.now.timeIntervalSince(startedAt))
        return String(format: "%.1f output tok/s", Double(outputTokens) / elapsed)
    }

    private func phaseTitle(_ phase: String) -> String {
        switch phase {
        case "startup":
            "Startup"
        case "model_loading":
            "Model Loading"
        case "reasoning":
            "Reasoning"
        case "tool_call":
            "Tool Call"
        case "answer":
            "Answer"
        case "comment_posting":
            "Comment Posting"
        default:
            phase.replacingOccurrences(of: "_", with: " ").capitalized
        }
    }

    private func phaseIcon(_ phase: String) -> String {
        switch phase {
        case "model_loading":
            "cpu"
        case "reasoning":
            "brain"
        case "tool_call":
            "wrench.and.screwdriver"
        case "answer":
            "text.bubble"
        case "comment_posting":
            "paperplane"
        default:
            "circle"
        }
    }

    private func phaseTone(_ phase: String) -> RunDetailTone {
        switch phase {
        case "answer", "comment_posting":
            .good
        case "tool_call", "reasoning", "model_loading":
            .working
        default:
            .neutral
        }
    }

    private func toolTone(for status: String) -> RunDetailTone {
        switch status {
        case "ok":
            .good
        case "failed":
            .bad
        case "running":
            .working
        default:
            .neutral
        }
    }

    private func toolIcon(for status: String) -> String {
        switch status {
        case "ok":
            "checkmark.circle"
        case "failed":
            "xmark.octagon"
        case "running":
            "arrow.triangle.2.circlepath"
        default:
            "wrench.and.screwdriver"
        }
    }

    private func toolTitle(for name: String) -> String {
        switch name {
        case "paperclip-web-search", "web-search":
            return "Web Search"
        default:
            return name
        }
    }

    private func toolDetail(for call: PaperclipRuntimeService.RuntimeRunDiagnosticToolCall) -> String {
        var parts = ["\(timeLabel(call.firstAt))", "\(call.count) event\(call.count == 1 ? "" : "s")"]
        if let query = call.query, !query.isEmpty {
            parts.append("query: \(query)")
        }
        if let resultCount = call.resultCount {
            parts.append("\(resultCount) result\(resultCount == 1 ? "" : "s")")
        }
        if let detail = call.detail, !detail.isEmpty {
            parts.append(detail)
        }
        return parts.joined(separator: " · ")
    }

    private func timeLabel(_ date: Date) -> String {
        date.formatted(date: .omitted, time: .standard)
    }
}

private struct RunTimelineRow: Identifiable {
    let id = UUID()
    let sortDate: Date
    let title: String
    let detail: String
    let systemImage: String
    let tone: RunDetailTone
}

private struct RunPresentationState {
    let title: String
    let detail: String
    let systemImage: String
    let tone: RunDetailTone
}

private enum RunDetailTone {
    case good
    case working
    case warning
    case bad
    case neutral

    var color: Color {
        switch self {
        case .good:
            .green
        case .working:
            .blue
        case .warning:
            .orange
        case .bad:
            .red
        case .neutral:
            .secondary
        }
    }
}
