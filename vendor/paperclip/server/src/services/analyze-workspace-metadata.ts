import fs from "node:fs/promises";
import path from "node:path";

type WorkspacePathHealth = {
  risk: "none" | "low" | "medium" | "unknown";
  reasons: string[];
} | null | undefined;

type CollectionWorkspaceInput = {
  displayName?: string | null;
  path: string;
  pathHealth?: WorkspacePathHealth;
};

type CollectionTopLevelEntry = {
  name: string;
  kind: "file" | "directory" | "unknown";
};

type AnalyzeWorkspaceServerManifestCategory =
  | "javascript"
  | "swift"
  | "python"
  | "rust"
  | "go"
  | "ruby"
  | "php"
  | "readme"
  | "git"
  | "docker"
  | "source"
  | "test"
  | "docs"
  | "other";

type AnalyzeWorkspaceServerTopLevelEntry = {
  name: string;
  kind: "file" | "directory" | "unknown";
  redacted?: boolean;
  reason?: string;
};

type AnalyzeWorkspaceServerManifestIndicator = {
  name: string;
  present: boolean;
  category: AnalyzeWorkspaceServerManifestCategory;
};

type AnalyzeWorkspaceServerMetadataSnapshot = {
  schemaVersion: 1;
  snapshotType: "analyze_workspace_metadata_snapshot";
  collectionMode: "future_filesystem_read";
  workspace: {
    displayName?: string | null;
    pathHealth?: {
      risk: "none" | "low" | "medium" | "unknown";
      reasons: string[];
    } | null;
  };
  topLevelEntries: AnalyzeWorkspaceServerTopLevelEntry[];
  manifestIndicators: AnalyzeWorkspaceServerManifestIndicator[];
  limits: {
    maxTopLevelEntries: number;
    recursiveScan: false;
    fileContentsRead: false;
    commandsRun: false;
    networkAccessed: false;
  };
  redactions: Array<{
    name: string;
    reason: string;
  }>;
  notCollected: string[];
  safety: {
    readOnly: true;
    filesChanged: false;
    commandsRun: false;
    networkAccessed: false;
    agentStarted: false;
    localFallbackUsed: false;
    automaticRoutingUsed: false;
  };
};

export type AnalyzeWorkspaceServerCollectionInput = {
  workspace: CollectionWorkspaceInput;
  maxTopLevelEntries?: number;
};

export type AnalyzeWorkspaceServerCollectionResult =
  | {
    ok: true;
    snapshot: AnalyzeWorkspaceServerMetadataSnapshot;
    warnings: string[];
  }
  | {
    ok: false;
    snapshot: null;
    errors: string[];
    warnings: string[];
  };

type AnalyzeWorkspaceServerReadmeExcerpt = {
  schemaVersion: 1;
  excerptType: "analyze_workspace_readme_excerpt";
  filename: string;
  bytesRead: number;
  truncated: boolean;
  content: string;
  safety: {
    readOnly: true;
    filesChanged: false;
    commandsRun: false;
    networkAccessed: false;
    aiUsed: false;
    recursiveScan: false;
    followedSymlink: false;
  };
};

export type AnalyzeWorkspaceServerReadmeExcerptResult =
  | {
    ok: true;
    excerpt: AnalyzeWorkspaceServerReadmeExcerpt;
  }
  | {
    ok: false;
    error: string;
  };

type AnalyzeWorkspaceServerManifestKind =
  | "package_json"
  | "pyproject_toml"
  | "cargo_toml"
  | "go_mod"
  | "package_swift";

type AnalyzeWorkspaceServerManifestFields = {
  schemaVersion: 1;
  fieldsType: "analyze_workspace_manifest_fields";
  filename: string;
  kind: AnalyzeWorkspaceServerManifestKind;
  bytesRead: number;
  truncated: boolean;
  confidence: "high" | "medium" | "low";
  fields: {
    name?: string;
    version?: string;
    description?: string;
    moduleName?: string;
    language?: string;
    packageManagerHints?: string[];
    frameworkHints?: string[];
    scripts?: string[];
    dependencies?: string[];
    devDependencies?: string[];
    targets?: string[];
    products?: string[];
    platforms?: string[];
    buildBackend?: string;
    notes?: string[];
  };
  omitted: string[];
  safety: {
    readOnly: true;
    filesChanged: false;
    commandsRun: false;
    networkAccessed: false;
    aiUsed: false;
    recursiveScan: false;
    followedSymlink: false;
  };
};

export type AnalyzeWorkspaceServerManifestFieldsResult =
  | {
    ok: true;
    manifest: AnalyzeWorkspaceServerManifestFields;
  }
  | {
    ok: false;
    error: string;
  };

const DEFAULT_MAX_TOP_LEVEL_ENTRIES = 50;
const MAX_README_BYTES = 4096;
const MAX_MANIFEST_BYTES = 16384;
const REDACTED_ENTRY_NAME = "[redacted]";
const SENSITIVE_ENTRY_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  "id_rsa",
  "id_ed25519",
  "credentials",
  "credentials.json",
  "auth.json",
  "device-auth.json",
  "token",
  "tokens",
  "secret",
  "secrets",
  ".ssh",
]);
const MANIFEST_INDICATOR_CATEGORIES = new Map<
  string,
  AnalyzeWorkspaceServerManifestCategory
>([
  ["package.json", "javascript"],
  ["pnpm-lock.yaml", "javascript"],
  ["package-lock.json", "javascript"],
  ["yarn.lock", "javascript"],
  ["bun.lockb", "javascript"],
  ["package.swift", "swift"],
  ["pyproject.toml", "python"],
  ["requirements.txt", "python"],
  ["poetry.lock", "python"],
  ["cargo.toml", "rust"],
  ["cargo.lock", "rust"],
  ["go.mod", "go"],
  ["go.sum", "go"],
  ["gemfile", "ruby"],
  ["gemfile.lock", "ruby"],
  ["composer.json", "php"],
  ["composer.lock", "php"],
  ["readme", "readme"],
  ["readme.md", "readme"],
  ["readme.txt", "readme"],
  [".git", "git"],
  ["dockerfile", "docker"],
  ["docker-compose.yml", "docker"],
  ["src", "source"],
  ["sources", "source"],
  ["test", "test"],
  ["tests", "test"],
  ["docs", "docs"],
]);
const ALLOWED_README_FILENAMES = new Set([
  "README",
  "README.md",
  "README.txt",
  "readme",
  "readme.md",
  "readme.txt",
]);
const MANIFEST_KIND_BY_FILENAME = new Map<string, AnalyzeWorkspaceServerManifestKind>([
  ["package.json", "package_json"],
  ["pyproject.toml", "pyproject_toml"],
  ["Cargo.toml", "cargo_toml"],
  ["go.mod", "go_mod"],
  ["Package.swift", "package_swift"],
]);
const MANIFEST_FRAMEWORK_HINT_MAP = new Map<string, string>([
  ["react", "React"],
  ["next", "Next.js"],
  ["vite", "Vite"],
  ["vue", "Vue"],
  ["svelte", "Svelte"],
  ["@angular/core", "Angular"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["vitest", "Vitest"],
  ["jest", "Jest"],
  ["typescript", "TypeScript"],
]);

function normalizeWorkspaceEntryName(name: string) {
  return name.trim().toLowerCase();
}

function isAllowedReadmeFilename(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0") || trimmed.includes("..")) {
    return false;
  }
  if (isSensitiveWorkspaceEntryName(trimmed)) return false;
  return ALLOWED_README_FILENAMES.has(trimmed);
}

function isAllowedManifestFilename(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0") || trimmed.includes("..")) {
    return false;
  }
  if (isSensitiveWorkspaceEntryName(trimmed)) return false;
  return MANIFEST_KIND_BY_FILENAME.has(trimmed);
}

function manifestKindForFilename(name: string): AnalyzeWorkspaceServerManifestKind | null {
  return MANIFEST_KIND_BY_FILENAME.get(name.trim()) ?? null;
}

function isSensitiveWorkspaceEntryName(name: string) {
  const normalized = normalizeWorkspaceEntryName(name);
  if (SENSITIVE_ENTRY_NAMES.has(normalized)) return true;
  if (normalized.startsWith(".env.")) return true;
  if (normalized.includes("credential")) return true;
  if (normalized.includes("token")) return true;
  if (normalized === "secret" || normalized === "secrets") return true;
  return false;
}

function pushUnique(values: string[], nextValue: string) {
  if (!values.includes(nextValue)) values.push(nextValue);
}

function parseTomlString(value: string): string | null {
  const match = value.match(/^["'](.+)["']$/u);
  return match?.[1]?.trim() || null;
}

function parseInlineTomlArray(value: string): string[] {
  const arrayMatch = value.match(/^\[(.*)\]$/u);
  if (!arrayMatch) return [];
  return arrayMatch[1]
    .split(",")
    .map((entry) => parseTomlString(entry.trim()))
    .filter((entry): entry is string => Boolean(entry));
}

function extractPythonDependencyName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([A-Za-z0-9._-]+)/u);
  return match?.[1] ?? null;
}

function extractPackageSwiftArrayStrings(content: string, label: string): string[] {
  const regex = new RegExp(`${label}\\s*:\\s*\\[(.*?)\\]`, "su");
  const match = content.match(regex);
  if (!match) return [];
  return Array.from(match[1].matchAll(/name\s*:\s*"([^"]+)"/gu))
    .map((entry) => entry[1]?.trim())
    .filter((entry): entry is string => Boolean(entry));
}

function extractPackageSwiftPlatforms(content: string): string[] {
  const regex = /platforms\s*:\s*\[(.*?)\]/su;
  const match = content.match(regex);
  if (!match) return [];
  return Array.from(match[1].matchAll(/\.(\w+)\s*\(/gu))
    .map((entry) => entry[1]?.trim())
    .filter((entry): entry is string => Boolean(entry));
}

function extractPackageSwiftDependencyHints(content: string): string[] {
  return Array.from(content.matchAll(/package\s*\(\s*url:\s*"([^"]+)"/gu))
    .map((entry) => {
      const url = entry[1]?.trim();
      if (!url) return null;
      try {
        const parsed = new URL(url);
        const repoName = parsed.pathname.split("/").filter(Boolean).pop()?.replace(/\.git$/u, "");
        return repoName ? `${parsed.hostname}/${repoName}` : parsed.hostname;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is string => Boolean(entry));
}

function deriveFrameworkHintsFromDependencies(names: string[]): string[] {
  const hints: string[] = [];
  for (const name of names) {
    const hint = MANIFEST_FRAMEWORK_HINT_MAP.get(name);
    if (hint) pushUnique(hints, hint);
  }
  return hints;
}

function classifyManifestIndicator(name: string) {
  const normalized = normalizeWorkspaceEntryName(name);
  const category = MANIFEST_INDICATOR_CATEGORIES.get(normalized);
  if (!category) return null;
  return {
    name,
    present: true,
    category,
  };
}

function buildSnapshotFromEntries(input: {
  workspace: CollectionWorkspaceInput;
  entries: CollectionTopLevelEntry[];
  maxTopLevelEntries: number;
  truncated: boolean;
}): AnalyzeWorkspaceServerMetadataSnapshot {
  const topLevelEntries: AnalyzeWorkspaceServerTopLevelEntry[] = [];
  const manifestIndicators: AnalyzeWorkspaceServerManifestIndicator[] = [];
  const redactions: AnalyzeWorkspaceServerMetadataSnapshot["redactions"] = [];
  const seenIndicators = new Set<string>();

  for (const entry of input.entries) {
    if (isSensitiveWorkspaceEntryName(entry.name)) {
      const reason = "Sensitive-looking top-level entry name was redacted.";
      topLevelEntries.push({
        name: REDACTED_ENTRY_NAME,
        kind: entry.kind,
        redacted: true,
        reason,
      });
      redactions.push({
        name: REDACTED_ENTRY_NAME,
        reason,
      });
      continue;
    }

    topLevelEntries.push({
      name: entry.name,
      kind: entry.kind,
    });

    const indicator = classifyManifestIndicator(entry.name);
    if (indicator && !seenIndicators.has(normalizeWorkspaceEntryName(indicator.name))) {
      seenIndicators.add(normalizeWorkspaceEntryName(indicator.name));
      manifestIndicators.push(indicator);
    }
  }

  const notCollected = [
    "No file contents were read.",
    "No commands were run.",
    "No recursive scan was performed.",
    "No secrets were read.",
    "No AI inference was performed.",
  ];
  if (input.truncated) {
    notCollected.push(`Top-level entry list was truncated at ${input.maxTopLevelEntries} entries.`);
  }

  return {
    schemaVersion: 1 as const,
    snapshotType: "analyze_workspace_metadata_snapshot" as const,
    collectionMode: "future_filesystem_read" as const,
    workspace: {
      displayName: input.workspace.displayName ?? null,
      pathHealth: input.workspace.pathHealth
        ? {
          risk: input.workspace.pathHealth.risk,
          reasons: [...input.workspace.pathHealth.reasons],
        }
        : null,
    },
    topLevelEntries,
    manifestIndicators,
    limits: {
      maxTopLevelEntries: input.maxTopLevelEntries,
      recursiveScan: false as const,
      fileContentsRead: false as const,
      commandsRun: false as const,
      networkAccessed: false as const,
    },
    redactions,
    notCollected,
    safety: {
      readOnly: true as const,
      filesChanged: false as const,
      commandsRun: false as const,
      networkAccessed: false as const,
      agentStarted: false as const,
      localFallbackUsed: false as const,
      automaticRoutingUsed: false as const,
    },
  };
}

function buildWarnings(input: {
  snapshot: AnalyzeWorkspaceServerMetadataSnapshot;
  truncated: boolean;
}) {
  const warnings = [
    "Collection is filename-only.",
    "No file contents were read.",
  ];
  if (input.truncated) {
    warnings.push(`Top-level entries were truncated at ${input.snapshot.limits.maxTopLevelEntries}.`);
  }
  if (input.snapshot.redactions.length > 0) {
    warnings.push("Sensitive-looking top-level names were redacted.");
  }
  if (input.snapshot.workspace.pathHealth?.risk === "medium") {
    warnings.push("Workspace path health has a warning. Metadata collection remained read-only.");
  }
  return warnings;
}

export async function collectAnalyzeWorkspaceTopLevelMetadataFromFilesystem(
  input: AnalyzeWorkspaceServerCollectionInput,
): Promise<AnalyzeWorkspaceServerCollectionResult> {
  const workspacePath = input.workspace.path.trim();
  const maxTopLevelEntries = input.maxTopLevelEntries ?? DEFAULT_MAX_TOP_LEVEL_ENTRIES;
  const warnings = [
    "Collection is filename-only.",
    "No file contents were read.",
  ];

  if (workspacePath.length === 0) {
    return {
      ok: false,
      snapshot: null,
      errors: ["workspace.path must be a non-empty string."],
      warnings,
    };
  }

  try {
    const stats = await fs.lstat(workspacePath);
    if (!stats.isDirectory()) {
      return {
        ok: false,
        snapshot: null,
        errors: ["workspace.path must point to a directory."],
        warnings,
      };
    }
  } catch (error) {
    return {
      ok: false,
      snapshot: null,
      errors: [
        `Could not access workspace path: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings,
    };
  }

  let dirents: Array<{
    name: string;
    isFile(): boolean;
    isDirectory(): boolean;
  }>;
  try {
    dirents = await fs.readdir(workspacePath, { withFileTypes: true, encoding: "utf8" });
  } catch (error) {
    return {
      ok: false,
      snapshot: null,
      errors: [
        `Could not list top-level workspace entries: ${error instanceof Error ? error.message : String(error)}`,
      ],
      warnings,
    };
  }

  const truncated = dirents.length > maxTopLevelEntries;
  const entries = dirents.slice(0, maxTopLevelEntries).map((entry): CollectionTopLevelEntry => ({
    name: entry.name,
    kind: entry.isFile() ? "file" : entry.isDirectory() ? "directory" : "unknown",
  }));

  const snapshot = buildSnapshotFromEntries({
    workspace: input.workspace,
    entries,
    maxTopLevelEntries,
    truncated,
  });

  return {
    ok: true,
    snapshot,
    warnings: buildWarnings({ snapshot, truncated }),
  };
}

function parsePackageJsonManifest(
  filename: string,
  content: string,
  bytesRead: number,
  truncated: boolean,
): AnalyzeWorkspaceServerManifestFieldsResult {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const scripts = parsed.scripts && typeof parsed.scripts === "object" && !Array.isArray(parsed.scripts)
      ? Object.keys(parsed.scripts as Record<string, unknown>)
      : [];
    const dependencies = parsed.dependencies && typeof parsed.dependencies === "object" && !Array.isArray(parsed.dependencies)
      ? Object.keys(parsed.dependencies as Record<string, unknown>)
      : [];
    const devDependencies = parsed.devDependencies && typeof parsed.devDependencies === "object" && !Array.isArray(parsed.devDependencies)
      ? Object.keys(parsed.devDependencies as Record<string, unknown>)
      : [];
    const peerDependencies = parsed.peerDependencies && typeof parsed.peerDependencies === "object" && !Array.isArray(parsed.peerDependencies)
      ? Object.keys(parsed.peerDependencies as Record<string, unknown>)
      : [];
    const allDependencyNames = [...dependencies, ...devDependencies, ...peerDependencies];
    const frameworkHints = deriveFrameworkHintsFromDependencies(allDependencyNames);
    const packageManagerHints: string[] = [];
    if (parsed.packageManager && typeof parsed.packageManager === "string") {
      pushUnique(packageManagerHints, parsed.packageManager.split("@")[0] ?? parsed.packageManager);
    } else {
      pushUnique(packageManagerHints, "npm-compatible");
    }
    const engines = parsed.engines && typeof parsed.engines === "object" && !Array.isArray(parsed.engines)
      ? Object.keys(parsed.engines as Record<string, unknown>)
      : [];

    return {
      ok: true,
      manifest: {
        schemaVersion: 1,
        fieldsType: "analyze_workspace_manifest_fields",
        filename,
        kind: "package_json",
        bytesRead,
        truncated,
        confidence: "high",
        fields: {
          name: typeof parsed.name === "string" ? parsed.name : undefined,
          version: typeof parsed.version === "string" ? parsed.version : undefined,
          description: typeof parsed.description === "string" ? parsed.description : undefined,
          language: frameworkHints.includes("TypeScript") ? "TypeScript" : "JavaScript",
          packageManagerHints,
          frameworkHints,
          scripts,
          dependencies,
          devDependencies: [...devDependencies, ...peerDependencies],
          notes: engines.length > 0 ? [`engines keys: ${engines.join(", ")}`] : undefined,
        },
        omitted: [
          "script command values",
          "dependency versions",
          "raw manifest content",
        ],
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
    };
  } catch {
    return { ok: false, error: "Manifest JSON could not be parsed safely." };
  }
}

function parsePyprojectManifest(
  filename: string,
  content: string,
  bytesRead: number,
  truncated: boolean,
): AnalyzeWorkspaceServerManifestFieldsResult {
  let section = "";
  const fields: AnalyzeWorkspaceServerManifestFields["fields"] = {
    language: "Python",
    packageManagerHints: [],
    dependencies: [],
    devDependencies: [],
    frameworkHints: [],
    notes: [],
  };

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sectionMatch = line.match(/^\[(.+)\]$/u);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }
    const keyValueMatch = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/u);
    if (!keyValueMatch) continue;
    const [, key, rawValue] = keyValueMatch;

    if (section === "project") {
      if (key === "name") fields.name = parseTomlString(rawValue) ?? fields.name;
      if (key === "version") fields.version = parseTomlString(rawValue) ?? fields.version;
      if (key === "description") fields.description = parseTomlString(rawValue) ?? fields.description;
      if (key === "dependencies") {
        for (const dep of parseInlineTomlArray(rawValue)) {
          const name = extractPythonDependencyName(dep);
          if (name) pushUnique(fields.dependencies!, name);
        }
      }
    }
    if (section === "tool.poetry") {
      if (key === "name") fields.name = parseTomlString(rawValue) ?? fields.name;
      if (key === "version") fields.version = parseTomlString(rawValue) ?? fields.version;
      if (key === "description") fields.description = parseTomlString(rawValue) ?? fields.description;
    }
    if (section === "tool.poetry.dependencies") {
      if (key !== "python") pushUnique(fields.dependencies!, key);
      pushUnique(fields.packageManagerHints!, "Poetry");
    }
    if (section.startsWith("tool.poetry.group.") && section.endsWith(".dependencies")) {
      if (key !== "python") pushUnique(fields.devDependencies!, key);
      pushUnique(fields.packageManagerHints!, "Poetry");
    }
    if (section === "build-system" && key === "build-backend") {
      fields.buildBackend = parseTomlString(rawValue) ?? fields.buildBackend;
    }
  }

  return {
    ok: true,
    manifest: {
      schemaVersion: 1,
      fieldsType: "analyze_workspace_manifest_fields",
      filename,
      kind: "pyproject_toml",
      bytesRead,
      truncated,
      confidence: fields.name || fields.version || fields.dependencies?.length ? "medium" : "low",
      fields,
      omitted: [
        "raw manifest content",
        "arbitrary tool.* sections",
      ],
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
  };
}

function parseCargoManifest(
  filename: string,
  content: string,
  bytesRead: number,
  truncated: boolean,
): AnalyzeWorkspaceServerManifestFieldsResult {
  let section = "";
  const fields: AnalyzeWorkspaceServerManifestFields["fields"] = {
    language: "Rust",
    packageManagerHints: ["Cargo"],
    dependencies: [],
    devDependencies: [],
    notes: [],
  };

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const sectionMatch = line.match(/^\[(.+)\]$/u);
    if (sectionMatch) {
      section = sectionMatch[1].trim();
      continue;
    }
    const keyValueMatch = line.match(/^([A-Za-z0-9_.-]+)\s*=\s*(.+)$/u);
    if (!keyValueMatch) continue;
    const [, key, rawValue] = keyValueMatch;

    if (section === "package") {
      if (key === "name") fields.name = parseTomlString(rawValue) ?? fields.name;
      if (key === "version") fields.version = parseTomlString(rawValue) ?? fields.version;
      if (key === "description") fields.description = parseTomlString(rawValue) ?? fields.description;
    } else if (section === "dependencies") {
      pushUnique(fields.dependencies!, key);
    } else if (section === "dev-dependencies" || section === "build-dependencies") {
      pushUnique(fields.devDependencies!, key);
    } else if (section === "workspace" && key === "members") {
      for (const member of parseInlineTomlArray(rawValue)) {
        pushUnique(fields.notes!, `workspace member: ${member}`);
      }
    }
  }

  return {
    ok: true,
    manifest: {
      schemaVersion: 1,
      fieldsType: "analyze_workspace_manifest_fields",
      filename,
      kind: "cargo_toml",
      bytesRead,
      truncated,
      confidence: fields.name || fields.dependencies?.length ? "medium" : "low",
      fields,
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
  };
}

function parseGoModManifest(
  filename: string,
  content: string,
  bytesRead: number,
  truncated: boolean,
): AnalyzeWorkspaceServerManifestFieldsResult {
  const fields: AnalyzeWorkspaceServerManifestFields["fields"] = {
    language: "Go",
    packageManagerHints: ["Go modules"],
    dependencies: [],
    notes: [],
  };
  let inRequireBlock = false;

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) continue;
    if (line.startsWith("module ")) {
      fields.moduleName = line.replace(/^module\s+/u, "").trim();
      continue;
    }
    if (line.startsWith("go ")) {
      fields.version = line.replace(/^go\s+/u, "").trim();
      continue;
    }
    if (line === "require (") {
      inRequireBlock = true;
      continue;
    }
    if (inRequireBlock && line === ")") {
      inRequireBlock = false;
      continue;
    }
    if (line.startsWith("require ")) {
      const moduleName = line.replace(/^require\s+/u, "").trim().split(/\s+/u)[0];
      if (moduleName) pushUnique(fields.dependencies!, moduleName);
      continue;
    }
    if (inRequireBlock) {
      const moduleName = line.split(/\s+/u)[0];
      if (moduleName) pushUnique(fields.dependencies!, moduleName);
      continue;
    }
    if (line.startsWith("replace ")) {
      pushUnique(fields.notes!, "replace directives present; paths not shown");
    }
  }

  return {
    ok: true,
    manifest: {
      schemaVersion: 1,
      fieldsType: "analyze_workspace_manifest_fields",
      filename,
      kind: "go_mod",
      bytesRead,
      truncated,
      confidence: fields.moduleName ? "medium" : "low",
      fields,
      omitted: ["replace target paths", "raw manifest content"],
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
  };
}

function parsePackageSwiftManifest(
  filename: string,
  content: string,
  bytesRead: number,
  truncated: boolean,
): AnalyzeWorkspaceServerManifestFieldsResult {
  const nameMatch = content.match(/name\s*:\s*"([^"]+)"/u);
  const targets = Array.from(content.matchAll(/\.(?:target|executableTarget|testTarget)\(\s*name:\s*"([^"]+)"/gu))
    .map((entry) => entry[1]?.trim())
    .filter((entry): entry is string => Boolean(entry));
  const products = extractPackageSwiftArrayStrings(content, "products");
  const platforms = extractPackageSwiftPlatforms(content);
  const dependencyHints = extractPackageSwiftDependencyHints(content);

  return {
    ok: true,
    manifest: {
      schemaVersion: 1,
      fieldsType: "analyze_workspace_manifest_fields",
      filename,
      kind: "package_swift",
      bytesRead,
      truncated,
      confidence: nameMatch || targets.length > 0 || products.length > 0 ? "medium" : "low",
      fields: {
        name: nameMatch?.[1]?.trim(),
        language: "Swift",
        packageManagerHints: ["SwiftPM"],
        dependencies: dependencyHints,
        targets,
        products,
        platforms,
        notes: dependencyHints.length > 0 ? ["Dependency URLs are summarized as host/repo only."] : [],
      },
      omitted: [
        "raw manifest content",
        "executable Swift evaluation",
      ],
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
  };
}

function parseManifestFieldsContent(
  filename: string,
  content: string,
  bytesRead: number,
  truncated: boolean,
): AnalyzeWorkspaceServerManifestFieldsResult {
  const kind = manifestKindForFilename(filename);
  if (!kind) {
    return { ok: false, error: "Manifest filename is not allowed." };
  }

  switch (kind) {
    case "package_json":
      return parsePackageJsonManifest(filename, content, bytesRead, truncated);
    case "pyproject_toml":
      return parsePyprojectManifest(filename, content, bytesRead, truncated);
    case "cargo_toml":
      return parseCargoManifest(filename, content, bytesRead, truncated);
    case "go_mod":
      return parseGoModManifest(filename, content, bytesRead, truncated);
    case "package_swift":
      return parsePackageSwiftManifest(filename, content, bytesRead, truncated);
  }
}

export async function readTopLevelReadmeExcerpt(input: {
  workspacePath: string;
  filename: string;
  maxBytes?: number;
}): Promise<AnalyzeWorkspaceServerReadmeExcerptResult> {
  const workspacePath = input.workspacePath.trim();
  if (!workspacePath) {
    return { ok: false, error: "Workspace path is required." };
  }
  if (!isAllowedReadmeFilename(input.filename)) {
    return { ok: false, error: "README filename is not allowed." };
  }

  const maxBytes = Math.min(Math.max(input.maxBytes ?? MAX_README_BYTES, 1), MAX_README_BYTES);

  try {
    const workspaceStats = await fs.lstat(workspacePath);
    if (!workspaceStats.isDirectory()) {
      return { ok: false, error: "Workspace path must be a directory." };
    }
  } catch {
    return { ok: false, error: "Workspace path is not accessible." };
  }

  const resolvedWorkspacePath = path.resolve(workspacePath);
  const resolvedReadmePath = path.resolve(resolvedWorkspacePath, input.filename);
  const relativePath = path.relative(resolvedWorkspacePath, resolvedReadmePath);
  if (
    relativePath.startsWith("..")
    || path.isAbsolute(relativePath)
    || relativePath.includes(path.sep)
  ) {
    return { ok: false, error: "README path must stay at the top level of the workspace." };
  }

  try {
    const stats = await fs.lstat(resolvedReadmePath);
    if (stats.isSymbolicLink()) {
      return { ok: false, error: "README symlinks are not allowed." };
    }
    if (!stats.isFile()) {
      return { ok: false, error: "README target must be a regular file." };
    }

    const handle = await fs.open(resolvedReadmePath, "r");
    try {
      const buffer = Buffer.alloc(maxBytes);
      const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
      const contentBuffer = buffer.subarray(0, bytesRead);
      if (contentBuffer.includes(0)) {
        return { ok: false, error: "README excerpt appears to be binary and was not read." };
      }

      return {
        ok: true,
        excerpt: {
          schemaVersion: 1,
          excerptType: "analyze_workspace_readme_excerpt",
          filename: input.filename,
          bytesRead,
          truncated: stats.size > bytesRead,
          content: contentBuffer.toString("utf8"),
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
      };
    } finally {
      await handle.close();
    }
  } catch {
    return { ok: false, error: "README excerpt could not be read safely." };
  }
}

export async function readTopLevelManifestFields(input: {
  workspacePath: string;
  filename: string;
  maxBytes?: number;
}): Promise<AnalyzeWorkspaceServerManifestFieldsResult> {
  const workspacePath = input.workspacePath.trim();
  if (!workspacePath) {
    return { ok: false, error: "Workspace path is required." };
  }
  if (!isAllowedManifestFilename(input.filename)) {
    return { ok: false, error: "Manifest filename is not allowed." };
  }

  const maxBytes = Math.min(Math.max(input.maxBytes ?? MAX_MANIFEST_BYTES, 1), MAX_MANIFEST_BYTES);

  try {
    const workspaceStats = await fs.lstat(workspacePath);
    if (!workspaceStats.isDirectory()) {
      return { ok: false, error: "Workspace path must be a directory." };
    }
  } catch {
    return { ok: false, error: "Workspace path is not accessible." };
  }

  const resolvedWorkspacePath = path.resolve(workspacePath);
  const resolvedManifestPath = path.resolve(resolvedWorkspacePath, input.filename);
  const relativePath = path.relative(resolvedWorkspacePath, resolvedManifestPath);
  if (
    relativePath.startsWith("..")
    || path.isAbsolute(relativePath)
    || relativePath.includes(path.sep)
  ) {
    return { ok: false, error: "Manifest path must stay at the top level of the workspace." };
  }

  try {
    const stats = await fs.lstat(resolvedManifestPath);
    if (stats.isSymbolicLink()) {
      return { ok: false, error: "Manifest symlinks are not allowed." };
    }
    if (!stats.isFile()) {
      return { ok: false, error: "Manifest target must be a regular file." };
    }

    const handle = await fs.open(resolvedManifestPath, "r");
    try {
      const buffer = Buffer.alloc(maxBytes);
      const { bytesRead } = await handle.read(buffer, 0, maxBytes, 0);
      const contentBuffer = buffer.subarray(0, bytesRead);
      if (contentBuffer.includes(0)) {
        return { ok: false, error: "Manifest content appears to be binary and was not read." };
      }

      return parseManifestFieldsContent(
        input.filename,
        contentBuffer.toString("utf8"),
        bytesRead,
        stats.size > bytesRead,
      );
    } finally {
      await handle.close();
    }
  } catch {
    return { ok: false, error: "Manifest fields could not be read safely." };
  }
}
