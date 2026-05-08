// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SetupHealth } from "./SetupHealth";
import {
  buildAnalyzeWorkspaceRequest,
  prepareAnalyzeWorkspaceHandoff,
  buildAnalyzeWorkspaceSetupState,
  buildSetupHealthViewModel,
  classifyWorkspacePathForSetupHealth,
  validateAnalyzeWorkspaceRequest,
} from "@/lib/setup-health";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const healthGetMock = vi.fn();
const heartbeatsListMock = vi.fn();
const analyzeWorkspaceCollectMetadataMock = vi.fn();
const analyzeWorkspaceReadmeExcerptMock = vi.fn();
const analyzeWorkspaceManifestFieldsMock = vi.fn();

vi.mock("@/context/CompanyContext", () => ({
  useCompany: () => ({ selectedCompanyId: "company-1" }),
}));

vi.mock("@/api/health", () => ({
  healthApi: {
    get: () => healthGetMock(),
  },
}));

vi.mock("@/api/heartbeats", () => ({
  heartbeatsApi: {
    list: (companyId: string, agentId?: string, limit?: number) =>
      heartbeatsListMock(companyId, agentId, limit),
  },
}));

vi.mock("@/api/analyze-workspace", () => ({
  analyzeWorkspaceApi: {
    collectMetadata: (input: unknown) => analyzeWorkspaceCollectMetadataMock(input),
    readmeExcerpt: (input: unknown) => analyzeWorkspaceReadmeExcerptMock(input),
    manifestFields: (input: unknown) => analyzeWorkspaceManifestFieldsMock(input),
  },
}));

function renderSetupHealth(container: HTMLDivElement) {
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <SetupHealth />
      </QueryClientProvider>,
    );
  });

  return root;
}

describe("SetupHealth", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    healthGetMock.mockReset();
    heartbeatsListMock.mockReset();
    healthGetMock.mockResolvedValue({
      status: "ok",
      authReady: true,
      deploymentMode: "authenticated",
    });
    heartbeatsListMock.mockResolvedValue([]);
    analyzeWorkspaceCollectMetadataMock.mockReset();
    analyzeWorkspaceReadmeExcerptMock.mockReset();
    analyzeWorkspaceManifestFieldsMock.mockReset();
    analyzeWorkspaceCollectMetadataMock.mockResolvedValue({
      ok: true,
      snapshot: {
        schemaVersion: 1,
        snapshotType: "analyze_workspace_metadata_snapshot",
        collectionMode: "future_filesystem_read",
        workspace: {
          displayName: "paperclip-app",
          pathHealth: { risk: "none", reasons: [] },
        },
        topLevelEntries: [
          { name: "README.md", kind: "file" },
          { name: "package.json", kind: "file" },
          { name: "pnpm-lock.yaml", kind: "file" },
        ],
        manifestIndicators: [
          { name: "README.md", present: true, category: "readme" },
          { name: "package.json", present: true, category: "javascript" },
          { name: "pnpm-lock.yaml", present: true, category: "javascript" },
        ],
        limits: {
          maxTopLevelEntries: 50,
          recursiveScan: false,
          fileContentsRead: false,
          commandsRun: false,
          networkAccessed: false,
        },
        redactions: [],
        notCollected: [
          "No file contents were read.",
        ],
        safety: {
          readOnly: true,
          filesChanged: false,
          commandsRun: false,
          networkAccessed: false,
          agentStarted: false,
          localFallbackUsed: false,
          automaticRoutingUsed: false,
        },
      },
      warnings: [
        "Collection is filename-only.",
        "No file contents were read.",
      ],
    });
    analyzeWorkspaceReadmeExcerptMock.mockResolvedValue({
      ok: true,
      excerpt: {
        schemaVersion: 1,
        excerptType: "analyze_workspace_readme_excerpt",
        filename: "README.md",
        bytesRead: 48,
        truncated: false,
        content: "# Paperclip App\n\nA safe workspace summary demo.\n",
        safety: {
          readOnly: true,
          filesChanged: false,
          commandsRun: false,
          networkAccessed: false,
          aiUsed: false,
          recursiveScan: false,
          followedSymlink: false,
        },
      },
    });
    analyzeWorkspaceManifestFieldsMock.mockResolvedValue({
      ok: true,
      manifest: {
        schemaVersion: 1,
        fieldsType: "analyze_workspace_manifest_fields",
        filename: "package.json",
        kind: "package_json",
        bytesRead: 220,
        truncated: false,
        confidence: "high",
        fields: {
          name: "paperclip-app",
          description: "A safe workspace summary demo.",
          language: "JavaScript",
          packageManagerHints: ["npm-compatible"],
          frameworkHints: ["React", "Vite"],
          scripts: ["dev", "build", "test"],
          dependencies: ["react", "vite"],
          devDependencies: ["typescript", "vitest"],
        },
        omitted: ["script command values", "dependency versions", "raw manifest content"],
        safety: {
          readOnly: true,
          filesChanged: false,
          commandsRun: false,
          networkAccessed: false,
          aiUsed: false,
          recursiveScan: false,
          followedSymlink: false,
        },
      },
    });
  });

  afterEach(() => {
    container.remove();
  });

  it("returns a safe fallback view model when diagnostics are missing", () => {
    const viewModel = buildSetupHealthViewModel(undefined);

    expect(viewModel.overallStatus).toBe("needs_attention");
    expect(viewModel.primaryAction.disabled).toBe(true);
    expect(viewModel.cards.find((card) => card.id === "cloud_ai")?.summary).toBe("Cloud AI status is not known yet.");
    expect(viewModel.cards.find((card) => card.id === "workspace")?.summary).toBe("Choose a workspace before starting.");
  });

  it("maps connected Cloud AI to a ready card", () => {
    const viewModel = buildSetupHealthViewModel({
      cloudAi: {
        authStatus: "connected",
        provider: "OpenAI",
        modelHosting: "cloud",
      },
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
        pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Projects/paperclip-app"),
      },
      runtime: {
        lastRunStatus: "success",
        warnings: [],
      },
    });

    expect(viewModel.cards.find((card) => card.id === "cloud_ai")?.summary).toBe("Cloud AI is connected and ready.");
  });

  it("maps missing Cloud AI to needs-attention copy", () => {
    const viewModel = buildSetupHealthViewModel({
      cloudAi: {
        authStatus: "missing",
      },
    });

    expect(viewModel.cards.find((card) => card.id === "cloud_ai")?.summary).toBe(
      "Cloud AI is not connected. Sign in or reconnect to run cloud Codex tasks.",
    );
  });

  it("keeps Local AI available as optional wording", () => {
    const viewModel = buildSetupHealthViewModel({
      localAi: {
        status: "available_candidate",
        runtime: "ollama",
        model: "gemma4:e4b",
      },
    });

    expect(viewModel.cards.find((card) => card.id === "local_ai")?.summary).toBe(
      "Local AI is available for small private drafts.",
    );
    expect(viewModel.cards.find((card) => card.id === "local_ai")?.status).toBe("optional");
  });

  it("renders workspace medium risk as a warning without blocking tasks", () => {
    const viewModel = buildSetupHealthViewModel({
      workspace: {
        selected: true,
        path: "/Users/example/Cafe\u0301",
        pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Cafe\u0301"),
      },
    });

    expect(viewModel.cards.find((card) => card.id === "workspace")?.summary).toBe(
      "This workspace path may slow some cloud runs, but tasks should still work.",
    );
    expect(viewModel.primaryAction.disabled).toBeFalsy();
  });

  it("returns null from buildAnalyzeWorkspaceRequest without a workspace", () => {
    const request = buildAnalyzeWorkspaceRequest({});

    expect(request).toBeNull();
  });

  it("builds a valid analyze-workspace request for a selected workspace", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
        displayName: "paperclip-app",
        pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Projects/paperclip-app"),
      },
    });

    expect(request).not.toBeNull();
    expect(request?.requestType).toBe("analyze_workspace");
    expect(request?.workspace.selected).toBe(true);
    expect(request?.workspace.path).toBe("/Users/example/Projects/paperclip-app");
  });

  it("buildAnalyzeWorkspaceRequest uses strict safety flags", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
      },
    });

    expect(request?.safety.readOnly).toBe(true);
    expect(request?.safety.allowFileWrites).toBe(false);
    expect(request?.safety.allowCommandExecution).toBe(false);
    expect(request?.safety.allowNetworkAccess).toBe(false);
  });

  it("keeps local fallback and automatic routing disabled in the request", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
      },
    });

    expect(request?.runtimePreference.allowLocalFallback).toBe(false);
    expect(request?.runtimePreference.allowAutomaticRouting).toBe(false);
  });

  it("allows request construction for a warning workspace path", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Cafe\u0301",
        pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Cafe\u0301"),
      },
    });

    expect(request).not.toBeNull();
    expect(request?.workspace.pathHealth?.risk).toBe("medium");
  });

  it("validation rejects a null request", () => {
    const validation = validateAnalyzeWorkspaceRequest(null);

    expect(validation.ok).toBe(false);
  });

  it("validation rejects an unsafe mutated request", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
      },
    });

    const mutatedRequest = request ? {
      ...request,
      safety: {
        ...request.safety,
        allowCommandExecution: true as false,
      },
    } : null;

    const validation = validateAnalyzeWorkspaceRequest(mutatedRequest);

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors.some((error) => error.includes("allowCommandExecution"))).toBe(true);
    }
  });

  it("renders developer tools partial copy for missing tools", () => {
    const viewModel = buildSetupHealthViewModel({
      developerTools: {
        gitAvailable: true,
        nodeAvailable: false,
        pnpmAvailable: null,
        swiftAvailable: null,
      },
    });

    expect(viewModel.cards.find((card) => card.id === "developer_tools")?.summary).toBe(
      "Some developer tools are missing, but read-only analysis can still work.",
    );
  });

  it("renders runtime warnings as a degraded state", () => {
    const viewModel = buildSetupHealthViewModel({
      runtime: {
        lastRunStatus: "success",
        warnings: [
          {
            code: "model_signal_partial",
            message: "Resolved model signal may be incomplete in some cloud runs.",
            severity: "warning",
          },
        ],
      },
    });

    expect(viewModel.cards.find((card) => card.id === "runtime")?.status).toBe("degraded");
    expect(viewModel.cards.find((card) => card.id === "runtime")?.summary).toBe(
      "Paperclip can run, but some diagnostics need attention.",
    );
  });

  it("disables Analyze this workspace when no workspace is selected", () => {
    const viewModel = buildSetupHealthViewModel({
      workspace: {
        selected: false,
      },
    });

    expect(viewModel.primaryAction.disabled).toBe(true);
  });

  it("enables Analyze this workspace when a workspace is ready", () => {
    const viewModel = buildSetupHealthViewModel({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
        displayName: "paperclip-app",
        pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Projects/paperclip-app"),
      },
    });

    expect(viewModel.primaryAction.disabled).toBe(false);
  });

  it("classifies a decomposed Unicode path as medium risk", () => {
    const pathHealth = classifyWorkspacePathForSetupHealth("/Users/example/Cafe\u0301");

    expect(pathHealth.risk).toBe("medium");
    expect(pathHealth.containsDecomposedUnicode).toBe(true);
  });

  it("classifies an ASCII path with no spaces as none risk", () => {
    const pathHealth = classifyWorkspacePathForSetupHealth("/Users/example/Projects/paperclip-app");

    expect(pathHealth.risk).toBe("none");
  });

  it("classifies a path with spaces only as low risk", () => {
    const pathHealth = classifyWorkspacePathForSetupHealth("/Users/example/Paperclip App");

    expect(pathHealth.risk).toBe("low");
    expect(pathHealth.containsSpaces).toBe(true);
  });

  it("builds a setup-ready state for a selected workspace", () => {
    const setupState = buildAnalyzeWorkspaceSetupState({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
        displayName: "paperclip-app",
        pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Projects/paperclip-app"),
      },
    });

    expect(setupState.canContinue).toBe(true);
    expect(setupState.title).toBe("Ready to run read-only analysis");
  });

  it("prepareAnalyzeWorkspaceHandoff accepts a valid request", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
        displayName: "paperclip-app",
        pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Projects/paperclip-app"),
      },
    });

    const handoff = prepareAnalyzeWorkspaceHandoff(request);

    expect(handoff.accepted).toBe(true);
    expect(handoff.validation.ok).toBe(true);
  });

  it("valid handoff always keeps all execution flags false", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
      },
    });

    const handoff = prepareAnalyzeWorkspaceHandoff(request);

    expect(handoff.executionStarted).toBe(false);
    expect(handoff.safety.agentStarted).toBe(false);
    expect(handoff.safety.filesChanged).toBe(false);
    expect(handoff.safety.commandsRun).toBe(false);
    expect(handoff.safety.networkAccessed).toBe(false);
    expect(handoff.safety.localFallbackUsed).toBe(false);
    expect(handoff.safety.automaticRoutingUsed).toBe(false);
  });

  it("invalid requests are not accepted and still keep all execution flags false", () => {
    const handoff = prepareAnalyzeWorkspaceHandoff(null);

    expect(handoff.accepted).toBe(false);
    expect(handoff.validation.ok).toBe(false);
    expect(handoff.executionStarted).toBe(false);
    expect(handoff.safety.agentStarted).toBe(false);
    expect(handoff.safety.filesChanged).toBe(false);
    expect(handoff.safety.commandsRun).toBe(false);
    expect(handoff.safety.networkAccessed).toBe(false);
    expect(handoff.safety.localFallbackUsed).toBe(false);
    expect(handoff.safety.automaticRoutingUsed).toBe(false);
  });

  it("renders the page with five cards in diagnostics mode", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Setup Health");
    expect(container.textContent).toContain("Analyze this workspace");
    expect(container.textContent).toContain("Cloud AI");
    expect(container.textContent).toContain("Local AI");
    expect(container.textContent).toContain("Workspace");
    expect(container.textContent).toContain("Developer Tools");
    expect(container.textContent).toContain("Runtime");
    expect(container.textContent).toContain("Private alpha");
    expect(container.textContent).toContain("First successful run");
    expect(container.textContent).toContain("This checklist tracks the private-alpha first-run flow.");
    expect(container.textContent).toContain("does not yet run AI analysis");
    expect(container.textContent).toContain("edit code");
    expect(container.textContent).toContain("execute commands");

    act(() => {
      root.unmount();
    });
  });

  it("shows a read-only analysis preview when Analyze is clicked with a selected workspace", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    const mockModeButton = buttons.find((button) => button.textContent?.trim() === "Mock states");
    expect(mockModeButton).not.toBeUndefined();

    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const readyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready");
    expect(readyButton).not.toBeUndefined();

    act(() => {
      readyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    expect(analyzeButton).not.toBeUndefined();
    expect(analyzeButton?.hasAttribute("disabled")).toBe(false);

    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Ready to analyze this workspace. The first analysis will be read-only and will not modify files.");
    expect(container.textContent).toContain("No files will be changed");
    expect(container.textContent).toContain("No commands will run without approval");

    act(() => {
      root.unmount();
    });
  });

  it("shows a ready-to-run panel after Continue is clicked", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const readyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready");
    act(() => {
      readyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    expect(continueButton).not.toBeUndefined();

    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Ready to run read-only analysis");
    expect(container.textContent).toContain("Analysis has not started yet.");
    expect(container.textContent).toContain("No files will be changed.");
    expect(container.textContent).toContain("No commands will run without your approval.");

    act(() => {
      root.unmount();
    });
  });

  it("shows the path warning in the ready-to-run panel for medium-risk workspaces", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const warningButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Workspace warning");
    act(() => {
      warningButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("This workspace path has a warning. Analysis can continue, but some cloud runs may be slower.");

    act(() => {
      root.unmount();
    });
  });

  it("shows a prepared handoff state after Prepare request is clicked", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const readyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready");
    act(() => {
      readyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    expect(prepareButton).not.toBeUndefined();

    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Analysis request prepared");
    expect(container.textContent).toContain("Execution has not started.");
    expect(container.textContent).toContain("No agent has been started.");
    expect(container.textContent).toContain("No files have been read or changed.");
    expect(container.textContent).toContain("No commands have been run.");
    expect(container.textContent).toContain("Future safe metadata scope");
    expect(container.textContent).toContain("Analyze Workspace flow");
    expect(container.textContent).toContain("Request prepared");
    expect(container.textContent).toContain("No recursive scan will be performed.");
    expect(container.textContent).toContain("Secrets will not be read.");
    expect(container.textContent).not.toContain("Project summary");

    act(() => {
      root.unmount();
    });
  });

  it("shows limited metadata collected after Collect limited metadata is clicked", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const readyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready");
    act(() => {
      readyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const collectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Collect limited metadata");
    expect(collectButton).not.toBeUndefined();

    await act(async () => {
      collectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Analyze Workspace flow");
    expect(container.textContent).toContain("First successful run");
    expect(container.textContent).toContain("Request prepared");
    expect(container.textContent).toContain("Limited metadata collected");
    expect(container.textContent).toContain("Workspace selected");
    expect(container.textContent).toContain("Read-only flow confirmed");
    expect(container.textContent).toContain("README and manifest reads are optional improvement steps.");
    expect(container.textContent).toContain("Limited read-only metadata collected");
    expect(container.textContent).toContain("No file contents were read.");
    expect(container.textContent).toContain("No commands were run.");
    expect(container.textContent).toContain("No recursive scan was performed.");
    expect(container.textContent).toContain("First workspace summary");
    expect(container.textContent).toContain("Private alpha first run complete");
    expect(container.textContent).toContain("Paperclip completed the safe first-run flow without running commands or using AI.");
    expect(container.textContent).toContain("This first result is based only on limited top-level metadata.");
    expect(container.textContent).toContain("No AI was used.");
    expect(container.textContent).toContain("Project summary");
    expect(container.textContent).toContain("Detected languages/tools");
    expect(container.textContent).toContain("Swift");
    expect(container.textContent).toContain("What I inspected");
    expect(container.textContent).toContain("What I did not inspect");
    expect(container.textContent).toContain("What’s next?");
    expect(container.textContent).toContain("Help improve this first run");
    expect(container.textContent).toContain("No feedback is sent automatically.");
    expect(container.textContent).toContain("Did you understand what Paperclip inspected?");
    expect(container.textContent).toContain("Read selected manifest fields");
    expect(container.textContent).toContain("README excerpt read");
    expect(container.textContent).toContain("Manifest fields read");
    expect(container.textContent).toContain("Optional improvement step");
    expect(container.textContent).toContain("Improve summary with Cloud AI — coming later");
    expect(container.textContent).toContain("Inspect project structure — coming later");
    expect(container.textContent).not.toContain("tests passed");
    expect(container.textContent).not.toContain("security posture is verified");

    act(() => {
      root.unmount();
    });
  });

  it("offers and applies the approved README excerpt step", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const readyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready");
    act(() => {
      readyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const collectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Collect limited metadata");
    await act(async () => {
      collectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Read small README excerpt");
    expect(container.textContent).toContain("up to 4 KB");
    expect(container.textContent).toContain("optional and read-only");

    const readmeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Read small README excerpt");
    await act(async () => {
      readmeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("README excerpt read");
    expect(container.textContent).toContain("README.md");
    expect(container.textContent).toContain("This result uses limited top-level metadata and one approved README excerpt.");
    expect(container.textContent).toContain("A small approved README excerpt was read.");
    expect(container.textContent).toContain("Approved file reads: README.md, up to 4 KB");
    expect(container.textContent).toContain("No commands were run.");
    expect(container.textContent).toContain("No AI was used.");
    expect(container.textContent).not.toContain("No file contents were read.");

    act(() => {
      root.unmount();
    });
  });

  it("offers and applies the approved manifest fields step", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const warningButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Workspace warning");
    act(() => {
      warningButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const collectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Collect limited metadata");
    await act(async () => {
      collectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Read selected manifest fields");
    expect(container.textContent).toContain("optional and read-only");

    const manifestButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Read selected manifest fields");
    await act(async () => {
      manifestButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Manifest fields read");
    expect(container.textContent).toContain("package.json");
    expect(container.textContent).toContain("Selected field groups extracted");
    expect(container.textContent).toContain("This result uses limited metadata and approved manifest fields.");
    expect(container.textContent).toContain("No commands were run.");
    expect(container.textContent).toContain("No AI was used.");
    expect(container.textContent).not.toContain("No file contents were read.");

    act(() => {
      root.unmount();
    });
  });

  it("shows no README candidate messaging when the snapshot has no top-level README", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const readyButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready (No README)");
    act(() => {
      readyButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const collectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Collect limited metadata");
    await act(async () => {
      collectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("No top-level README was found.");
    expect(container.textContent).toContain("Paperclip will not search subdirectories automatically in this alpha.");
    expect(container.textContent).toContain("README excerpt");

    act(() => {
      root.unmount();
    });
  });

  it("shows no supported manifest candidate messaging when none exists", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const noManifestButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready (No Manifest)");
    act(() => {
      noManifestButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const collectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Collect limited metadata");
    await act(async () => {
      collectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("No supported top-level manifest was found.");
    expect(container.textContent).toContain(
      "Supported manifests in this alpha: package.json, pyproject.toml, Cargo.toml, go.mod, Package.swift.",
    );

    act(() => {
      root.unmount();
    });
  });

  it("shows a calm metadata collection error state", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const metadataErrorButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready (Metadata Error)");
    act(() => {
      metadataErrorButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const collectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Collect limited metadata");
    await act(async () => {
      collectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Limited metadata collection failed.");
    expect(container.textContent).toContain("No files were changed and no commands were run.");

    act(() => {
      root.unmount();
    });
  });

  it("shows a calm README read error state", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const readmeErrorButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready (README Error)");
    act(() => {
      readmeErrorButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const collectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Collect limited metadata");
    await act(async () => {
      collectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const readmeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Read small README excerpt");
    await act(async () => {
      readmeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("README excerpt could not be read.");
    expect(container.textContent).toContain("No other files were opened.");

    act(() => {
      root.unmount();
    });
  });

  it("shows a calm manifest read error state", async () => {
    const root = renderSetupHealth(container);

    await act(async () => {
      await Promise.resolve();
    });

    const mockModeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Mock states");
    act(() => {
      mockModeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const manifestErrorButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Ready (Manifest Error)");
    act(() => {
      manifestErrorButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const analyzeButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Analyze this workspace");
    act(() => {
      analyzeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const continueButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Continue");
    act(() => {
      continueButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const prepareButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Prepare request");
    act(() => {
      prepareButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const collectButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Collect limited metadata");
    await act(async () => {
      collectButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const manifestButton = Array.from(container.querySelectorAll("button"))
      .find((button) => button.textContent?.trim() === "Read selected manifest fields");
    await act(async () => {
      manifestButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Manifest fields could not be read.");
    expect(container.textContent).toContain("Raw manifest content was not exposed.");

    act(() => {
      root.unmount();
    });
  });

});
