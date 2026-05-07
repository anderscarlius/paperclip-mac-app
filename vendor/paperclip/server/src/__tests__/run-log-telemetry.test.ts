import { describe, expect, it } from "vitest";
import {
  diagnosticOutputTokenCount,
  parseRunLogTelemetry,
} from "../routes/agents.js";

function logLine(ts: string, stream: string, record: Record<string, unknown>) {
  return JSON.stringify({
    ts,
    stream,
    chunk: JSON.stringify(record),
  });
}

describe("run log telemetry", () => {
  it("merges Paperclip web-search command events into one successful tool call", () => {
    const command = "/bin/zsh -lc 'paperclip-web-search \"OpenAI latest news April 2026\" --max-results 3'";
    const startedAt = new Date("2026-04-23T12:00:00.000Z");
    const finishedAt = new Date("2026-04-23T12:00:30.000Z");
    const content = [
      logLine("2026-04-23T12:00:01.000Z", "stdout", { type: "thread.started" }),
      logLine("2026-04-23T12:00:10.000Z", "stdout", {
        type: "item.completed",
        item: {
          type: "command_execution",
          command,
          status: "in_progress",
        },
      }),
      logLine("2026-04-23T12:00:12.000Z", "stdout", {
        type: "item.completed",
        item: {
          type: "command_execution",
          command,
          exit_code: 0,
          aggregated_output: "1. OpenAI update\n2. Model news\n3. Product launch\n",
        },
      }),
      logLine("2026-04-23T12:00:20.000Z", "stdout", {
        type: "item.completed",
        item: {
          type: "message",
          content: [{ text: "Here are two useful search results." }],
        },
      }),
    ].join("\n");

    const parsed = parseRunLogTelemetry(content, startedAt, finishedAt);

    expect(parsed.firstCodexEventAt).toBe("2026-04-23T12:00:01.000Z");
    expect(parsed.firstModelOutputAt).toBe("2026-04-23T12:00:20.000Z");
    expect(parsed.toolCalls).toEqual([
      expect.objectContaining({
        name: "paperclip-web-search",
        status: "ok",
        query: "OpenAI latest news April 2026",
        resultCount: 3,
        count: 2,
        detail: command,
      }),
    ]);
  });

  it("uses final usage tokens for completed runs instead of larger live estimates", () => {
    expect(diagnosticOutputTokenCount({
      status: "succeeded",
      usageOutputTokens: 789,
      estimatedLiveTokens: 979,
    })).toBe(789);

    expect(diagnosticOutputTokenCount({
      status: "succeeded",
      usageOutputTokens: 0,
      estimatedLiveTokens: 32,
    })).toBe(32);

    expect(diagnosticOutputTokenCount({
      status: "running",
      usageOutputTokens: 10,
      estimatedLiveTokens: 32,
    })).toBe(32);
  });
});
