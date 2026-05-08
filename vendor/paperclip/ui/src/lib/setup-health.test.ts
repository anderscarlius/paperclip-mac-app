import { describe, expect, it } from "vitest";
import {
  buildAnalyzeWorkspaceRequest,
  buildAnalyzeWorkspaceResultFromMetadata,
  collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries,
  buildAnalyzeWorkspaceMetadataSnapshotFromEntries,
  classifyManifestIndicator,
  isSensitiveWorkspaceEntryName,
  validateAnalyzeWorkspaceResult,
  validateAnalyzeWorkspaceMetadataSnapshot,
} from "./setup-health";

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
});
