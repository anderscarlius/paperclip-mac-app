import XCTest
@testable import PaperclipDesktop

final class DesktopRuntimeControlTests: XCTestCase {
    func testManagedOllamaSummaryAllowsRestart() {
        let summary = buildOllamaControlSummary(
            isReachable: true,
            isManaged: true,
            loadedModelCount: 1
        )

        XCTAssertEqual(summary.state, .managed)
        XCTAssertEqual(summary.title, "Managed")
        XCTAssertTrue(summary.canRestartManagedOllama)
        XCTAssertTrue(summary.detail.contains("owns this Ollama server"))
    }

    func testExternalOllamaSummaryIsHonestAboutPolicy() {
        let summary = buildOllamaControlSummary(
            isReachable: true,
            isManaged: false,
            loadedModelCount: 2
        )

        XCTAssertEqual(summary.state, .external)
        XCTAssertEqual(summary.title, "External")
        XCTAssertFalse(summary.canRestartManagedOllama)
        XCTAssertTrue(summary.policyDetail.contains("will not stop or restart"))
    }

    func testWatchdogSummaryMarksExternalNotRespondingAsReportOnly() {
        let activity = DesktopLocalModelActivitySummary(
            state: .notResponding,
            title: "Local model",
            detail: "Ollama is not responding",
            runID: "run-1",
            secondsSinceRunStart: 180,
            secondsToFirstOutput: nil,
            secondsSinceLastOutput: nil,
            liveTokens: 0,
            liveTokensPerSecond: nil
        )

        let summary = buildWatchdogStatusSummary(
            localModelEnabled: true,
            activity: activity,
            latestEvent: nil,
            isManagingOllamaProcess: false
        )

        XCTAssertEqual(summary.state, .ollamaNotResponding)
        XCTAssertEqual(summary.title, "Ollama not responding")
        XCTAssertTrue(summary.detail.contains("does not own the server"))
    }

    func testWatchdogSummaryShowsRecoveryOutcome() {
        let event = WatchdogEvent(
            occurredAt: .now,
            action: .recovered,
            reason: "Managed Ollama API is not responding",
            detail: "Managed Ollama restarted successfully."
        )

        let summary = buildWatchdogStatusSummary(
            localModelEnabled: true,
            activity: nil,
            latestEvent: event,
            isManagingOllamaProcess: true
        )

        XCTAssertEqual(summary.state, .recovered)
        XCTAssertEqual(summary.title, "Recovered")
        XCTAssertEqual(summary.detail, "Managed Ollama restarted successfully.")
    }
}
