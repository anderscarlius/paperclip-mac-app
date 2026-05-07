import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execute } from "@paperclipai/adapter-codex-local/server";

async function writeFakeCodexCommand(commandPath: string): Promise<void> {
  const script = `#!/usr/bin/env node
const fs = require("node:fs");

const capturePath = process.env.PAPERCLIP_TEST_CAPTURE_PATH;
const utf8Hex = (value) => Buffer.from(value || "", "utf8").toString("hex");
const payload = {
  argv: process.argv.slice(2),
  prompt: fs.readFileSync(0, "utf8"),
  codexHome: process.env.CODEX_HOME || null,
  processCwd: process.cwd(),
  processCwdHex: utf8Hex(process.cwd()),
  pathEnv: process.env.PATH || "",
  paperclipWebSearchCommand: process.env.PAPERCLIP_WEB_SEARCH_COMMAND || null,
  paperclipWakePayloadJson: process.env.PAPERCLIP_WAKE_PAYLOAD_JSON || null,
  paperclipEnvKeys: Object.keys(process.env)
    .filter((key) => key.startsWith("PAPERCLIP_"))
    .sort(),
  workspaceEnv: {
    cwd: process.env.PAPERCLIP_WORKSPACE_CWD || null,
    cwdHex: utf8Hex(process.env.PAPERCLIP_WORKSPACE_CWD || ""),
    worktreePath: process.env.PAPERCLIP_WORKSPACE_WORKTREE_PATH || null,
    worktreePathHex: utf8Hex(process.env.PAPERCLIP_WORKSPACE_WORKTREE_PATH || ""),
    source: process.env.PAPERCLIP_WORKSPACE_SOURCE || null,
  },
  runtimeContext: {
    execution: process.env.PAPERCLIP_RUNTIME_EXECUTION || null,
    modelHosting: process.env.PAPERCLIP_RUNTIME_MODEL_HOSTING || null,
    provider: process.env.PAPERCLIP_RUNTIME_PROVIDER || null,
    model: process.env.PAPERCLIP_RUNTIME_MODEL || null,
    modelInfo: {
      requestedModel: process.env.PAPERCLIP_RUNTIME_REQUESTED_MODEL || null,
      resolvedModel: process.env.PAPERCLIP_RUNTIME_RESOLVED_MODEL || null,
      reportedModel: process.env.PAPERCLIP_RUNTIME_REPORTED_MODEL || null,
      modelSource: process.env.PAPERCLIP_RUNTIME_MODEL_SOURCE || null,
      confidence: process.env.PAPERCLIP_RUNTIME_MODEL_CONFIDENCE || null,
      unknownReason: process.env.PAPERCLIP_RUNTIME_MODEL_UNKNOWN_REASON || null,
    },
    biller: process.env.PAPERCLIP_RUNTIME_BILLER || null,
    billingType: process.env.PAPERCLIP_RUNTIME_BILLING_TYPE || null,
  },
};
if (capturePath) {
  fs.writeFileSync(capturePath, JSON.stringify(payload), "utf8");
}
console.log(JSON.stringify({ type: "thread.started", thread_id: "codex-session-1" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "hello" } }));
console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 } }));
`;
  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
}

async function writeFakeCodexCommandWithThreadPersistenceFailure(commandPath: string): Promise<void> {
  const script = `#!/usr/bin/env node
console.error("2026-04-29T13:12:11.335680Z ERROR codex_core::session: failed to record rollout items: thread 019dd95c-a974-7090-8a05-62ae40d0a822 not found");
console.log(JSON.stringify({ type: "thread.started", thread_id: "codex-session-1" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: "hello" } }));
console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 1 } }));
`;
  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
}

async function writeFakeCodexCommandThatRunsWebSearch(commandPath: string): Promise<void> {
  const script = `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

const search = spawnSync("paperclip-web-search", ["forty two", "--max-results", "3"], {
  encoding: "utf8",
  env: process.env,
});
if (search.status !== 0) {
  if (search.stderr) process.stderr.write(search.stderr);
  process.exit(search.status || 1);
}
console.log(JSON.stringify({ type: "thread.started", thread_id: "codex-session-1" }));
console.log(JSON.stringify({ type: "item.completed", item: { type: "agent_message", text: search.stdout.trim() } }));
console.log(JSON.stringify({ type: "turn.completed", usage: { input_tokens: 1, cached_input_tokens: 0, output_tokens: 4 } }));
`;
  await fs.writeFile(commandPath, script, "utf8");
  await fs.chmod(commandPath, 0o755);
}

async function writeFakeCodexNativeAuth(authPath: string): Promise<void> {
  await fs.mkdir(path.dirname(authPath), { recursive: true });
  await fs.writeFile(
    authPath,
    JSON.stringify({
      accessToken: "codex-access-token",
      accountId: "account-1",
    }, null, 2),
    "utf8",
  );
}

type CapturePayload = {
  argv: string[];
  prompt: string;
  codexHome: string | null;
  processCwd: string;
  processCwdHex: string;
  pathEnv: string;
  paperclipWebSearchCommand: string | null;
  paperclipWakePayloadJson: string | null;
  paperclipEnvKeys: string[];
  workspaceEnv: {
    cwd: string | null;
    cwdHex: string;
    worktreePath: string | null;
    worktreePathHex: string;
    source: string | null;
  };
  runtimeContext: {
    execution: string | null;
    modelHosting: string | null;
    provider: string | null;
    model: string | null;
    modelInfo: {
      requestedModel: string | null;
      resolvedModel: string | null;
      reportedModel: string | null;
      modelSource: string | null;
      confidence: string | null;
      unknownReason: string | null;
    };
    biller: string | null;
    billingType: string | null;
  };
};

type LogEntry = {
  stream: "stdout" | "stderr";
  chunk: string;
};

function utf8Hex(value: string): string {
  return Buffer.from(value, "utf8").toString("hex");
}

describe("codex execute", () => {
  it("uses a Paperclip-managed CODEX_HOME outside worktree mode while preserving shared auth and config", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-default-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const managedCodexHome = path.join(
      paperclipHome,
      "instances",
      "default",
      "companies",
      "company-1",
      "codex-home",
    );
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(sharedCodexHome, { recursive: true });
    await writeFakeCodexNativeAuth(path.join(sharedCodexHome, "auth.json"));
    await fs.writeFile(path.join(sharedCodexHome, "config.toml"), 'model = "codex-mini-latest"\n', "utf8");
    await writeFakeCodexCommand(commandPath);
    await fs.mkdir(path.join(managedCodexHome, "skills"), { recursive: true });
    await fs.mkdir(path.join(root, "stale-web-search-skill"), { recursive: true });
    await fs.symlink(
      path.join(root, "stale-web-search-skill"),
      path.join(managedCodexHome, "skills", "paperclip-web-search"),
    );

    const previousHome = process.env.HOME;
    const previousPaperclipHome = process.env.PAPERCLIP_HOME;
    const previousPaperclipInstanceId = process.env.PAPERCLIP_INSTANCE_ID;
    const previousPaperclipInWorktree = process.env.PAPERCLIP_IN_WORKTREE;
    const previousCodexHome = process.env.CODEX_HOME;
    process.env.HOME = root;
    process.env.PAPERCLIP_HOME = paperclipHome;
    delete process.env.PAPERCLIP_INSTANCE_ID;
    delete process.env.PAPERCLIP_IN_WORKTREE;
    process.env.CODEX_HOME = sharedCodexHome;

    try {
      const logs: LogEntry[] = [];
      const result = await execute({
        runId: "run-default",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async (stream, chunk) => {
          logs.push({ stream, chunk });
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.codexHome).toBe(managedCodexHome);
      expect(capture.prompt).toContain("Paperclip runtime context for this run (authoritative):");
      expect(capture.prompt).toContain("- execution_runtime: local");
      expect(capture.prompt).toContain("- model_hosting: cloud");
      expect(capture.prompt).toContain("- provider: openai");
      expect(capture.prompt).toContain("- model: unknown");
      expect(capture.prompt).toContain("- requested_model: codex-mini-latest");
      expect(capture.prompt).toContain("- model_source: codex_home_config");
      expect(capture.prompt).toContain("- model_confidence: low");
      expect(capture.prompt).toContain("- model_unknown_reason: codex_cloud_resolved_model_not_reported");
      expect(capture.prompt).toContain('paperclip-web-search "query"');
      expect(capture.prompt).toContain("If a subject can mean multiple things");
      expect(capture.prompt).toContain("try 2-3 refined queries before concluding there is no relevant coverage");
      expect(capture.paperclipWebSearchCommand).toBe("paperclip-web-search");
      expect(capture.paperclipEnvKeys).toContain("PAPERCLIP_WEB_SEARCH_COMMAND");
      expect(capture.paperclipEnvKeys).toContain("PAPERCLIP_RUNTIME_PROVIDER");
      expect(capture.runtimeContext).toEqual({
        execution: "local",
        modelHosting: "cloud",
        provider: "openai",
        model: "unknown",
        modelInfo: {
          requestedModel: "codex-mini-latest",
          resolvedModel: null,
          reportedModel: null,
          modelSource: "codex_home_config",
          confidence: "low",
          unknownReason: "codex_cloud_resolved_model_not_reported",
        },
        biller: "chatgpt",
        billingType: "subscription",
      });

      const shimBinDir = path.join(managedCodexHome, "paperclip-bin");
      expect(capture.pathEnv.split(path.delimiter)[0]).toBe(shimBinDir);
      expect((await fs.lstat(path.join(shimBinDir, "paperclip-web-search"))).isFile()).toBe(true);
      expect((await fs.lstat(path.join(shimBinDir, "websearch"))).isFile()).toBe(true);
      expect(await fs.readFile(path.join(shimBinDir, "paperclip-web-search"), "utf8")).toContain(
        "payload.result?.content",
      );
      await expect(fs.lstat(path.join(managedCodexHome, "skills", "paperclip-web-search"))).rejects.toMatchObject({
        code: "ENOENT",
      });

      const managedAuth = path.join(managedCodexHome, "auth.json");
      const managedConfig = path.join(managedCodexHome, "config.toml");
      expect((await fs.lstat(managedAuth)).isSymbolicLink()).toBe(true);
      expect(await fs.realpath(managedAuth)).toBe(await fs.realpath(path.join(sharedCodexHome, "auth.json")));
      expect((await fs.lstat(managedConfig)).isFile()).toBe(true);
      expect(await fs.readFile(managedConfig, "utf8")).toBe('model = "codex-mini-latest"\n');
      await expect(fs.lstat(path.join(sharedCodexHome, "companies", "company-1"))).rejects.toThrow();
      expect(logs).toContainEqual(
        expect.objectContaining({
          stream: "stdout",
          chunk: expect.stringContaining("Using Paperclip-managed Codex home"),
        }),
      );
      expect(logs).toContainEqual(
        expect.objectContaining({
          stream: "stdout",
          chunk: expect.stringContaining('Removed Codex skill "paperclip-web-search"'),
        }),
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPaperclipHome === undefined) delete process.env.PAPERCLIP_HOME;
      else process.env.PAPERCLIP_HOME = previousPaperclipHome;
      if (previousPaperclipInstanceId === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
      else process.env.PAPERCLIP_INSTANCE_ID = previousPaperclipInstanceId;
      if (previousPaperclipInWorktree === undefined) delete process.env.PAPERCLIP_IN_WORKTREE;
      else process.env.PAPERCLIP_IN_WORKTREE = previousPaperclipInWorktree;
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("bridges web search through the Paperclip plugin endpoint as a shell command", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-web-search-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const mockFetchPath = path.join(root, "mock-fetch.cjs");
    const webSearchRequestPath = path.join(root, "web-search-request.json");
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");

    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(sharedCodexHome, { recursive: true });
    await writeFakeCodexNativeAuth(path.join(sharedCodexHome, "auth.json"));
    await fs.writeFile(
      mockFetchPath,
      [
        'const fs = require("node:fs");',
        "global.fetch = async (url, options = {}) => {",
        "  fs.writeFileSync(process.env.PAPERCLIP_TEST_WEB_SEARCH_REQUEST_PATH, JSON.stringify({",
        "    url: String(url),",
        "    method: options.method,",
        "    headers: options.headers,",
        "    body: JSON.parse(options.body),",
        "  }), \"utf8\");",
        "  return {",
        "    ok: true,",
        "    status: 200,",
        "    text: async () => JSON.stringify({ result: { content: \"Result A\\nResult B\" } }),",
        "  };",
        "};",
        "",
      ].join("\n"),
      "utf8",
    );
    await writeFakeCodexCommandThatRunsWebSearch(commandPath);

    const previousHome = process.env.HOME;
    const previousPaperclipHome = process.env.PAPERCLIP_HOME;
    const previousPaperclipInstanceId = process.env.PAPERCLIP_INSTANCE_ID;
    const previousPaperclipInWorktree = process.env.PAPERCLIP_IN_WORKTREE;
    const previousCodexHome = process.env.CODEX_HOME;
    process.env.HOME = root;
    process.env.PAPERCLIP_HOME = paperclipHome;
    delete process.env.PAPERCLIP_INSTANCE_ID;
    delete process.env.PAPERCLIP_IN_WORKTREE;
    process.env.CODEX_HOME = sharedCodexHome;

    try {
      const result = await execute({
        runId: "run-web-search",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            NODE_OPTIONS: `--require=${mockFetchPath}`,
            PAPERCLIP_API_URL: "http://paperclip.test",
            PAPERCLIP_TEST_WEB_SEARCH_REQUEST_PATH: webSearchRequestPath,
          },
          promptTemplate: "Search when needed.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();
      expect(result.summary).toBe("Result A\nResult B");
      const request = JSON.parse(await fs.readFile(webSearchRequestPath, "utf8")) as {
        url: string;
        method: string;
        headers: Record<string, string>;
        body: Record<string, unknown>;
      };
      expect(request.method).toBe("POST");
      expect(request.url).toBe("http://paperclip.test/api/plugins/tools/execute");
      expect(request.headers.authorization).toBe("Bearer run-jwt-token");
      expect(request.body).toMatchObject({
        tool: "paperclipai.web-search:web-search",
        parameters: {
          query: "forty two",
          maxResults: 3,
        },
        runContext: {
          agentId: "agent-1",
          runId: "run-web-search",
          companyId: "company-1",
          projectId: "default",
        },
      });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPaperclipHome === undefined) delete process.env.PAPERCLIP_HOME;
      else process.env.PAPERCLIP_HOME = previousPaperclipHome;
      if (previousPaperclipInstanceId === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
      else process.env.PAPERCLIP_INSTANCE_ID = previousPaperclipInstanceId;
      if (previousPaperclipInWorktree === undefined) delete process.env.PAPERCLIP_IN_WORKTREE;
      else process.env.PAPERCLIP_IN_WORKTREE = previousPaperclipInWorktree;
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("discards a successful Codex session when Codex reports thread persistence failure", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-persistence-failure-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommandWithThreadPersistenceFailure(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      const logs: LogEntry[] = [];
      const result = await execute({
        runId: "run-thread-persistence-failure",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async (stream, chunk) => {
          logs.push({ stream, chunk });
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();
      expect(result.summary).toBe("hello");
      expect(result.clearSession).toBe(true);
      expect(result.sessionId).toBeNull();
      expect(result.sessionParams).toBeNull();
      expect(result.sessionDisplayId).toBeNull();
      expect(result.resultJson?.stderr).not.toContain("failed to record rollout items");
      expect(logs).not.toContainEqual(
        expect.objectContaining({
          stream: "stderr",
          chunk: expect.stringContaining("failed to record rollout items"),
        }),
      );
      expect(logs).toContainEqual(
        expect.objectContaining({
          stream: "stdout",
          chunk: expect.stringContaining("Paperclip will discard this session and avoid reusing it"),
        }),
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("fails fast for cloud-hosted runs when Codex auth is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-missing-auth-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.HOME = root;

    try {
      const logs: LogEntry[] = [];
      const result = await execute({
        runId: "run-missing-auth-preflight",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async (stream, chunk) => {
          logs.push({ stream, chunk });
        },
      });

      expect(result.exitCode).toBe(1);
      expect(result.errorCode).toBe("missing_auth_preflight");
      expect(result.errorMessage).toContain("Cloud-hosted Codex authentication is missing or unavailable");
      expect(result.resultJson).toMatchObject({
        ok: false,
        errorType: "missing_auth_preflight",
        noExecutionAttempt: true,
        runtimeContext: {
          executionRuntime: "local",
          modelHosting: "cloud",
          provider: "openai",
          model: "unknown",
          modelInfo: {
            requestedModel: null,
            resolvedModel: null,
            reportedModel: null,
            modelSource: "not_available",
            confidence: "unknown",
            unknownReason: "codex_model_signal_not_available",
          },
          biller: "chatgpt",
          billingType: "subscription",
        },
      });
      expect(result.resultJson?.message).toContain("did not start Codex execution");
      await expect(fs.lstat(capturePath)).rejects.toMatchObject({ code: "ENOENT" });
      expect(logs).toContainEqual(
        expect.objectContaining({
          stream: "stdout",
          chunk: expect.stringContaining("Cloud-hosted Codex auth is missing; aborting before Codex execution begins."),
        }),
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousOpenAiKey;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("does not block local-hosted runs when cloud auth is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-local-no-cloud-auth-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.HOME = root;

    try {
      const result = await execute({
        runId: "run-local-no-auth",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          model: "gemma4:e4b",
          extraArgs: ["--oss", "--local-provider", "ollama"],
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorCode).toBeUndefined();
      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.runtimeContext.modelHosting).toBe("local");
      expect(capture.runtimeContext.provider).toBe("ollama");
      expect(capture.runtimeContext.model).toBe("gemma4:e4b");
      expect(capture.runtimeContext.modelInfo).toEqual({
        requestedModel: "gemma4:e4b",
        resolvedModel: "gemma4:e4b",
        reportedModel: null,
        modelSource: "adapter_request",
        confidence: "high",
        unknownReason: null,
      });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousOpenAiKey;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("allows cloud-hosted runs to proceed when auth presence is available", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-auth-present-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      const result = await execute({
        runId: "run-cloud-auth-present",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            OPENAI_API_KEY: "test-openai-key",
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorCode).toBeUndefined();
      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.runtimeContext.modelHosting).toBe("cloud");
      expect(capture.runtimeContext.provider).toBe("openai");
      expect(capture.runtimeContext.model).toBe("unknown");
      expect(capture.runtimeContext.modelInfo).toEqual({
        requestedModel: null,
        resolvedModel: null,
        reportedModel: null,
        modelSource: "not_available",
        confidence: "unknown",
        unknownReason: "codex_model_signal_not_available",
      });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("preserves an explicitly requested cloud model without claiming it is resolved", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-cloud-requested-model-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      const result = await execute({
        runId: "run-cloud-requested-model",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          model: "gpt-5.4-mini",
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            OPENAI_API_KEY: "test-openai-key",
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorCode).toBeUndefined();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.argv).toEqual(expect.arrayContaining(["--model", "gpt-5.4-mini"]));
      expect(capture.runtimeContext.modelHosting).toBe("cloud");
      expect(capture.runtimeContext.provider).toBe("openai");
      expect(capture.runtimeContext.model).toBe("unknown");
      expect(capture.runtimeContext.modelInfo).toEqual({
        requestedModel: "gpt-5.4-mini",
        resolvedModel: null,
        reportedModel: null,
        modelSource: "adapter_request",
        confidence: "medium",
        unknownReason: "codex_cloud_resolved_model_not_reported",
      });
      expect(result.resultJson?.runtimeContext).toMatchObject({
        executionRuntime: "local",
        modelHosting: "cloud",
        provider: "openai",
        model: "unknown",
        modelInfo: {
          requestedModel: "gpt-5.4-mini",
          resolvedModel: null,
          reportedModel: null,
          modelSource: "adapter_request",
          confidence: "medium",
          unknownReason: "codex_cloud_resolved_model_not_reported",
        },
      });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it.each([
    {
      label: "ASCII simple path",
      workspaceName: "paperclip-ascii",
      assertPreservation: (capturedPath: string) => {
        expect(capturedPath).toContain("paperclip-ascii");
      },
      expectWarning: false,
    },
    {
      label: "path with spaces",
      workspaceName: "paperclip with spaces",
      assertPreservation: (capturedPath: string) => {
        expect(capturedPath).toContain("paperclip with spaces");
        expect(capturedPath).not.toContain("paperclip%20with%20spaces");
      },
      expectWarning: false,
    },
    {
      label: "path with Swedish characters",
      workspaceName: "paperclip-nätverk",
      assertPreservation: (capturedPath: string) => {
        expect(capturedPath).toContain("paperclip-nätverk");
      },
      expectWarning: true,
      expectedPathClass: {
        asciiSafe: false,
        containsSpaces: false,
        containsNonAscii: true,
        containsDecomposedUnicode: true,
        containsPercentEncoding: false,
        riskLevel: "medium",
        reasons: expect.arrayContaining(["contains_non_ascii", "contains_decomposed_unicode"]),
      },
    },
    {
      label: "path with decomposed Unicode characters",
      workspaceName: "paperclip-na\u0308tverk",
      assertPreservation: (capturedPath: string) => {
        expect(capturedPath).toContain("paperclip-na\u0308tverk");
        expect(capturedPath).not.toContain("paperclip-nätverk");
        expect(capturedPath.normalize("NFC")).toContain("paperclip-nätverk");
      },
      expectWarning: true,
      expectedPathClass: {
        asciiSafe: false,
        containsSpaces: false,
        containsNonAscii: true,
        containsDecomposedUnicode: true,
        containsPercentEncoding: false,
        riskLevel: "medium",
        reasons: expect.arrayContaining(["contains_non_ascii", "contains_decomposed_unicode"]),
      },
    },
    {
      label: "path with percent-encoded characters",
      workspaceName: "paperclip%20encoded",
      assertPreservation: (capturedPath: string) => {
        expect(capturedPath).toContain("paperclip%20encoded");
        expect(capturedPath).not.toContain("paperclip encoded");
      },
      expectWarning: true,
      expectedPathClass: {
        asciiSafe: false,
        containsSpaces: false,
        containsNonAscii: false,
        containsDecomposedUnicode: false,
        containsPercentEncoding: true,
        riskLevel: "medium",
        reasons: expect.arrayContaining(["contains_percent_encoding"]),
      },
    },
  ])("preserves workspace path safely for $label", async ({ workspaceName, assertPreservation, expectWarning, expectedPathClass }) => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-path-"));
    const workspace = path.join(root, workspaceName);
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      let meta: Record<string, unknown> | null = null;
      const logs: LogEntry[] = [];
      const result = await execute({
        runId: `run-path-${workspaceName}`,
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          paperclipWorkspace: {
            cwd: workspace,
            source: "local_path",
            strategy: "direct",
            workspaceId: "ws-1",
            worktreePath: workspace,
          },
        },
        authToken: "run-jwt-token",
        onMeta: async (payload) => {
          meta = payload as Record<string, unknown>;
        },
        onLog: async (stream, chunk) => {
          logs.push({ stream, chunk });
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();
      expect(result.resultJson?.runtimeContext).toMatchObject({
        executionRuntime: "local",
        modelHosting: "cloud",
        provider: "openai",
      });

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      const realWorkspace = await fs.realpath(workspace);
      expect(capture.runtimeContext.modelHosting).toBe("cloud");
      expect(capture.runtimeContext.provider).toBe("openai");
      expect(capture.processCwd).toBe(realWorkspace);
      expect(capture.processCwdHex).toBe(utf8Hex(realWorkspace));
      expect(capture.workspaceEnv.cwd).toBe(workspace);
      expect(capture.workspaceEnv.cwdHex).toBe(utf8Hex(workspace));
      expect(capture.workspaceEnv.worktreePath).toBe(workspace);
      expect(capture.workspaceEnv.worktreePathHex).toBe(utf8Hex(workspace));
      expect(capture.workspaceEnv.source).toBe("local_path");
      expect(capture.argv.join(" ")).not.toContain(workspace);
      expect(meta?.cwd).toBe(workspace);
      expect(JSON.stringify(meta ?? {})).not.toContain("x-codex-turn-metadata");
      assertPreservation(capture.processCwd);
      assertPreservation(capture.workspaceEnv.cwd ?? "");
      if (expectWarning) {
        expect(result.resultJson?.warnings).toMatchObject([
          {
            type: "workspace_path_class_warning",
            severity: "info",
            code: "cloud_codex_non_ascii_workspace_path",
            runtimeContext: {
              executionRuntime: "local",
              modelHosting: "cloud",
              provider: "openai",
            },
            pathClass: expectedPathClass,
          },
        ]);
        expect(logs).toContainEqual(
          expect.objectContaining({
            stream: "stdout",
            chunk: expect.stringContaining("known websocket metadata issue"),
          }),
        );
      } else {
        expect(result.resultJson?.warnings).toBeUndefined();
        expect(logs.some((entry) => entry.chunk.includes("known websocket metadata issue"))).toBe(false);
      }
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("does not warn for non-ASCII paths when execution is local-hosted", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-local-nonascii-"));
    const workspace = path.join(root, "paperclip-nätverk");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    const previousOpenAiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    process.env.HOME = root;

    try {
      const logs: LogEntry[] = [];
      const result = await execute({
        runId: "run-local-nonascii-no-warning",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          model: "gemma4:e4b",
          extraArgs: ["--oss", "--local-provider", "ollama"],
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          paperclipWorkspace: {
            cwd: workspace,
            source: "local_path",
            strategy: "direct",
            workspaceId: "ws-1",
            worktreePath: workspace,
          },
        },
        authToken: "run-jwt-token",
        onLog: async (stream, chunk) => {
          logs.push({ stream, chunk });
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.resultJson?.warnings).toBeUndefined();
      expect(logs.some((entry) => entry.chunk.includes("known websocket metadata issue"))).toBe(false);
      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.runtimeContext.modelHosting).toBe("local");
      expect(capture.runtimeContext.provider).toBe("ollama");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousOpenAiKey === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousOpenAiKey;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("writes a lean managed config for local oss providers instead of inheriting heavy shared plugins", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-lean-local-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const managedCodexHome = path.join(
      paperclipHome,
      "instances",
      "default",
      "companies",
      "company-1",
      "codex-home",
    );
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(sharedCodexHome, { recursive: true });
    await writeFakeCodexNativeAuth(path.join(sharedCodexHome, "auth.json"));
    await fs.writeFile(
      path.join(sharedCodexHome, "config.toml"),
      [
        'model = "gpt-5.4"',
        'model_reasoning_effort = "high"',
        "",
        '[plugins."github@openai-curated"]',
        "enabled = true",
        "",
        '[plugins."build-web-apps@openai-curated"]',
        "enabled = true",
        "",
        `[projects.${JSON.stringify(workspace)}]`,
        'trust_level = "trusted"',
        "",
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(
      path.join(sharedCodexHome, "models_cache.json"),
      JSON.stringify({
        models: [
          {
            slug: "gpt-5.4",
            display_name: "gpt-5.4",
            description: "Template model",
            model_messages: {
              instructions_template: "{{base_instructions}}",
              instructions_variables: {},
            },
          },
        ],
      }, null, 2),
      "utf8",
    );
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    const previousPaperclipHome = process.env.PAPERCLIP_HOME;
    const previousPaperclipInstanceId = process.env.PAPERCLIP_INSTANCE_ID;
    const previousPaperclipInWorktree = process.env.PAPERCLIP_IN_WORKTREE;
    const previousCodexHome = process.env.CODEX_HOME;
    process.env.HOME = root;
    process.env.PAPERCLIP_HOME = paperclipHome;
    delete process.env.PAPERCLIP_INSTANCE_ID;
    delete process.env.PAPERCLIP_IN_WORKTREE;
    process.env.CODEX_HOME = sharedCodexHome;

    try {
      const logs: LogEntry[] = [];
      const result = await execute({
        runId: "run-lean-local",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          model: "gemma4:e4b",
          extraArgs: ["--oss", "--local-provider", "ollama"],
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async (stream, chunk) => {
          logs.push({ stream, chunk });
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.codexHome).toBe(managedCodexHome);
      expect(capture.argv).toEqual(
        expect.arrayContaining(["--oss", "--local-provider", "ollama", "--model", "gemma4:e4b"]),
      );
      expect(capture.prompt).toContain("- execution_runtime: local");
      expect(capture.prompt).toContain("- model_hosting: local");
      expect(capture.prompt).toContain("- provider: ollama");
      expect(capture.prompt).toContain("- model: gemma4:e4b");
      expect(capture.prompt).toContain("- requested_model: gemma4:e4b");
      expect(capture.prompt).toContain("- model_source: adapter_request");
      expect(capture.prompt).toContain("- model_confidence: high");
      expect(capture.runtimeContext).toEqual({
        execution: "local",
        modelHosting: "local",
        provider: "ollama",
        model: "gemma4:e4b",
        modelInfo: {
          requestedModel: "gemma4:e4b",
          resolvedModel: "gemma4:e4b",
          reportedModel: null,
          modelSource: "adapter_request",
          confidence: "high",
          unknownReason: null,
        },
        biller: "chatgpt",
        billingType: "subscription",
      });

      const managedConfig = await fs.readFile(path.join(managedCodexHome, "config.toml"), "utf8");
      const managedModelsCache = JSON.parse(
        await fs.readFile(path.join(managedCodexHome, "models_cache.json"), "utf8"),
      ) as { models?: Array<{ slug?: string; display_name?: string }> };
      expect(managedConfig).toContain('model_reasoning_effort = "medium"');
      expect(managedConfig).toContain('[plugins."github@openai-curated"]');
      expect(managedConfig).toContain('[plugins."build-web-apps@openai-curated"]');
      expect(managedConfig).toContain("enabled = false");
      expect(managedConfig).toContain(`[projects.${JSON.stringify(workspace)}]`);
      expect(managedConfig).toContain('trust_level = "trusted"');
      expect(managedConfig).not.toContain('model = "gpt-5.4"');
      expect(managedConfig).not.toContain('model_reasoning_effort = "high"');
      expect(managedModelsCache.models?.some((model) => model.slug === "gemma4:e4b" && model.display_name === "gemma4:e4b")).toBe(true);
      expect(logs).toContainEqual(
        expect.objectContaining({
          stream: "stdout",
          chunk: expect.stringContaining('lightweight local Codex config for provider "ollama"'),
        }),
      );
      expect(logs).toContainEqual(
        expect.objectContaining({
          stream: "stdout",
          chunk: expect.stringContaining('local model metadata alias for "gemma4:e4b"'),
        }),
      );
      expect(result.resultJson?.runtimeContext).toEqual({
        executionRuntime: "local",
        modelHosting: "local",
        provider: "ollama",
        model: "gemma4:e4b",
        modelInfo: {
          requestedModel: "gemma4:e4b",
          resolvedModel: "gemma4:e4b",
          reportedModel: null,
          modelSource: "adapter_request",
          confidence: "high",
        },
        biller: "chatgpt",
        billingType: "subscription",
      });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPaperclipHome === undefined) delete process.env.PAPERCLIP_HOME;
      else process.env.PAPERCLIP_HOME = previousPaperclipHome;
      if (previousPaperclipInstanceId === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
      else process.env.PAPERCLIP_INSTANCE_ID = previousPaperclipInstanceId;
      if (previousPaperclipInWorktree === undefined) delete process.env.PAPERCLIP_IN_WORKTREE;
      else process.env.PAPERCLIP_IN_WORKTREE = previousPaperclipInWorktree;
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("emits a command note that Codex auto-applies repo-scoped AGENTS.md files", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-notes-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    let commandNotes: string[] = [];
    try {
      const result = await execute({
        runId: "run-notes",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
        onMeta: async (meta) => {
          commandNotes = Array.isArray(meta.commandNotes) ? meta.commandNotes : [];
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();
      expect(commandNotes).toContain(
        "Codex exec automatically applies repo-scoped AGENTS.md instructions from the current workspace; Paperclip does not currently suppress that discovery.",
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("logs HOME and the resolved executable path in invocation metadata", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-meta-"));
    const workspace = path.join(root, "workspace");
    const binDir = path.join(root, "bin");
    const commandPath = path.join(binDir, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(binDir, { recursive: true });
    await writeFakeCodexCommand(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    const previousPath = process.env.PATH;
    process.env.HOME = root;
    process.env.PATH = `${binDir}${path.delimiter}${process.env.PATH ?? ""}`;

    let loggedCommand: string | null = null;
    let loggedEnv: Record<string, string> = {};
    try {
      const result = await execute({
        runId: "run-meta",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: "codex",
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
        onMeta: async (meta) => {
          loggedCommand = meta.command;
          loggedEnv = meta.env ?? {};
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();
      expect(loggedCommand).toBe(commandPath);
      expect(loggedEnv.HOME).toBe(root);
      expect(loggedEnv.PAPERCLIP_RESOLVED_COMMAND).toBe(commandPath);
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("injects structured Paperclip wake payloads into env and prompt", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-wake-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      const result = await execute({
        runId: "run-wake",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          issueId: "issue-1",
          taskId: "issue-1",
          wakeReason: "issue_commented",
          wakeCommentId: "comment-2",
          paperclipWake: {
            reason: "issue_commented",
            issue: {
              id: "issue-1",
              identifier: "PAP-874",
              title: "chat-speed issues",
              status: "in_progress",
              priority: "medium",
            },
            commentIds: ["comment-1", "comment-2"],
            latestCommentId: "comment-2",
            comments: [
              {
                id: "comment-1",
                issueId: "issue-1",
                body: "First comment",
                bodyTruncated: false,
                createdAt: "2026-03-28T14:35:00.000Z",
                author: { type: "user", id: "user-1" },
              },
              {
                id: "comment-2",
                issueId: "issue-1",
                body: "Second comment",
                bodyTruncated: false,
                createdAt: "2026-03-28T14:35:10.000Z",
                author: { type: "user", id: "user-1" },
              },
            ],
            commentWindow: {
              requestedCount: 2,
              includedCount: 2,
              missingCount: 0,
            },
            truncated: false,
            fallbackFetchNeeded: false,
          },
        },
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode, JSON.stringify(result)).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.paperclipEnvKeys).toContain("PAPERCLIP_WAKE_PAYLOAD_JSON");
      expect(capture.paperclipWakePayloadJson).not.toBeNull();
      expect(JSON.parse(capture.paperclipWakePayloadJson ?? "{}")).toMatchObject({
        reason: "issue_commented",
        latestCommentId: "comment-2",
        commentIds: ["comment-1", "comment-2"],
      });
      expect(capture.prompt).toContain("## Paperclip Wake Payload");
      expect(capture.prompt).toContain("Treat this wake payload as the highest-priority change for the current heartbeat.");
      expect(capture.prompt).toContain("Do not switch to another issue until you have handled this wake.");
      expect(capture.prompt).toContain(
        "acknowledge the latest comment and explain how it changes your next action.",
      );
      expect(capture.prompt).toContain("First comment");
      expect(capture.prompt).toContain("Second comment");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("renders execution-stage wake instructions for reviewer and executor roles", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-stage-wake-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      const result = await execute({
        runId: "run-stage-wake",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          issueId: "issue-1",
          taskId: "issue-1",
          wakeReason: "execution_review_requested",
          paperclipWake: {
            reason: "execution_review_requested",
            issue: {
              id: "issue-1",
              identifier: "PAP-1207",
              title: "implement the plan of PAP-1200",
              status: "in_review",
              priority: "medium",
            },
            executionStage: {
              wakeRole: "reviewer",
              stageId: "stage-1",
              stageType: "review",
              currentParticipant: { type: "agent", agentId: "qa-agent" },
              returnAssignee: { type: "agent", agentId: "coder-agent" },
              lastDecisionOutcome: null,
              allowedActions: ["approve", "request_changes"],
            },
            commentIds: [],
            latestCommentId: null,
            comments: [],
            commentWindow: {
              requestedCount: 0,
              includedCount: 0,
              missingCount: 0,
            },
            truncated: false,
            fallbackFetchNeeded: false,
          },
        },
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.prompt).toContain("execution wake role: reviewer");
      expect(capture.prompt).toContain("You are waking as the active reviewer for this issue.");
      expect(capture.prompt).toContain("Do not execute the task itself or continue executor work.");
      expect(capture.prompt).toContain("allowed actions: approve, request_changes");

      const executorCapturePath = path.join(root, "capture-executor.json");
      const executorResult = await execute({
        runId: "run-stage-wake-executor",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: executorCapturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          issueId: "issue-1",
          taskId: "issue-1",
          wakeReason: "execution_changes_requested",
          paperclipWake: {
            reason: "execution_changes_requested",
            issue: {
              id: "issue-1",
              identifier: "PAP-1207",
              title: "implement the plan of PAP-1200",
              status: "in_progress",
              priority: "medium",
            },
            executionStage: {
              wakeRole: "executor",
              stageId: "stage-1",
              stageType: "review",
              currentParticipant: { type: "agent", agentId: "qa-agent" },
              returnAssignee: { type: "agent", agentId: "coder-agent" },
              lastDecisionOutcome: "changes_requested",
              allowedActions: ["address_changes", "resubmit"],
            },
            commentIds: [],
            latestCommentId: null,
            comments: [],
            commentWindow: {
              requestedCount: 0,
              includedCount: 0,
              missingCount: 0,
            },
            truncated: false,
            fallbackFetchNeeded: false,
          },
        },
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(executorResult.exitCode).toBe(0);
      const executorCapture = JSON.parse(await fs.readFile(executorCapturePath, "utf8")) as CapturePayload;
      expect(executorCapture.prompt).toContain("execution wake role: executor");
      expect(executorCapture.prompt).toContain("You are waking because changes were requested in the execution workflow.");
      expect(executorCapture.prompt).toContain("allowed actions: address_changes, resubmit");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("renders an issue-scoped wake prompt even when the wake has no comments yet", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-issue-wake-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      const result = await execute({
        runId: "run-issue-wake",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          issueId: "issue-1",
          taskId: "issue-1",
          wakeReason: "issue_assigned",
          paperclipWake: {
            reason: "issue_assigned",
            issue: {
              id: "issue-1",
              identifier: "PAP-1201",
              title: "Fix gallery opening for inline images",
              description: "If revenue is 200 and cost is 100, answer with the net profit only.",
              status: "todo",
              priority: "medium",
            },
            commentIds: [],
            latestCommentId: null,
            comments: [],
            commentWindow: {
              requestedCount: 0,
              includedCount: 0,
              missingCount: 0,
            },
            truncated: false,
            fallbackFetchNeeded: false,
          },
        },
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.paperclipEnvKeys).toContain("PAPERCLIP_WAKE_PAYLOAD_JSON");
      expect(capture.paperclipWakePayloadJson).not.toBeNull();
      expect(JSON.parse(capture.paperclipWakePayloadJson ?? "{}")).toMatchObject({
        reason: "issue_assigned",
        issue: {
          identifier: "PAP-1201",
          title: "Fix gallery opening for inline images",
          description: "If revenue is 200 and cost is 100, answer with the net profit only.",
          status: "todo",
          priority: "medium",
        },
        commentIds: [],
      });
      expect(capture.prompt).toContain("## Paperclip Wake Payload");
      expect(capture.prompt).toContain("Do not switch to another issue until you have handled this wake.");
      expect(capture.prompt).toContain("Before exploring the repo or scanning the workspace, checkout this issue and read its Paperclip issue context.");
      expect(capture.prompt).toContain("If the issue can be answered directly from the issue title, description, or new comments, reply briefly and stop.");
      expect(capture.prompt).toContain("For simple issue questions, do not use planning tools and do not attempt skill-execution tool calls.");
      expect(capture.prompt).toContain("- issue: PAP-1201 Fix gallery opening for inline images");
      expect(capture.prompt).toContain("- issue description: If revenue is 200 and cost is 100, answer with the net profit only.");
      expect(capture.prompt).toContain("- pending comments: 0/0");
      expect(capture.prompt).toContain("- issue status: todo");
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("surfaces an explicit local fallback handshake request into runtime diagnostics payload", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-local-fallback-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    await fs.mkdir(workspace, { recursive: true });
    await writeFakeCodexCommand(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    try {
      const result = await execute({
        runId: "run-local-fallback-payload",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          paperclipLocalFallbackRequest: {
            requestType: "local_fallback_candidate",
            taskClass: "local_short_summary",
            privacyBenefit: true,
            requiresStrictJson: false,
            requiresCodeEdit: false,
            requiresCommandExecution: false,
            userExplicitlyRequestedLocal: true,
          },
        },
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      expect(result.resultJson?.runtimeContext).toMatchObject({
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
          recommendedFallback: "stronger_model",
        },
      });
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("uses a compact wake delta instead of the full heartbeat prompt when resuming a session", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-resume-wake-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    const instructionsPath = path.join(root, "AGENTS.md");
    await fs.mkdir(workspace, { recursive: true });
    await fs.writeFile(instructionsPath, "You are managed instructions.\n", "utf8");
    await writeFakeCodexCommand(commandPath);
    await writeFakeCodexNativeAuth(path.join(root, ".codex", "auth.json"));

    const previousHome = process.env.HOME;
    process.env.HOME = root;

    let invocationPrompt = "";
    let invocationNotes: string[] = [];
    let promptMetrics: Record<string, number> = {};
    try {
      const result = await execute({
        runId: "run-resume-wake",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: {
            sessionId: "codex-session-1",
            cwd: workspace,
          },
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          instructionsFilePath: instructionsPath,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {
          issueId: "issue-1",
          taskId: "issue-1",
          wakeReason: "issue_commented",
          wakeCommentId: "comment-2",
          paperclipWake: {
            reason: "issue_commented",
            issue: {
              id: "issue-1",
              identifier: "PAP-874",
              title: "chat-speed issues",
              status: "in_progress",
              priority: "medium",
            },
            commentIds: ["comment-2"],
            latestCommentId: "comment-2",
            comments: [
              {
                id: "comment-2",
                issueId: "issue-1",
                body: "Second comment",
                bodyTruncated: false,
                createdAt: "2026-03-28T14:35:10.000Z",
                author: { type: "user", id: "user-1" },
              },
            ],
            commentWindow: {
              requestedCount: 1,
              includedCount: 1,
              missingCount: 0,
            },
            truncated: false,
            fallbackFetchNeeded: false,
          },
        },
        authToken: "run-jwt-token",
        onLog: async () => {},
        onMeta: async (meta) => {
          invocationPrompt = meta.prompt ?? "";
          invocationNotes = meta.commandNotes ?? [];
          promptMetrics = meta.promptMetrics ?? {};
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.argv).toEqual(expect.arrayContaining(["resume", "codex-session-1", "-"]));
      expect(capture.prompt).toContain("## Paperclip Resume Delta");
      expect(capture.prompt).toContain("Do not switch to another issue until you have handled this wake.");
      expect(capture.prompt).toContain("Before exploring the repo or scanning the workspace, checkout this issue and read its Paperclip issue context.");
      expect(capture.prompt).toContain("If the issue can be answered directly from the issue title, description, or new comments, reply briefly and stop.");
      expect(capture.prompt).toContain("For simple issue questions, do not use planning tools and do not attempt skill-execution tool calls.");
      expect(capture.prompt).toContain('paperclip-web-search "query"');
      expect(capture.prompt).toContain("Do not claim there is no news or no public information after one weak search.");
      expect(capture.prompt).toContain("Second comment");
      expect(capture.prompt).not.toContain("Follow the paperclip heartbeat.");
      expect(capture.prompt).not.toContain("You are managed instructions.");
      expect(invocationPrompt).toContain("## Paperclip Resume Delta");
      expect(invocationPrompt).toContain('paperclip-web-search "query"');
      expect(invocationNotes).toContain(
        "Skipped stdin instruction reinjection because an existing Codex session is being resumed with a wake delta.",
      );
      expect(promptMetrics.instructionsChars).toBe(0);
      expect(promptMetrics.heartbeatPromptChars).toBe(0);
      expect(promptMetrics.runtimeCapabilityChars).toBeGreaterThan(0);
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("uses a worktree-isolated CODEX_HOME while preserving shared auth and config", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    const isolatedCodexHome = path.join(
      paperclipHome,
      "instances",
      "worktree-1",
      "companies",
      "company-1",
      "codex-home",
    );
    const homeSkill = path.join(isolatedCodexHome, "skills", "paperclip");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(sharedCodexHome, { recursive: true });
    await writeFakeCodexNativeAuth(path.join(sharedCodexHome, "auth.json"));
    await fs.writeFile(path.join(sharedCodexHome, "config.toml"), 'model = "codex-mini-latest"\n', "utf8");
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    const previousPaperclipHome = process.env.PAPERCLIP_HOME;
    const previousPaperclipInstanceId = process.env.PAPERCLIP_INSTANCE_ID;
    const previousPaperclipInWorktree = process.env.PAPERCLIP_IN_WORKTREE;
    const previousCodexHome = process.env.CODEX_HOME;
    process.env.HOME = root;
    process.env.PAPERCLIP_HOME = paperclipHome;
    process.env.PAPERCLIP_INSTANCE_ID = "worktree-1";
    process.env.PAPERCLIP_IN_WORKTREE = "true";
    process.env.CODEX_HOME = sharedCodexHome;

    try {
      const logs: LogEntry[] = [];
      const result = await execute({
        runId: "run-1",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async (stream, chunk) => {
          logs.push({ stream, chunk });
        },
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.codexHome).toBe(isolatedCodexHome);
      expect(capture.argv).toEqual(expect.arrayContaining(["exec", "--json", "-"]));
      expect(capture.prompt).toContain("Follow the paperclip heartbeat.");
      expect(capture.paperclipEnvKeys).toEqual(
        expect.arrayContaining([
          "PAPERCLIP_AGENT_ID",
          "PAPERCLIP_API_KEY",
          "PAPERCLIP_API_URL",
          "PAPERCLIP_COMPANY_ID",
          "PAPERCLIP_RUN_ID",
        ]),
      );

      const isolatedAuth = path.join(isolatedCodexHome, "auth.json");
      const isolatedConfig = path.join(isolatedCodexHome, "config.toml");

      expect((await fs.lstat(isolatedAuth)).isSymbolicLink()).toBe(true);
      expect(await fs.realpath(isolatedAuth)).toBe(await fs.realpath(path.join(sharedCodexHome, "auth.json")));
      expect((await fs.lstat(isolatedConfig)).isFile()).toBe(true);
      expect(await fs.readFile(isolatedConfig, "utf8")).toBe('model = "codex-mini-latest"\n');
      expect((await fs.lstat(homeSkill)).isSymbolicLink()).toBe(true);
      expect(logs).toContainEqual(
        expect.objectContaining({
          stream: "stdout",
          chunk: expect.stringContaining("Using worktree-isolated Codex home"),
        }),
      );
      expect(logs).toContainEqual(
        expect.objectContaining({
          stream: "stdout",
          chunk: expect.stringContaining('Injected Codex skill "paperclip"'),
        }),
      );
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPaperclipHome === undefined) delete process.env.PAPERCLIP_HOME;
      else process.env.PAPERCLIP_HOME = previousPaperclipHome;
      if (previousPaperclipInstanceId === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
      else process.env.PAPERCLIP_INSTANCE_ID = previousPaperclipInstanceId;
      if (previousPaperclipInWorktree === undefined) delete process.env.PAPERCLIP_IN_WORKTREE;
      else process.env.PAPERCLIP_IN_WORKTREE = previousPaperclipInWorktree;
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("surfaces the configured cloud model from an explicit CODEX_HOME override", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-explicit-cloud-model-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const explicitCodexHome = path.join(root, "explicit-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(sharedCodexHome, { recursive: true });
    await fs.mkdir(explicitCodexHome, { recursive: true });
    await writeFakeCodexNativeAuth(path.join(sharedCodexHome, "auth.json"));
    await writeFakeCodexNativeAuth(path.join(explicitCodexHome, "auth.json"));
    await fs.writeFile(path.join(sharedCodexHome, "config.toml"), 'model = "gpt-5.4"\n', "utf8");
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    const previousPaperclipHome = process.env.PAPERCLIP_HOME;
    const previousPaperclipInstanceId = process.env.PAPERCLIP_INSTANCE_ID;
    const previousPaperclipInWorktree = process.env.PAPERCLIP_IN_WORKTREE;
    const previousCodexHome = process.env.CODEX_HOME;
    process.env.HOME = root;
    process.env.PAPERCLIP_HOME = paperclipHome;
    process.env.PAPERCLIP_INSTANCE_ID = "worktree-1";
    process.env.PAPERCLIP_IN_WORKTREE = "true";
    process.env.CODEX_HOME = sharedCodexHome;

    try {
      const result = await execute({
        runId: "run-explicit-cloud-model",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            CODEX_HOME: explicitCodexHome,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();
      expect(result.resultJson?.runtimeContext).toEqual({
        executionRuntime: "local",
        modelHosting: "cloud",
        provider: "openai",
        model: "unknown",
        modelInfo: {
          requestedModel: "gpt-5.4",
          resolvedModel: null,
          reportedModel: null,
          modelSource: "codex_home_config",
          confidence: "low",
          unknownReason: "codex_cloud_resolved_model_not_reported",
        },
        biller: "chatgpt",
        billingType: "subscription",
      });

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.codexHome).toBe(explicitCodexHome);
      expect(capture.prompt).toContain("- model: unknown");
      expect(capture.prompt).toContain("- requested_model: gpt-5.4");
      expect(capture.prompt).toContain("- model_source: codex_home_config");
      expect(capture.prompt).toContain("- model_confidence: low");
      expect(capture.runtimeContext).toEqual({
        execution: "local",
        modelHosting: "cloud",
        provider: "openai",
        model: "unknown",
        modelInfo: {
          requestedModel: "gpt-5.4",
          resolvedModel: null,
          reportedModel: null,
          modelSource: "codex_home_config",
          confidence: "low",
          unknownReason: "codex_cloud_resolved_model_not_reported",
        },
        biller: "chatgpt",
        billingType: "subscription",
      });
      expect(await fs.readFile(path.join(explicitCodexHome, "config.toml"), "utf8")).toContain('model = "gpt-5.4"');
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPaperclipHome === undefined) delete process.env.PAPERCLIP_HOME;
      else process.env.PAPERCLIP_HOME = previousPaperclipHome;
      if (previousPaperclipInstanceId === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
      else process.env.PAPERCLIP_INSTANCE_ID = previousPaperclipInstanceId;
      if (previousPaperclipInWorktree === undefined) delete process.env.PAPERCLIP_IN_WORKTREE;
      else process.env.PAPERCLIP_IN_WORKTREE = previousPaperclipInWorktree;
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("respects an explicit CODEX_HOME config override even in worktree mode", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-codex-execute-explicit-"));
    const workspace = path.join(root, "workspace");
    const commandPath = path.join(root, "codex");
    const capturePath = path.join(root, "capture.json");
    const sharedCodexHome = path.join(root, "shared-codex-home");
    const explicitCodexHome = path.join(root, "explicit-codex-home");
    const paperclipHome = path.join(root, "paperclip-home");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(sharedCodexHome, { recursive: true });
    await writeFakeCodexNativeAuth(path.join(sharedCodexHome, "auth.json"));
    await fs.writeFile(
      path.join(sharedCodexHome, "config.toml"),
      [
        'model = "gpt-5.4"',
        'model_reasoning_effort = "high"',
        "",
        '[plugins."github@openai-curated"]',
        "enabled = true",
        "",
      ].join("\n"),
      "utf8",
    );
    await fs.writeFile(
      path.join(sharedCodexHome, "models_cache.json"),
      JSON.stringify({
        models: [
          {
            slug: "gpt-5.4",
            display_name: "gpt-5.4",
            description: "Template model",
            model_messages: {
              instructions_template: "{{base_instructions}}",
              instructions_variables: {},
            },
          },
        ],
      }, null, 2),
      "utf8",
    );
    await writeFakeCodexCommand(commandPath);

    const previousHome = process.env.HOME;
    const previousPaperclipHome = process.env.PAPERCLIP_HOME;
    const previousPaperclipInstanceId = process.env.PAPERCLIP_INSTANCE_ID;
    const previousPaperclipInWorktree = process.env.PAPERCLIP_IN_WORKTREE;
    const previousCodexHome = process.env.CODEX_HOME;
    process.env.HOME = root;
    process.env.PAPERCLIP_HOME = paperclipHome;
    process.env.PAPERCLIP_INSTANCE_ID = "worktree-1";
    process.env.PAPERCLIP_IN_WORKTREE = "true";
    process.env.CODEX_HOME = sharedCodexHome;

    try {
      const result = await execute({
        runId: "run-2",
        agent: {
          id: "agent-1",
          companyId: "company-1",
          name: "Codex Coder",
          adapterType: "codex_local",
          adapterConfig: {},
        },
        runtime: {
          sessionId: null,
          sessionParams: null,
          sessionDisplayId: null,
          taskKey: null,
        },
        config: {
          command: commandPath,
          cwd: workspace,
          model: "gemma4:e4b",
          extraArgs: ["--oss", "--local-provider", "ollama"],
          env: {
            PAPERCLIP_TEST_CAPTURE_PATH: capturePath,
            CODEX_HOME: explicitCodexHome,
          },
          promptTemplate: "Follow the paperclip heartbeat.",
        },
        context: {},
        authToken: "run-jwt-token",
        onLog: async () => {},
      });

      expect(result.exitCode).toBe(0);
      expect(result.errorMessage).toBeNull();

      const capture = JSON.parse(await fs.readFile(capturePath, "utf8")) as CapturePayload;
      expect(capture.codexHome).toBe(explicitCodexHome);
      expect((await fs.lstat(path.join(explicitCodexHome, "skills", "paperclip"))).isSymbolicLink()).toBe(true);
      expect(await fs.readFile(path.join(explicitCodexHome, "config.toml"), "utf8")).toContain('model_reasoning_effort = "medium"');
      const explicitModelsCache = JSON.parse(
        await fs.readFile(path.join(explicitCodexHome, "models_cache.json"), "utf8"),
      ) as { models?: Array<{ slug?: string }> };
      expect(explicitModelsCache.models?.some((model) => model.slug === "gemma4:e4b")).toBe(true);
      await expect(fs.lstat(path.join(paperclipHome, "instances", "worktree-1", "codex-home"))).rejects.toThrow();
    } finally {
      if (previousHome === undefined) delete process.env.HOME;
      else process.env.HOME = previousHome;
      if (previousPaperclipHome === undefined) delete process.env.PAPERCLIP_HOME;
      else process.env.PAPERCLIP_HOME = previousPaperclipHome;
      if (previousPaperclipInstanceId === undefined) delete process.env.PAPERCLIP_INSTANCE_ID;
      else process.env.PAPERCLIP_INSTANCE_ID = previousPaperclipInstanceId;
      if (previousPaperclipInWorktree === undefined) delete process.env.PAPERCLIP_IN_WORKTREE;
      else process.env.PAPERCLIP_IN_WORKTREE = previousPaperclipInWorktree;
      if (previousCodexHome === undefined) delete process.env.CODEX_HOME;
      else process.env.CODEX_HOME = previousCodexHome;
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
