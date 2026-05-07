// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ThemeProvider } from "../context/ThemeContext";
import { type LocalFallbackCandidateSignal } from "../lib/local-fallback-offer";
import { LocalFallbackOfferCard } from "./AgentDetail";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function renderCard(container: HTMLDivElement, signal: LocalFallbackCandidateSignal | null) {
  const root = createRoot(container);
  act(() => {
    root.render(
      <ThemeProvider>
        <LocalFallbackOfferCard signal={signal} />
      </ThemeProvider>,
    );
  });
  return root;
}

function buildSignal(
  overrides: Partial<LocalFallbackCandidateSignal> = {},
): LocalFallbackCandidateSignal {
  return {
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
    ...overrides,
  };
}

describe("LocalFallbackOfferCard", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does not render without a candidate payload", async () => {
    const root = renderCard(container, null);
    expect(container.textContent ?? "").not.toContain("Run locally instead?");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders an eligible payload as a local fallback offer", async () => {
    const root = renderCard(container, buildSignal());

    expect(container.textContent ?? "").toContain("Run locally instead?");
    expect(container.textContent ?? "").toContain("Run locally");
    expect(container.textContent ?? "").toContain("Use stronger model");
    expect(container.textContent ?? "").toContain("Automatic routing is disabled.");
    expect(container.textContent ?? "").toContain("gemma4:e4b");
    expect(container.textContent ?? "").not.toContain("default model");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders diagnostic-only payload without a direct local run action", async () => {
    const root = renderCard(container, buildSignal({
      decision: "diagnostic_only",
      taskClass: undefined,
      eligibleReasons: ["Local fallback metadata was present for this run."],
      ineligibleReasons: ["No explicit eligible task class was provided for this run."],
    }));

    expect(container.textContent ?? "").toContain("Local fallback is available for some small tasks, but this run has not been classified as eligible.");
    expect(container.textContent ?? "").not.toContain("Run locally");
    expect(container.textContent ?? "").toContain("Use stronger model");

    await act(async () => {
      root.unmount();
    });
  });

  it("renders a muted not-eligible state without a local offer", async () => {
    const root = renderCard(container, buildSignal({
      decision: "not_eligible",
      ineligibleReasons: ["Task requires strict JSON output."],
    }));

    expect(container.textContent ?? "").toContain("Local fallback not recommended for this run");
    expect(container.textContent ?? "").toContain("Task requires strict JSON output.");
    expect(container.textContent ?? "").not.toContain("Run locally");
    expect(container.textContent ?? "").toContain("Use stronger model");

    await act(async () => {
      root.unmount();
    });
  });

  it("keeps actions local-only in prototype mode", async () => {
    const root = renderCard(container, buildSignal());

    const strongerButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("Use stronger model"),
    );
    expect(strongerButton).not.toBeUndefined();

    await act(async () => {
      strongerButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent ?? "").toContain("Prototype only. Stronger-model fallback remains the normal path for this task.");

    await act(async () => {
      root.unmount();
    });
  });
});
