import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { collectAnalyzeWorkspaceTopLevelMetadataFromFilesystem } from "../services/analyze-workspace-metadata.js";

describe("analyze workspace metadata collector", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "paperclip-metadata-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("collects only top-level filename metadata and redacts sensitive names", async () => {
    await fs.writeFile(path.join(tmpDir, "README.md"), "# demo\n");
    await fs.writeFile(path.join(tmpDir, "package.json"), "{}\n");
    await fs.writeFile(path.join(tmpDir, ".env"), "TOKEN=secret\n");
    await fs.mkdir(path.join(tmpDir, "src"));
    await fs.writeFile(path.join(tmpDir, "src", "nested.ts"), "export {};\n");
    await fs.mkdir(path.join(tmpDir, "node_modules"));
    await fs.writeFile(path.join(tmpDir, "node_modules", "child.js"), "module.exports = {};\n");
    await fs.mkdir(path.join(tmpDir, ".git"));

    const result = await collectAnalyzeWorkspaceTopLevelMetadataFromFilesystem({
      workspace: {
        displayName: "demo",
        path: tmpDir,
        pathHealth: {
          risk: "medium",
          reasons: ["contains_spaces"],
        },
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.snapshot.snapshotType).toBe("analyze_workspace_metadata_snapshot");
    expect(result.snapshot.collectionMode).toBe("future_filesystem_read");
    expect(result.snapshot.limits.recursiveScan).toBe(false);
    expect(result.snapshot.limits.fileContentsRead).toBe(false);
    expect(result.snapshot.safety.commandsRun).toBe(false);
    expect(result.snapshot.safety.agentStarted).toBe(false);
    expect(result.snapshot.safety.localFallbackUsed).toBe(false);
    expect(result.snapshot.safety.automaticRoutingUsed).toBe(false);
    expect(result.snapshot.topLevelEntries.some((entry) => entry.name === ".env")).toBe(false);
    expect(result.snapshot.topLevelEntries.some((entry) => entry.name === "[redacted]" && entry.redacted === true)).toBe(true);
    expect(result.snapshot.topLevelEntries.some((entry) => entry.name === "nested.ts")).toBe(false);
    expect(result.snapshot.topLevelEntries.some((entry) => entry.name === "node_modules" && entry.kind === "directory")).toBe(true);
    expect(result.snapshot.manifestIndicators.some((indicator) => indicator.name === "package.json")).toBe(true);
    expect(result.snapshot.manifestIndicators.some((indicator) => indicator.name === "README.md")).toBe(true);
    expect(result.snapshot.manifestIndicators.some((indicator) => indicator.name === ".git")).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("filename-only"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("redacted"))).toBe(true);
    expect(result.warnings.some((warning) => warning.includes("path health"))).toBe(true);
  });

  it("enforces the maximum top-level entry limit", async () => {
    await fs.writeFile(path.join(tmpDir, "README.md"), "# demo\n");
    await fs.writeFile(path.join(tmpDir, "package.json"), "{}\n");
    await fs.mkdir(path.join(tmpDir, "src"));

    const result = await collectAnalyzeWorkspaceTopLevelMetadataFromFilesystem({
      workspace: {
        displayName: "demo",
        path: tmpDir,
      },
      maxTopLevelEntries: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.topLevelEntries).toHaveLength(2);
    expect(result.warnings.some((warning) => warning.includes("truncated"))).toBe(true);
  });

  it("returns a safe invalid result when the workspace path is not a directory", async () => {
    const filePath = path.join(tmpDir, "README.md");
    await fs.writeFile(filePath, "# demo\n");

    const result = await collectAnalyzeWorkspaceTopLevelMetadataFromFilesystem({
      workspace: {
        path: filePath,
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.snapshot).toBeNull();
  });
});
