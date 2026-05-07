// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SetupHealth } from "./SetupHealth";
import {
  buildSetupHealthViewModel,
  classifyWorkspacePathForSetupHealth,
} from "@/lib/setup-health";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const healthGetMock = vi.fn();
const heartbeatsListMock = vi.fn();

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
});
