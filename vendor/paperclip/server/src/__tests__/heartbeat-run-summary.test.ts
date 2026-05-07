import { describe, expect, it } from "vitest";
import {
  summarizeHeartbeatRunResultJson,
  buildHeartbeatRunIssueComment,
  enrichHeartbeatRunResultJson,
} from "../services/heartbeat-run-summary.js";

describe("summarizeHeartbeatRunResultJson", () => {
  it("truncates text fields and preserves cost aliases", () => {
    const summary = summarizeHeartbeatRunResultJson({
      summary: "a".repeat(600),
      result: "ok",
      message: "done",
      error: "failed",
      total_cost_usd: 1.23,
      cost_usd: 0.45,
      costUsd: 0.67,
      nested: { ignored: true },
    });

    expect(summary).toEqual({
      summary: "a".repeat(500),
      result: "ok",
      message: "done",
      error: "failed",
      total_cost_usd: 1.23,
      cost_usd: 0.45,
      costUsd: 0.67,
    });
  });

  it("returns null for non-object and irrelevant payloads", () => {
    expect(summarizeHeartbeatRunResultJson(null)).toBeNull();
    expect(summarizeHeartbeatRunResultJson(["nope"] as unknown as Record<string, unknown>)).toBeNull();
    expect(summarizeHeartbeatRunResultJson({ nested: { only: "ignored" } })).toBeNull();
  });

  it("preserves compact runtime diagnostics and warnings for heartbeat-visible surfacing", () => {
    const summary = summarizeHeartbeatRunResultJson({
      warnings: [
        "Workspace path may trigger Codex websocket metadata fallback.",
      ],
      runtimeContext: {
        provider: "openai",
        modelHosting: "cloud",
        model: "unknown",
        modelInfo: {
          requestedModel: "gpt-5.4",
          resolvedModel: null,
          reportedModel: null,
          modelSource: "codex_home_config",
          confidence: "low",
          unknownReason: "codex_cloud_resolved_model_not_reported",
        },
      },
    });

    expect(summary).toEqual({
      warnings: [
        "Workspace path may trigger Codex websocket metadata fallback.",
      ],
      runtimeDiagnostics: {
        provider: "openai",
        modelHosting: "cloud",
        requestedModel: "gpt-5.4",
        modelSource: "codex_home_config",
        confidence: "low",
        unknownReason: "codex_cloud_resolved_model_not_reported",
      },
    });
  });

  it("preserves a compact local fallback candidate payload when present", () => {
    const summary = summarizeHeartbeatRunResultJson({
      runtimeContext: {
        provider: "openai",
        modelHosting: "cloud",
        localFallbackCandidate: {
          schemaVersion: 1,
          candidateType: "local_fallback_offer",
          available: true,
          decision: "eligible",
          source: "operator_handshake",
          taskClass: "local_short_summary",
          confidence: "medium",
          model: "gemma4:e4b",
          runtime: "ollama",
          routingEnabled: false,
          automaticRoutingEnabled: false,
          privacyBenefit: true,
          qualityWarning: "Local result may be less capable than cloud.",
          eligibleReasons: ["Task class matches the narrow local fallback candidate policy."],
          ineligibleReasons: [],
          recommendedFallback: "stronger_model",
          actions: ["run_locally", "use_stronger_model", "cancel"],
        },
      },
    });

    expect(summary).toEqual({
      runtimeDiagnostics: {
        provider: "openai",
        modelHosting: "cloud",
        localFallbackCandidate: {
          schemaVersion: 1,
          candidateType: "local_fallback_offer",
          available: true,
          decision: "eligible",
          source: "operator_handshake",
          taskClass: "local_short_summary",
          confidence: "medium",
          model: "gemma4:e4b",
          runtime: "ollama",
          routingEnabled: false,
          automaticRoutingEnabled: false,
          privacyBenefit: true,
          qualityWarning: "Local result may be less capable than cloud.",
          eligibleReasons: ["Task class matches the narrow local fallback candidate policy."],
          ineligibleReasons: [],
          recommendedFallback: "stronger_model",
          actions: ["run_locally", "use_stronger_model", "cancel"],
        },
      },
    });
  });
});

describe("buildHeartbeatRunIssueComment", () => {
  it("uses the final summary text for issue comments on successful runs", () => {
    const comment = buildHeartbeatRunIssueComment({
      summary: "## Summary\n\n- fixed deploy config\n- posted issue update",
    });

    expect(comment).toContain("## Summary");
    expect(comment).toContain("- fixed deploy config");
    expect(comment).not.toContain("Run summary");
  });

  it("falls back to result or message when summary is missing", () => {
    expect(buildHeartbeatRunIssueComment({ result: "done" })).toBe("done");
    expect(buildHeartbeatRunIssueComment({ message: "completed" })).toBe("completed");
  });

  it("returns null when there is no usable final text", () => {
    expect(buildHeartbeatRunIssueComment({ costUsd: 1.2 })).toBeNull();
  });
});

describe("enrichHeartbeatRunResultJson", () => {
  it("injects adapter summary so successful runs can be rendered and commented", () => {
    const result = enrichHeartbeatRunResultJson(
      {
        stdout: "{\"type\":\"thread.started\"}",
        stderr: "",
      },
      {
        summary: "Four is longer than Two.",
      },
    );

    expect(result).toMatchObject({
      stdout: "{\"type\":\"thread.started\"}",
      stderr: "",
      summary: "Four is longer than Two.",
    });
    expect(buildHeartbeatRunIssueComment(result)).toBe("Four is longer than Two.");
  });

  it("preserves an existing summary instead of overwriting it", () => {
    const result = enrichHeartbeatRunResultJson(
      { summary: "Existing summary" },
      { summary: "New summary" },
    );

    expect(result).toEqual({ summary: "Existing summary" });
  });
});
