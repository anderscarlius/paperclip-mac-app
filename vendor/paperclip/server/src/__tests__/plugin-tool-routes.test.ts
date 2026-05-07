import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { pluginRoutes } from "../routes/plugins.js";
import { errorHandler } from "../middleware/index.js";

const companyId = "22222222-2222-4222-8222-222222222222";
const agentId = "11111111-1111-4111-8111-111111111111";
const runId = "33333333-3333-4333-8333-333333333333";

const mockRegistry = vi.hoisted(() => ({
  getByStatus: vi.fn(),
  getById: vi.fn(),
  getByKey: vi.fn(),
}));

const mockLifecycle = vi.hoisted(() => ({}));

const mockDispatcher = vi.hoisted(() => ({
  listToolsForAgent: vi.fn(),
  getTool: vi.fn(),
  executeTool: vi.fn(),
  initialize: vi.fn(),
  teardown: vi.fn(),
  registerPluginTools: vi.fn(),
  unregisterPluginTools: vi.fn(),
  toolCount: vi.fn(),
  getRegistry: vi.fn(),
}));

vi.mock("../services/plugin-registry.js", () => ({
  pluginRegistryService: () => mockRegistry,
}));

vi.mock("../services/plugin-lifecycle.js", () => ({
  pluginLifecycleManager: () => mockLifecycle,
}));

function createDbStub() {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockResolvedValue([{ id: companyId }]),
    }),
  };
}

function createApp(actor: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = actor;
    next();
  });
  app.use(
    "/api",
    pluginRoutes(
      createDbStub() as any,
      {} as any,
      undefined,
      undefined,
      { toolDispatcher: mockDispatcher as any },
      undefined,
    ),
  );
  app.use(errorHandler);
  return app;
}

describe("plugin tool routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatcher.listToolsForAgent.mockReturnValue([
      {
        name: "paperclipai.web-search:web-search",
        displayName: "Web Search",
        description: "Search the public web.",
        parametersSchema: { type: "object" },
        pluginId: "paperclipai.web-search",
      },
    ]);
    mockDispatcher.getTool.mockReturnValue({
      pluginId: "paperclipai.web-search",
      name: "web-search",
    });
    mockDispatcher.executeTool.mockResolvedValue({
      content: "ok",
      data: { query: "budget" },
      routing: {
        pluginId: "paperclipai.web-search",
        toolName: "web-search",
      },
    });
  });

  it("lets an authenticated agent list available plugin tools", async () => {
    const app = createApp({
      type: "agent",
      agentId,
      companyId,
      runId,
    });

    const res = await request(app).get("/api/plugins/tools");

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockDispatcher.listToolsForAgent).toHaveBeenCalledWith(undefined);
  });

  it("lets an authenticated agent execute a plugin tool for its own run", async () => {
    const app = createApp({
      type: "agent",
      agentId,
      companyId,
      runId,
    });

    const res = await request(app)
      .post("/api/plugins/tools/execute")
      .send({
        tool: "paperclipai.web-search:web-search",
        parameters: { query: "budget planning" },
        runContext: {
          agentId,
          runId,
          companyId,
          projectId: "44444444-4444-4444-8444-444444444444",
        },
      });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(mockDispatcher.executeTool).toHaveBeenCalledWith(
      "paperclipai.web-search:web-search",
      { query: "budget planning" },
      expect.objectContaining({
        agentId,
        runId,
        companyId,
      }),
    );
  });

  it("rejects an agent that tries to execute a tool for another run", async () => {
    const app = createApp({
      type: "agent",
      agentId,
      companyId,
      runId,
    });

    const res = await request(app)
      .post("/api/plugins/tools/execute")
      .send({
        tool: "paperclipai.web-search:web-search",
        parameters: { query: "budget planning" },
        runContext: {
          agentId,
          runId: "55555555-5555-4555-8555-555555555555",
          companyId,
          projectId: "44444444-4444-4444-8444-444444444444",
        },
      });

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(mockDispatcher.executeTool).not.toHaveBeenCalled();
  });
});
