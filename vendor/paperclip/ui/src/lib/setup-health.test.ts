import { describe, expect, it } from "vitest";
import {
  buildAnalyzeWorkspaceFeedbackQuestions,
  buildAnalyzeWorkspaceFlowSteps,
  buildFirstSuccessfulRunState,
  buildPaperclipStartupState,
  buildPrivateAlphaCapabilities,
  buildManifestFieldRequest,
  buildAnalyzeWorkspaceRequest,
  buildReadmeExcerptRequest,
  buildAnalyzeWorkspaceResultFromMetadata,
  collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries,
  buildAnalyzeWorkspaceMetadataSnapshotFromEntries,
  classifyManifestIndicator,
  findManifestCandidatesFromSnapshot,
  findReadmeCandidatesFromSnapshot,
  isAllowedManifestFilename,
  isAllowedReadmeFilename,
  isSensitiveWorkspaceEntryName,
  manifestKindForFilename,
  validateAnalyzeWorkspaceResult,
  validateAnalyzeWorkspaceMetadataSnapshot,
} from "./setup-health";

describe("setup-health flow steps", () => {
  it("shows setup checked as current in the initial state", () => {
    const steps = buildAnalyzeWorkspaceFlowSteps({
      confirmationOpen: false,
      requestPrepared: false,
      metadataCollected: false,
      firstResultAvailable: false,
      readmeCandidateAvailable: false,
      readmeExcerptRead: false,
      manifestCandidateAvailable: false,
      manifestFieldsRead: false,
    });

    expect(steps.find((step) => step.id === "setup_health")?.status).toBe("current");
  });

  it("marks request prepared complete after metadata collection begins", () => {
    const steps = buildAnalyzeWorkspaceFlowSteps({
      confirmationOpen: true,
      requestPrepared: true,
      metadataCollected: true,
      firstResultAvailable: false,
      readmeCandidateAvailable: false,
      readmeExcerptRead: false,
      manifestCandidateAvailable: false,
      manifestFieldsRead: false,
    });

    expect(steps.find((step) => step.id === "request_prepared")?.status).toBe("complete");
  });

  it("marks metadata collected complete when the first result is available", () => {
    const steps = buildAnalyzeWorkspaceFlowSteps({
      confirmationOpen: true,
      requestPrepared: true,
      metadataCollected: true,
      firstResultAvailable: true,
      readmeCandidateAvailable: false,
      readmeExcerptRead: false,
      manifestCandidateAvailable: false,
      manifestFieldsRead: false,
    });

    expect(steps.find((step) => step.id === "metadata_collected")?.status).toBe("complete");
  });

  it("marks README excerpt as optional when a candidate exists", () => {
    const steps = buildAnalyzeWorkspaceFlowSteps({
      confirmationOpen: true,
      requestPrepared: true,
      metadataCollected: true,
      firstResultAvailable: true,
      readmeCandidateAvailable: true,
      readmeExcerptRead: false,
      manifestCandidateAvailable: false,
      manifestFieldsRead: false,
    });

    expect(steps.find((step) => step.id === "readme_excerpt")?.status).toBe("optional");
  });

  it("marks README excerpt disabled when no candidate exists", () => {
    const steps = buildAnalyzeWorkspaceFlowSteps({
      confirmationOpen: true,
      requestPrepared: true,
      metadataCollected: true,
      firstResultAvailable: true,
      readmeCandidateAvailable: false,
      readmeExcerptRead: false,
      manifestCandidateAvailable: false,
      manifestFieldsRead: false,
    });

    expect(steps.find((step) => step.id === "readme_excerpt")?.status).toBe("disabled");
  });

  it("marks improved summary current when the README excerpt has been read", () => {
    const steps = buildAnalyzeWorkspaceFlowSteps({
      confirmationOpen: true,
      requestPrepared: true,
      metadataCollected: true,
      firstResultAvailable: true,
      readmeCandidateAvailable: true,
      readmeExcerptRead: true,
      manifestCandidateAvailable: true,
      manifestFieldsRead: true,
    });

    expect(steps.find((step) => step.id === "readme_excerpt")?.status).toBe("complete");
    expect(steps.find((step) => step.id === "manifest_fields")?.status).toBe("complete");
    expect(steps.find((step) => step.id === "improved_summary")?.status).toBe("current");
  });
});

describe("startup transparency helpers", () => {
  it("is not ready while health is loading", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: false,
      healthLoading: true,
      runsLoading: false,
      localAiStatus: "unknown",
      cloudAiStatus: "unknown",
      workspaceSelected: false,
    });

    expect(state.ready).toBe(false);
    expect(state.title).toBe("Starting Paperclip");
  });

  it("is not ready while runs are loading", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: false,
      healthLoading: false,
      runsLoading: true,
      localAiStatus: "unknown",
      cloudAiStatus: "unknown",
      workspaceSelected: false,
    });

    expect(state.ready).toBe(false);
    expect(state.slowStartHint).toContain("Setup Health will remain read-only");
  });

  it("becomes ready when diagnostics are available and loading is false", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: true,
      healthLoading: false,
      runsLoading: false,
      localAiStatus: "available_candidate",
      cloudAiStatus: "connected",
      workspaceSelected: true,
    });

    expect(state.ready).toBe(true);
    expect(state.title).toBe("Startup complete");
  });

  it("includes conservative local AI availability copy", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: true,
      healthLoading: false,
      runsLoading: false,
      localAiStatus: "available",
      cloudAiStatus: "connected",
      workspaceSelected: true,
    });

    expect(state.steps.find((step) => step.id === "local_ai_check")?.description).toContain("appears available");
  });

  it("includes the workspace loading step", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: false,
      healthLoading: true,
      runsLoading: false,
      localAiStatus: "unknown",
      cloudAiStatus: "unknown",
      workspaceSelected: false,
    });

    expect(state.steps.find((step) => step.id === "workspace_state")?.label).toBe("Loading workspace state");
  });

  it("includes the slow-start hint while loading", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: false,
      healthLoading: true,
      runsLoading: true,
      localAiStatus: "unknown",
      cloudAiStatus: "unknown",
      workspaceSelected: false,
    });

    expect(state.slowStartHint).toContain("remain read-only until readiness is clear");
  });

  it("always says project files are not modified during startup", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: true,
      healthLoading: false,
      runsLoading: false,
      localAiStatus: "unknown",
      cloudAiStatus: "connected",
      workspaceSelected: true,
    });

    expect(state.safetyNote).toBe("Your project files are not modified during startup.");
  });

  it("does not imply local AI is used automatically", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: true,
      healthLoading: false,
      runsLoading: false,
      localAiStatus: "available_candidate",
      cloudAiStatus: "connected",
      workspaceSelected: true,
    });

    expect(state.steps.find((step) => step.id === "local_ai_check")?.description).toContain("not used automatically");
  });

  it("does not block the safe first-run flow when local AI is unavailable", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: true,
      healthLoading: false,
      runsLoading: false,
      localAiStatus: "unavailable",
      cloudAiStatus: "connected",
      workspaceSelected: true,
    });

    expect(state.ready).toBe(true);
    expect(state.steps.find((step) => step.id === "local_ai_check")?.status).toBe("needs_attention");
  });

  it("handles no workspace selected conservatively", () => {
    const state = buildPaperclipStartupState({
      diagnosticsAvailable: true,
      healthLoading: false,
      runsLoading: false,
      localAiStatus: "available_candidate",
      cloudAiStatus: "connected",
      workspaceSelected: false,
    });

    expect(state.steps.find((step) => step.id === "workspace_state")?.status).toBe("needs_attention");
  });
});

describe("private alpha helpers", () => {
  it("returns working private alpha capabilities", () => {
    const capabilities = buildPrivateAlphaCapabilities();
    expect(capabilities.some((capability) => capability.status === "working")).toBe(true);
    expect(capabilities.some((capability) => capability.label === "Setup Health")).toBe(true);
  });

  it("returns partial private alpha capabilities", () => {
    const capabilities = buildPrivateAlphaCapabilities();
    expect(capabilities.some((capability) => capability.status === "partial")).toBe(true);
  });

  it("returns not-built private alpha capabilities", () => {
    const capabilities = buildPrivateAlphaCapabilities();
    expect(capabilities.some((capability) => capability.status === "not_built")).toBe(true);
  });

  it("includes AI-assisted analysis as not built", () => {
    const capabilities = buildPrivateAlphaCapabilities();
    expect(capabilities.find((capability) => capability.label === "AI-assisted analysis")?.status).toBe("not_built");
  });

  it("includes command execution as not built", () => {
    const capabilities = buildPrivateAlphaCapabilities();
    expect(capabilities.find((capability) => capability.label === "Command execution")?.status).toBe("not_built");
  });

  it("returns key analyze-workspace feedback questions", () => {
    const questions = buildAnalyzeWorkspaceFeedbackQuestions();
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.some((question) => question.label.includes("Paperclip inspected"))).toBe(true);
  });

  it("includes a feedback question about safety clarity", () => {
    const questions = buildAnalyzeWorkspaceFeedbackQuestions();
    expect(questions.some((question) => question.label.includes("safety copy"))).toBe(true);
  });

  it("includes a feedback question about first summary usefulness", () => {
    const questions = buildAnalyzeWorkspaceFeedbackQuestions();
    expect(questions.some((question) => question.label.includes("first summary useful"))).toBe(true);
  });
});

describe("first successful run helpers", () => {
  it("is incomplete initially", () => {
    const state = buildFirstSuccessfulRunState({
      workspaceSelected: false,
      readOnlyConfirmed: false,
      requestPrepared: false,
      metadataCollected: false,
      firstSummaryShown: false,
      readmeExcerptRead: false,
      manifestFieldsRead: false,
      feedbackPromptShown: false,
    });

    expect(state.complete).toBe(false);
    expect(state.title).toBe("First run in progress");
  });

  it("becomes complete when required steps are complete", () => {
    const state = buildFirstSuccessfulRunState({
      workspaceSelected: true,
      readOnlyConfirmed: true,
      requestPrepared: true,
      metadataCollected: true,
      firstSummaryShown: true,
      readmeExcerptRead: false,
      manifestFieldsRead: false,
      feedbackPromptShown: false,
    });

    expect(state.complete).toBe(true);
    expect(state.title).toBe("Private alpha first run complete");
  });

  it("keeps README excerpt optional", () => {
    const state = buildFirstSuccessfulRunState({
      workspaceSelected: true,
      readOnlyConfirmed: true,
      requestPrepared: true,
      metadataCollected: true,
      firstSummaryShown: true,
      readmeExcerptRead: false,
      manifestFieldsRead: false,
      feedbackPromptShown: false,
    });

    expect(state.items.find((item) => item.id === "readme_excerpt_optional")?.required).toBe(false);
    expect(state.items.find((item) => item.id === "readme_excerpt_optional")?.status).toBe("optional");
  });

  it("keeps manifest fields optional", () => {
    const state = buildFirstSuccessfulRunState({
      workspaceSelected: true,
      readOnlyConfirmed: true,
      requestPrepared: true,
      metadataCollected: true,
      firstSummaryShown: true,
      readmeExcerptRead: false,
      manifestFieldsRead: false,
      feedbackPromptShown: false,
    });

    expect(state.items.find((item) => item.id === "manifest_fields_optional")?.required).toBe(false);
    expect(state.items.find((item) => item.id === "manifest_fields_optional")?.status).toBe("optional");
  });

  it("does not require the feedback prompt for completion", () => {
    const state = buildFirstSuccessfulRunState({
      workspaceSelected: true,
      readOnlyConfirmed: true,
      requestPrepared: true,
      metadataCollected: true,
      firstSummaryShown: true,
      readmeExcerptRead: false,
      manifestFieldsRead: false,
      feedbackPromptShown: false,
    });

    expect(state.complete).toBe(true);
    expect(state.items.find((item) => item.id === "feedback_prompt_shown")?.required).toBe(false);
  });

  it("uses the complete-state title when the core flow succeeds", () => {
    const state = buildFirstSuccessfulRunState({
      workspaceSelected: true,
      readOnlyConfirmed: true,
      requestPrepared: true,
      metadataCollected: true,
      firstSummaryShown: true,
      readmeExcerptRead: true,
      manifestFieldsRead: true,
      feedbackPromptShown: true,
    });

    expect(state.title).toBe("Private alpha first run complete");
  });

  it("uses the in-progress title before required steps are done", () => {
    const state = buildFirstSuccessfulRunState({
      workspaceSelected: true,
      readOnlyConfirmed: true,
      requestPrepared: false,
      metadataCollected: false,
      firstSummaryShown: false,
      readmeExcerptRead: false,
      manifestFieldsRead: false,
      feedbackPromptShown: false,
    });

    expect(state.title).toBe("First run in progress");
  });
});

describe("setup-health metadata snapshot helpers", () => {
  it("detects .env as sensitive", () => {
    expect(isSensitiveWorkspaceEntryName(".env")).toBe(true);
  });

  it("detects id_rsa as sensitive", () => {
    expect(isSensitiveWorkspaceEntryName("id_rsa")).toBe(true);
  });

  it("detects credentials.json as sensitive", () => {
    expect(isSensitiveWorkspaceEntryName("credentials.json")).toBe(true);
  });

  it("does not mark README.md as sensitive", () => {
    expect(isSensitiveWorkspaceEntryName("README.md")).toBe(false);
  });

  it("accepts README.md as an allowed README filename", () => {
    expect(isAllowedReadmeFilename("README.md")).toBe(true);
  });

  it("accepts README as an allowed README filename", () => {
    expect(isAllowedReadmeFilename("README")).toBe(true);
  });

  it("accepts README.txt as an allowed README filename", () => {
    expect(isAllowedReadmeFilename("README.txt")).toBe(true);
  });

  it("rejects docs/README.md as an allowed README filename", () => {
    expect(isAllowedReadmeFilename("docs/README.md")).toBe(false);
  });

  it("rejects ../README.md as an allowed README filename", () => {
    expect(isAllowedReadmeFilename("../README.md")).toBe(false);
  });

  it("rejects .env as an allowed README filename", () => {
    expect(isAllowedReadmeFilename(".env")).toBe(false);
  });

  it("rejects README.secret as an allowed README filename", () => {
    expect(isAllowedReadmeFilename("README.secret")).toBe(false);
  });

  it("accepts package.json as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename("package.json")).toBe(true);
  });

  it("accepts pyproject.toml as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename("pyproject.toml")).toBe(true);
  });

  it("accepts Cargo.toml as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename("Cargo.toml")).toBe(true);
  });

  it("accepts go.mod as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename("go.mod")).toBe(true);
  });

  it("accepts Package.swift as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename("Package.swift")).toBe(true);
  });

  it("rejects ../package.json as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename("../package.json")).toBe(false);
  });

  it("rejects src/package.json as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename("src/package.json")).toBe(false);
  });

  it("rejects package.json.bak as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename("package.json.bak")).toBe(false);
  });

  it("rejects .env as an allowed manifest filename", () => {
    expect(isAllowedManifestFilename(".env")).toBe(false);
  });

  it("rejects lockfiles as allowed manifest filenames", () => {
    expect(isAllowedManifestFilename("package-lock.json")).toBe(false);
    expect(isAllowedManifestFilename("pnpm-lock.yaml")).toBe(false);
    expect(isAllowedManifestFilename("Cargo.lock")).toBe(false);
  });

  it("maps manifest kinds from allowed filenames", () => {
    expect(manifestKindForFilename("package.json")).toBe("package_json");
    expect(manifestKindForFilename("pyproject.toml")).toBe("pyproject_toml");
    expect(manifestKindForFilename("Cargo.toml")).toBe("cargo_toml");
    expect(manifestKindForFilename("go.mod")).toBe("go_mod");
    expect(manifestKindForFilename("Package.swift")).toBe("package_swift");
  });

  it("classifies package.json as a javascript manifest indicator", () => {
    expect(classifyManifestIndicator("package.json")).toEqual({
      name: "package.json",
      present: true,
      category: "javascript",
    });
  });

  it("classifies Package.swift as a swift manifest indicator", () => {
    expect(classifyManifestIndicator("Package.swift")).toEqual({
      name: "Package.swift",
      present: true,
      category: "swift",
    });
  });

  it("classifies pyproject.toml as a python manifest indicator", () => {
    expect(classifyManifestIndicator("pyproject.toml")).toEqual({
      name: "pyproject.toml",
      present: true,
      category: "python",
    });
  });

  it("classifies Cargo.toml as a rust manifest indicator", () => {
    expect(classifyManifestIndicator("Cargo.toml")).toEqual({
      name: "Cargo.toml",
      present: true,
      category: "rust",
    });
  });

  it("classifies go.mod as a go manifest indicator", () => {
    expect(classifyManifestIndicator("go.mod")).toEqual({
      name: "go.mod",
      present: true,
      category: "go",
    });
  });

  it("classifies README.md as a readme indicator", () => {
    expect(classifyManifestIndicator("README.md")).toEqual({
      name: "README.md",
      present: true,
      category: "readme",
    });
  });

  it("builds a fixture-only metadata snapshot with strict non-executing limits", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      workspace: {
        displayName: "paperclip-app",
        pathHealth: {
          risk: "low",
          reasons: ["contains_spaces"],
        },
      },
      entries: [
        { name: "README.md", kind: "file" },
        { name: "package.json", kind: "file" },
        { name: "src", kind: "directory" },
      ],
    });

    expect(snapshot.collectionMode).toBe("provided_fixture_only");
    expect(snapshot.limits.recursiveScan).toBe(false);
    expect(snapshot.limits.fileContentsRead).toBe(false);
    expect(snapshot.limits.commandsRun).toBe(false);
    expect(snapshot.limits.networkAccessed).toBe(false);
    expect(snapshot.safety.agentStarted).toBe(false);
    expect(snapshot.safety.localFallbackUsed).toBe(false);
    expect(snapshot.safety.automaticRoutingUsed).toBe(false);
  });

  it("redacts sensitive entries instead of exposing raw names", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [
        { name: ".env", kind: "file" },
        { name: "README.md", kind: "file" },
      ],
    });

    expect(snapshot.topLevelEntries[0]).toMatchObject({
      name: "[redacted]",
      kind: "file",
      redacted: true,
    });
    expect(snapshot.redactions).toEqual([
      {
        name: "[redacted]",
        reason: "Sensitive-looking top-level entry name was redacted.",
      },
    ]);
    expect(snapshot.topLevelEntries.some((entry) => entry.name === ".env")).toBe(false);
  });

  it("accepts a safe metadata snapshot", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [
        { name: "README.md", kind: "file" },
        { name: "Package.swift", kind: "file" },
      ],
    });

    const validation = validateAnalyzeWorkspaceMetadataSnapshot(snapshot);

    expect(validation).toEqual({ ok: true });
  });

  it("rejects an unsafe mutated metadata snapshot", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [
        { name: "README.md", kind: "file" },
      ],
    });

    const mutatedSnapshot = {
      ...snapshot,
      limits: {
        ...snapshot.limits,
        fileContentsRead: true as false,
      },
    };

    const validation = validateAnalyzeWorkspaceMetadataSnapshot(mutatedSnapshot);

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors.some((error) => error.includes("fileContentsRead"))).toBe(true);
    }
  });

  it("enforces the maximum top-level entries limit", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [
        { name: "README.md", kind: "file" },
        { name: "package.json", kind: "file" },
        { name: "src", kind: "directory" },
      ],
      maxTopLevelEntries: 2,
    });

    expect(snapshot.topLevelEntries).toHaveLength(2);
    expect(snapshot.notCollected).toContain("Top-level entry list was truncated at 2 entries.");
  });

  it("collects safe top-level metadata from provided entries", () => {
    const result = collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries({
      workspace: {
        displayName: "paperclip-app",
        path: "/Users/example/Projects/paperclip-app",
        pathHealth: {
          risk: "none",
          reasons: [],
        },
      },
      topLevelEntries: [
        { name: "README.md", kind: "file" },
        { name: "package.json", kind: "file" },
        { name: ".git", kind: "directory" },
      ],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.snapshot.snapshotType).toBe("analyze_workspace_metadata_snapshot");
      expect(result.snapshot.limits.recursiveScan).toBe(false);
      expect(result.snapshot.limits.fileContentsRead).toBe(false);
      expect(result.snapshot.limits.commandsRun).toBe(false);
      expect(result.snapshot.limits.networkAccessed).toBe(false);
      expect(result.snapshot.safety.agentStarted).toBe(false);
      expect(result.snapshot.safety.localFallbackUsed).toBe(false);
      expect(result.snapshot.safety.automaticRoutingUsed).toBe(false);
      expect(result.snapshot.manifestIndicators.some((indicator) => indicator.name === "package.json")).toBe(true);
      expect(result.snapshot.manifestIndicators.some((indicator) => indicator.name === ".git")).toBe(true);
    }
  });

  it("warns when path health is medium", () => {
    const result = collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries({
      workspace: {
        displayName: "Café",
        path: "/Users/example/Cafe\u0301",
        pathHealth: {
          risk: "medium",
          reasons: ["contains_decomposed_unicode"],
        },
      },
      topLevelEntries: [
        { name: "README.md", kind: "file" },
      ],
    });

    expect(result.warnings.some((warning) => warning.includes("path health"))).toBe(true);
  });

  it("warns when sensitive names were redacted", () => {
    const result = collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries({
      workspace: {
        path: "/Users/example/Projects/paperclip-app",
      },
      topLevelEntries: [
        { name: "credentials.json", kind: "file" },
      ],
    });

    expect(result.warnings.some((warning) => warning.includes("redacted"))).toBe(true);
  });

  it("returns a safe invalid result when snapshot validation fails", () => {
    const result = collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries({
      workspace: {
        path: "/Users/example/Projects/paperclip-app",
      },
      topLevelEntries: [
        { name: "README.md", kind: "file" },
      ],
      maxTopLevelEntries: 0,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.snapshot).toBeNull();
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("finds top-level README candidates in stable ordering", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [
        { name: "readme.txt", kind: "file" },
        { name: "README", kind: "file" },
        { name: "README.md", kind: "file" },
      ],
    });

    expect(findReadmeCandidatesFromSnapshot(snapshot)).toEqual([
      "README.md",
      "README",
      "readme.txt",
    ]);
  });

  it("does not include redacted entries as README candidates", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [
        { name: ".env", kind: "file" },
      ],
    });

    expect(findReadmeCandidatesFromSnapshot(snapshot)).toEqual([]);
  });

  it("finds supported top-level manifest candidates in stable ordering", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [
        { name: "Package.swift", kind: "file" },
        { name: "go.mod", kind: "file" },
        { name: "package.json", kind: "file" },
      ],
    });

    expect(findManifestCandidatesFromSnapshot(snapshot)).toEqual([
      { filename: "package.json", kind: "package_json" },
      { filename: "go.mod", kind: "go_mod" },
      { filename: "Package.swift", kind: "package_swift" },
    ]);
  });

  it("does not include redacted entries as manifest candidates", () => {
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [
        { name: ".env", kind: "file" },
        { name: "package.json", kind: "file" },
      ],
    });

    expect(findManifestCandidatesFromSnapshot(snapshot)).toEqual([
      { filename: "package.json", kind: "package_json" },
    ]);
  });

  it("builds a README excerpt request for an allowed filename", () => {
    const request = buildReadmeExcerptRequest({
      workspacePath: "/Users/example/project",
      filename: "README.md",
    });

    expect(request).not.toBeNull();
    expect(request?.limits.maxBytes).toBe(4096);
  });

  it("builds a manifest field request for an allowed filename", () => {
    const request = buildManifestFieldRequest({
      workspacePath: "/Users/example/project",
      filename: "package.json",
    });

    expect(request).not.toBeNull();
    expect(request?.candidate.kind).toBe("package_json");
    expect(request?.limits.maxBytes).toBe(16384);
  });

  it("returns null for a forbidden manifest filename", () => {
    const request = buildManifestFieldRequest({
      workspacePath: "/Users/example/project",
      filename: "package-lock.json",
    });

    expect(request).toBeNull();
  });

  it("returns null for a forbidden README filename", () => {
    const request = buildReadmeExcerptRequest({
      workspacePath: "/Users/example/project",
      filename: "docs/README.md",
    });

    expect(request).toBeNull();
  });

  it("builds a metadata-only analyze-workspace result", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Projects/paperclip-app",
        displayName: "paperclip-app",
      },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      workspace: {
        displayName: "paperclip-app",
        pathHealth: { risk: "none", reasons: [] },
      },
      entries: [
        { name: "README.md", kind: "file" },
        { name: "package.json", kind: "file" },
        { name: "pnpm-lock.yaml", kind: "file" },
      ],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });

    expect(result.resultType).toBe("analyze_workspace_result");
    expect(result.analysisMode).toBe("metadata_only_rule_based");
    expect(result.aiUsed).toBe(false);
    expect(result.detected.languages).toContain("JavaScript");
    expect(result.detected.packageManagers).toContain("pnpm");
    expect(result.detected.importantFiles.some((file) => file.path === "README.md")).toBe(true);
    expect(result.setupWarnings.some((warning) => warning.title === "Metadata-only result")).toBe(true);
    expect(result.inspected.filesRead).toEqual([]);
    expect(result.inspected.commandsRun).toEqual([]);
  });

  it("detects Swift from Package.swift", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/swift-app" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "Package.swift", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    expect(result.detected.languages).toContain("Swift");
  });

  it("detects Python from pyproject.toml", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/python-app" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "pyproject.toml", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    expect(result.detected.languages).toContain("Python");
  });

  it("detects Rust from Cargo.toml", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/rust-app" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "Cargo.toml", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    expect(result.detected.languages).toContain("Rust");
  });

  it("detects Go from go.mod", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/go-app" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "go.mod", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    expect(result.detected.languages).toContain("Go");
  });

  it("adds path and redaction warnings to the metadata result", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: {
        selected: true,
        path: "/Users/example/Cafe\u0301",
        pathHealth: { risk: "medium", reasons: ["contains_decomposed_unicode"] },
      },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      workspace: {
        pathHealth: { risk: "medium", reasons: ["contains_decomposed_unicode"] },
      },
      entries: [
        { name: ".env", kind: "file" },
        { name: "README.md", kind: "file" },
      ],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });

    expect(result.setupWarnings.some((warning) => warning.title === "Workspace path warning")).toBe(true);
    expect(result.setupWarnings.some((warning) => warning.title === "Sensitive-looking entries were redacted")).toBe(true);
  });

  it("mentions file contents and secrets in notInspected", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "README.md", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });

    expect(result.notInspected).toContain("File contents");
    expect(result.notInspected).toContain("Secrets and credentials");
  });

  it("validates a safe metadata-only result", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "README.md", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    expect(validateAnalyzeWorkspaceResult(result)).toEqual({ ok: true });
  });

  it("rejects a result with aiUsed enabled", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "README.md", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    const mutatedResult = {
      ...result,
      aiUsed: true as false,
    };

    const validation = validateAnalyzeWorkspaceResult(mutatedResult);
    expect(validation.ok).toBe(false);
  });

  it("rejects a result that claims file contents were read", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "README.md", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    const mutatedResult = {
      ...result,
      inspected: {
        ...result.inspected,
        filesRead: ["README.md"],
      },
    };

    const validation = validateAnalyzeWorkspaceResult(mutatedResult);
    expect(validation.ok).toBe(false);
  });

  it("rejects a result that claims commands ran", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "README.md", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    const mutatedResult = {
      ...result,
      inspected: {
        ...result.inspected,
        commandsRun: ["npm test"],
      },
    };

    const validation = validateAnalyzeWorkspaceResult(mutatedResult);
    expect(validation.ok).toBe(false);
  });

  it("rejects overclaiming about tests or security", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "README.md", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({ request, snapshot });
    const mutatedResult = {
      ...result,
      summary: {
        ...result.summary,
        description: "Paperclip verified that tests passed and security posture is strong.",
      },
    };

    const validation = validateAnalyzeWorkspaceResult(mutatedResult);
    expect(validation.ok).toBe(false);
  });

  it("includes README in filesRead after an approved excerpt", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "README.md", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({
      request,
      snapshot,
      readmeExcerpt: {
        schemaVersion: 1,
        excerptType: "analyze_workspace_readme_excerpt",
        filename: "README.md",
        bytesRead: 64,
        truncated: false,
        content: "# Demo Project\n\nA sample app.\n",
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

    expect(result.inspected.filesRead).toEqual(["README.md"]);
    expect(result.inspected.commandsRun).toEqual([]);
    expect(result.aiUsed).toBe(false);
    expect(result.safety.fileContentsRead).toBe(true);
  });

  it("uses manifest fields to improve detected tools and filesRead", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "package.json", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({
      request,
      snapshot,
      manifestFields: {
        schemaVersion: 1,
        fieldsType: "analyze_workspace_manifest_fields",
        filename: "package.json",
        kind: "package_json",
        bytesRead: 128,
        truncated: false,
        confidence: "high",
        fields: {
          name: "paperclip-app",
          language: "JavaScript",
          frameworkHints: ["React", "Vite"],
          packageManagerHints: ["npm-compatible"],
          scripts: ["dev", "build"],
          dependencies: ["react", "vite"],
        },
        omitted: ["script command values", "raw manifest content"],
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

    expect(result.detected.languages).toContain("JavaScript");
    expect(result.detected.frameworks).toContain("React");
    expect(result.detected.packageManagers).toContain("npm-compatible");
    expect(result.inspected.filesRead).toEqual(["package.json"]);
    expect(result.inspected.commandsRun).toEqual([]);
    expect(result.aiUsed).toBe(false);
  });

  it("tracks README and manifest reads together without commands or AI", () => {
    const request = buildAnalyzeWorkspaceRequest({
      workspace: { selected: true, path: "/Users/example/project" },
    });
    const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
      entries: [{ name: "package.json", kind: "file" }, { name: "README.md", kind: "file" }],
    });

    expect(request).not.toBeNull();
    if (!request) return;

    const result = buildAnalyzeWorkspaceResultFromMetadata({
      request,
      snapshot,
      readmeExcerpt: {
        schemaVersion: 1,
        excerptType: "analyze_workspace_readme_excerpt",
        filename: "README.md",
        bytesRead: 64,
        truncated: false,
        content: "# Demo Project\n\nA sample app.\n",
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
      manifestFields: {
        schemaVersion: 1,
        fieldsType: "analyze_workspace_manifest_fields",
        filename: "package.json",
        kind: "package_json",
        bytesRead: 128,
        truncated: false,
        confidence: "high",
        fields: {
          name: "paperclip-app",
          language: "JavaScript",
          dependencies: ["react"],
        },
        omitted: ["raw manifest content"],
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

    expect(result.inspected.filesRead).toEqual(["README.md", "package.json"]);
    expect(result.contentReads).toHaveLength(2);
    expect(result.safety.fileContentsRead).toBe(true);
    expect(result.inspected.commandsRun).toEqual([]);
    expect(result.aiUsed).toBe(false);
  });
});
