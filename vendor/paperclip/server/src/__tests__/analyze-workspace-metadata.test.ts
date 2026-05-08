import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  collectAnalyzeWorkspaceTopLevelMetadataFromFilesystem,
  readTopLevelManifestFields,
  readTopLevelReadmeExcerpt,
} from "../services/analyze-workspace-metadata.js";

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

  it("reads the first bytes of a top-level README.md and truncates at maxBytes", async () => {
    await fs.writeFile(path.join(tmpDir, "README.md"), "# Demo Project\n\nThis is a long enough README excerpt.\n");

    const result = await readTopLevelReadmeExcerpt({
      workspacePath: tmpDir,
      filename: "README.md",
      maxBytes: 12,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.excerpt.filename).toBe("README.md");
    expect(result.excerpt.bytesRead).toBe(12);
    expect(result.excerpt.truncated).toBe(true);
    expect(result.excerpt.safety.commandsRun).toBe(false);
  });

  it("rejects forbidden README filenames and symlinks", async () => {
    await fs.writeFile(path.join(tmpDir, "README.md"), "# Demo\n");
    await fs.symlink(path.join(tmpDir, "README.md"), path.join(tmpDir, "README.txt"));

    const forbiddenNameResult = await readTopLevelReadmeExcerpt({
      workspacePath: tmpDir,
      filename: "../README.md",
    });
    const envResult = await readTopLevelReadmeExcerpt({
      workspacePath: tmpDir,
      filename: ".env",
    });
    const symlinkResult = await readTopLevelReadmeExcerpt({
      workspacePath: tmpDir,
      filename: "README.txt",
    });

    expect(forbiddenNameResult.ok).toBe(false);
    expect(envResult.ok).toBe(false);
    expect(symlinkResult.ok).toBe(false);
  });

  it("rejects directories and nested readme paths", async () => {
    await fs.mkdir(path.join(tmpDir, "README.md"));
    await fs.mkdir(path.join(tmpDir, "docs"));
    await fs.writeFile(path.join(tmpDir, "docs", "README.md"), "# nested\n");

    const directoryResult = await readTopLevelReadmeExcerpt({
      workspacePath: tmpDir,
      filename: "README.md",
    });
    const nestedResult = await readTopLevelReadmeExcerpt({
      workspacePath: tmpDir,
      filename: "docs/README.md",
    });
    const missingResult = await readTopLevelReadmeExcerpt({
      workspacePath: tmpDir,
      filename: "README.txt",
    });

    expect(directoryResult.ok).toBe(false);
    expect(nestedResult.ok).toBe(false);
    expect(missingResult.ok).toBe(false);
  });

  it("reads selected safe fields from package.json without exposing script values", async () => {
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "paperclip-app",
        description: "Demo app",
        scripts: {
          dev: "vite --host 127.0.0.1",
          build: "vite build",
        },
        dependencies: {
          react: "^19.0.0",
          vite: "^6.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
      }, null, 2),
    );

    const result = await readTopLevelManifestFields({
      workspacePath: tmpDir,
      filename: "package.json",
      maxBytes: 16384,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest.filename).toBe("package.json");
    expect(result.manifest.fields.scripts).toEqual(["dev", "build"]);
    expect(result.manifest.fields.dependencies).toEqual(["react", "vite"]);
    expect(result.manifest.omitted).toContain("script command values");
    expect(result.manifest.safety.commandsRun).toBe(false);
  });

  it("rejects forbidden, nested, symlink, and directory manifest paths", async () => {
    await fs.writeFile(path.join(tmpDir, "package.json"), "{}");
    await fs.mkdir(path.join(tmpDir, "src"));
    await fs.writeFile(path.join(tmpDir, "src", "package.json"), "{}");
    await fs.symlink(path.join(tmpDir, "package.json"), path.join(tmpDir, "Package.swift"));
    await fs.mkdir(path.join(tmpDir, "go.mod"));

    const forbidden = await readTopLevelManifestFields({
      workspacePath: tmpDir,
      filename: "../package.json",
    });
    const envResult = await readTopLevelManifestFields({
      workspacePath: tmpDir,
      filename: ".env",
    });
    const nested = await readTopLevelManifestFields({
      workspacePath: tmpDir,
      filename: "src/package.json",
    });
    const symlink = await readTopLevelManifestFields({
      workspacePath: tmpDir,
      filename: "Package.swift",
    });
    const directory = await readTopLevelManifestFields({
      workspacePath: tmpDir,
      filename: "go.mod",
    });

    expect(forbidden.ok).toBe(false);
    expect(envResult.ok).toBe(false);
    expect(nested.ok).toBe(false);
    expect(symlink.ok).toBe(false);
    expect(directory.ok).toBe(false);
  });

  it("parses pyproject.toml, Cargo.toml, go.mod, and Package.swift conservatively", async () => {
    await fs.writeFile(path.join(tmpDir, "pyproject.toml"), `
[project]
name = "demo-py"
version = "0.1.0"
description = "Python demo"
dependencies = ["fastapi>=0.1", "uvicorn>=0.1"]

[build-system]
build-backend = "setuptools.build_meta"
`);
    await fs.writeFile(path.join(tmpDir, "Cargo.toml"), `
[package]
name = "demo-rs"
version = "0.1.0"
description = "Rust demo"

[dependencies]
serde = "1"
tokio = "1"
`);
    await fs.writeFile(path.join(tmpDir, "go.mod"), `
module example.com/demo
go 1.22
require (
  github.com/gin-gonic/gin v1.10.0
)
replace example.com/local => ../local
`);
    await fs.writeFile(path.join(tmpDir, "Package.swift"), `
// swift-tools-version: 5.9
import PackageDescription
let package = Package(
  name: "PaperclipDesktop",
  platforms: [.macOS(.v14)],
  products: [
    .executable(name: "PaperclipDesktop", targets: ["PaperclipDesktop"])
  ],
  dependencies: [
    .package(url: "https://github.com/apple/swift-argument-parser.git", from: "1.0.0")
  ],
  targets: [
    .executableTarget(name: "PaperclipDesktop")
  ]
)
`);

    const pyproject = await readTopLevelManifestFields({ workspacePath: tmpDir, filename: "pyproject.toml" });
    const cargo = await readTopLevelManifestFields({ workspacePath: tmpDir, filename: "Cargo.toml" });
    const gomod = await readTopLevelManifestFields({ workspacePath: tmpDir, filename: "go.mod", maxBytes: 999999 });
    const swiftpm = await readTopLevelManifestFields({ workspacePath: tmpDir, filename: "Package.swift" });

    expect(pyproject.ok).toBe(true);
    if (pyproject.ok) {
      expect(pyproject.manifest.fields.name).toBe("demo-py");
      expect(pyproject.manifest.fields.dependencies).toContain("fastapi");
    }
    expect(cargo.ok).toBe(true);
    if (cargo.ok) {
      expect(cargo.manifest.fields.dependencies).toContain("serde");
    }
    expect(gomod.ok).toBe(true);
    if (gomod.ok) {
      expect(gomod.manifest.fields.moduleName).toBe("example.com/demo");
      expect(gomod.manifest.fields.dependencies).toContain("github.com/gin-gonic/gin");
      expect(gomod.manifest.fields.notes).toContain("replace directives present; paths not shown");
      expect(gomod.manifest.bytesRead).toBeLessThanOrEqual(16384);
    }
    expect(swiftpm.ok).toBe(true);
    if (swiftpm.ok) {
      expect(swiftpm.manifest.fields.name).toBe("PaperclipDesktop");
      expect(swiftpm.manifest.fields.products).toContain("PaperclipDesktop");
      expect(swiftpm.manifest.fields.targets).toContain("PaperclipDesktop");
      expect(swiftpm.manifest.fields.platforms).toContain("macOS");
    }
  });

  it("rejects invalid package.json safely", async () => {
    await fs.writeFile(path.join(tmpDir, "package.json"), "{ invalid json");

    const result = await readTopLevelManifestFields({
      workspacePath: tmpDir,
      filename: "package.json",
    });

    expect(result.ok).toBe(false);
  });
});
