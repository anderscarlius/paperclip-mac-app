import { describe, expect, it } from "vitest";
import {
  buildAnalyzeWorkspaceMetadataSnapshotFromEntries,
  classifyManifestIndicator,
  isSensitiveWorkspaceEntryName,
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
      collectionMode: "future_filesystem_read" as const,
      limits: {
        ...snapshot.limits,
        fileContentsRead: true as false,
      },
    };

    const validation = validateAnalyzeWorkspaceMetadataSnapshot(mutatedSnapshot);

    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors.some((error) => error.includes("collectionMode"))).toBe(true);
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
});
