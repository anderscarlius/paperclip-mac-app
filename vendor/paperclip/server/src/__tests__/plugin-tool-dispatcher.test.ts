import { describe, expect, it, vi } from "vitest";
import { createPluginToolDispatcher } from "../services/plugin-tool-dispatcher.js";

describe("plugin tool dispatcher", () => {
  it("routes tool execution through the plugin database id when provided", async () => {
    const isRunning = vi.fn().mockImplementation((pluginId: string) => pluginId === "plugin-db-id");
    const call = vi.fn().mockResolvedValue({
      content: "ok",
      data: { source: "worker" },
    });

    const dispatcher = createPluginToolDispatcher({
      workerManager: {
        isRunning,
        call,
      } as any,
    });

    dispatcher.registerPluginTools(
      "paperclipai.web-search",
      {
        id: "paperclipai.web-search",
        apiVersion: 1,
        version: "0.1.0",
        displayName: "Web Search",
        description: "Search the web",
        capabilities: ["agent.tools.register"],
        entrypoints: {
          worker: "./dist/worker.js",
        },
        tools: [
          {
            name: "web-search",
            displayName: "Web Search",
            description: "Search the public web",
            parametersSchema: {
              type: "object",
            },
          },
        ],
      },
      "plugin-db-id",
    );

    const result = await dispatcher.executeTool(
      "paperclipai.web-search:web-search",
      { query: "OpenAI latest models" },
      {
        agentId: "agent-id",
        runId: "run-id",
        companyId: "company-id",
        projectId: "project-id",
      },
    );

    expect(isRunning).toHaveBeenCalledWith("plugin-db-id");
    expect(call).toHaveBeenCalledWith(
      "plugin-db-id",
      "executeTool",
      expect.objectContaining({
        toolName: "web-search",
        parameters: { query: "OpenAI latest models" },
      }),
    );
    expect(result).toEqual({
      pluginId: "paperclipai.web-search",
      toolName: "web-search",
      result: {
        content: "ok",
        data: { source: "worker" },
      },
    });
  });
});
