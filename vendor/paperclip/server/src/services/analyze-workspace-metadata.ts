import fs from "node:fs/promises";

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

const DEFAULT_MAX_TOP_LEVEL_ENTRIES = 50;
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

function normalizeWorkspaceEntryName(name: string) {
  return name.trim().toLowerCase();
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
