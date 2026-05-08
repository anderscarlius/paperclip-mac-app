export type SetupHealthStatus =
  | "ready"
  | "needs_attention"
  | "optional"
  | "warning"
  | "unknown"
  | "partial"
  | "degraded";

export type SetupHealthSeverity =
  | "success"
  | "info"
  | "warning"
  | "error";

export type SetupHealthCard = {
  id:
    | "cloud_ai"
    | "local_ai"
    | "workspace"
    | "developer_tools"
    | "runtime";
  title: string;
  status: SetupHealthStatus;
  severity: SetupHealthSeverity;
  summary: string;
  primaryAction?: {
    label: string;
    actionId: string;
  };
  secondaryAction?: {
    label: string;
    actionId: string;
  };
  advancedDetails: Array<{
    label: string;
    value: string;
    helpText?: string;
  }>;
};

export type SetupHealthViewModel = {
  overallStatus:
    | "ready_to_start"
    | "needs_attention"
    | "optional_improvements_available";
  headline: string;
  summary: string;
  primaryAction: {
    label: string;
    actionId: "analyze_workspace";
    disabled?: boolean;
  };
  secondaryAction: {
    label: string;
    actionId: "open_diagnostics";
  };
  cards: SetupHealthCard[];
};

export type WorkspacePathHealth = {
  risk: "none" | "low" | "medium" | "unknown";
  containsSpaces?: boolean;
  containsNonAscii?: boolean;
  containsDecomposedUnicode?: boolean;
  containsPercentEncoding?: boolean;
  reasons: string[];
};

export type SetupHealthWorkspaceDiagnostics = {
  selected: boolean;
  path?: string | null;
  displayName?: string | null;
  pathHealth?: WorkspacePathHealth | null;
};

export type AnalyzeWorkspacePathHealth = WorkspacePathHealth;

export type AnalyzeWorkspaceRequest = {
  schemaVersion: 1;
  requestType: "analyze_workspace";
  workspace: {
    selected: true;
    path: string;
    displayName?: string | null;
    pathHealth?: AnalyzeWorkspacePathHealth | null;
  };
  safety: {
    readOnly: true;
    allowFileWrites: false;
    allowCommandExecution: false;
    allowNetworkAccess: false;
    requireUserApprovalForCommands: true;
  };
  runtimePreference: {
    preferredMode: "cloud" | "local" | "auto";
    allowLocalFallback: false;
    allowAutomaticRouting: false;
  };
  userIntent: {
    goal: "understand_workspace";
    firstRun: boolean;
  };
};

export type AnalyzeWorkspaceValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export type AnalyzeWorkspaceSetupState = {
  request: AnalyzeWorkspaceRequest | null;
  validation: AnalyzeWorkspaceValidationResult;
  canContinue: boolean;
  title: string;
  summary: string;
  safetyBullets: string[];
  warnings: string[];
};

export type AnalyzeWorkspaceHandoffResult = {
  schemaVersion: 1;
  resultType: "analyze_workspace_handoff";
  accepted: boolean;
  executionStarted: false;
  requestType: "analyze_workspace";
  workspace: {
    displayName?: string | null;
    pathHealth?: {
      risk: "none" | "low" | "medium" | "unknown";
      reasons: string[];
    } | null;
  };
  validation: {
    ok: boolean;
    errors: string[];
  };
  safety: {
    readOnly: true;
    filesChanged: false;
    commandsRun: false;
    networkAccessed: false;
    agentStarted: false;
    localFallbackUsed: false;
    automaticRoutingUsed: false;
  };
  next: {
    status: "not_wired_yet";
    recommendedNextPhase: "5I";
    message: string;
  };
};

export type AnalyzeWorkspaceTopLevelEntry = {
  name: string;
  kind: "file" | "directory" | "unknown";
  redacted?: boolean;
  reason?: string;
};

export type AnalyzeWorkspaceManifestIndicator = {
  name: string;
  present: boolean;
  category:
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
};

export type AnalyzeWorkspaceMetadataSnapshot = {
  schemaVersion: 1;
  snapshotType: "analyze_workspace_metadata_snapshot";
  collectionMode: "provided_fixture_only" | "future_filesystem_read";
  workspace: {
    displayName?: string | null;
    pathHealth?: {
      risk: "none" | "low" | "medium" | "unknown";
      reasons: string[];
    } | null;
  };
  topLevelEntries: AnalyzeWorkspaceTopLevelEntry[];
  manifestIndicators: AnalyzeWorkspaceManifestIndicator[];
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

export type AnalyzeWorkspaceMetadataSnapshotValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export type AnalyzeWorkspaceCollectionInput = {
  workspace: {
    displayName?: string | null;
    path: string;
    pathHealth?: {
      risk: "none" | "low" | "medium" | "unknown";
      reasons: string[];
    } | null;
  };
  topLevelEntries: Array<{
    name: string;
    kind: "file" | "directory" | "unknown";
  }>;
  maxTopLevelEntries?: number;
};

export type AnalyzeWorkspaceCollectionResult =
  | {
    ok: true;
    snapshot: AnalyzeWorkspaceMetadataSnapshot;
    warnings: string[];
  }
  | {
    ok: false;
    snapshot: null;
    errors: string[];
    warnings: string[];
  };

export type SetupHealthDiagnostics = {
  cloudAi?: {
    authStatus?: "connected" | "missing" | "unknown";
    provider?: string | null;
    modelHosting?: "local" | "cloud" | "unknown" | null;
    billingType?: string | null;
    model?: string | null;
    modelInfo?: {
      requestedModel?: string | null;
      resolvedModel?: string | null;
      reportedModel?: string | null;
      modelSource?: string | null;
      confidence?: string | null;
      unknownReason?: string | null;
    } | null;
  };
  localAi?: {
    status?: "available_candidate" | "available" | "optional" | "unavailable" | "unknown";
    runtime?: "ollama" | string | null;
    model?: string | null;
    confidence?: "medium" | "low" | "unknown" | null;
    routingEnabled?: boolean;
  };
  workspace?: SetupHealthWorkspaceDiagnostics;
  developerTools?: {
    gitAvailable?: boolean | null;
    nodeAvailable?: boolean | null;
    pnpmAvailable?: boolean | null;
    swiftAvailable?: boolean | null;
    pathIssueDetected?: boolean | null;
  };
  runtime?: {
    lastRunStatus?: "success" | "failed" | "unknown" | null;
    warnings?: Array<{ code?: string; message?: string; severity?: string }>;
    diagnosticsAvailable?: boolean;
  };
};

type SetupHealthDetail = SetupHealthCard["advancedDetails"][number];
const PERCENT_ENCODING_RE = /%[0-9A-Fa-f]{2}/;
const PRINTABLE_ASCII_RE = /^[\x20-\x7E]+$/;
const NON_ASCII_RE = /[^\x00-\x7F]/u;
const SPACES_RE = /\s/u;
const COMBINING_MARK_RE = /\p{M}/u;
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
const MANIFEST_INDICATOR_CATEGORIES = new Map<string, AnalyzeWorkspaceManifestIndicator["category"]>([
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

function compactDetails(
  details: Array<SetupHealthDetail | null>,
): SetupHealthDetail[] {
  return details.filter((detail): detail is SetupHealthDetail => detail !== null);
}

function normalizeWorkspaceEntryName(name: string): string {
  return name.trim().toLowerCase();
}

function detail(label: string, value: string | null | undefined, helpText?: string): SetupHealthDetail | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return helpText ? { label, value: trimmed, helpText } : { label, value: trimmed };
}

function formatModelHosting(value: string | null | undefined): string | null {
  switch (value) {
    case "cloud":
      return "Cloud";
    case "local":
      return "Local";
    case "unknown":
      return "Unknown";
    default:
      return value ?? null;
  }
}

function formatModelSource(value: string | null | undefined): string | null {
  switch (value) {
    case "adapter_request":
      return "adapter request";
    case "codex_home_config":
      return "Codex home config";
    case "codex_cli_output":
      return "Codex CLI output";
    case "provider_response":
      return "provider response";
    case "not_available":
      return "not available";
    default:
      return value ?? null;
  }
}

function formatBooleanDetail(value: boolean | null | undefined, yes = "Yes", no = "No"): string {
  if (value === true) return yes;
  if (value === false) return no;
  return "Unknown";
}

function formatToolAvailability(value: boolean | null | undefined): string {
  if (value === true) return "Available";
  if (value === false) return "Missing";
  return "Unknown";
}

function formatPathRisk(value: WorkspacePathHealth["risk"]): string {
  switch (value) {
    case "none":
      return "OK";
    case "low":
      return "Low";
    case "medium":
      return "Warning";
    default:
      return "Unknown";
  }
}

function formatWarningList(
  warnings: Array<{ code?: string; message?: string; severity?: string }> | undefined,
): string | null {
  if (!warnings || warnings.length === 0) return null;
  const visibleWarnings = warnings
    .map((warning) => {
      const code = warning.code?.trim();
      const message = warning.message?.trim();
      if (code && message) return `${code}: ${message}`;
      if (message) return message;
      if (code) return code;
      return null;
    })
    .filter((warning): warning is string => warning !== null);
  return visibleWarnings.length > 0 ? visibleWarnings.join(" | ") : null;
}

function formatWorkspaceReason(reason: string): string {
  switch (reason) {
    case "contains_spaces":
      return "Contains spaces";
    case "contains_non_ascii":
      return "Contains non-ASCII characters";
    case "contains_decomposed_unicode":
      return "Contains decomposed Unicode";
    case "contains_percent_encoding":
      return "Contains percent encoding";
    default:
      return reason.replace(/_/g, " ");
  }
}

export function classifyWorkspacePathForSetupHealth(path?: string | null): WorkspacePathHealth {
  if (typeof path !== "string" || path.trim().length === 0) {
    return {
      risk: "unknown",
      reasons: [],
    };
  }

  const normalizedPath = path;
  const containsPercentEncoding = PERCENT_ENCODING_RE.test(normalizedPath);
  const containsSpaces = SPACES_RE.test(normalizedPath);
  const containsNonAscii = NON_ASCII_RE.test(normalizedPath);
  const containsCombiningMarks = COMBINING_MARK_RE.test(normalizedPath);
  const differsUnderNormalization =
    normalizedPath.normalize("NFC") !== normalizedPath || normalizedPath.normalize("NFD") !== normalizedPath;
  const containsDecomposedUnicode = containsCombiningMarks || differsUnderNormalization;
  const asciiSafe =
    PRINTABLE_ASCII_RE.test(normalizedPath)
    && !containsSpaces
    && !containsPercentEncoding;
  const risk: WorkspacePathHealth["risk"] =
    containsNonAscii || containsDecomposedUnicode || containsPercentEncoding
      ? "medium"
      : containsSpaces
        ? "low"
        : asciiSafe
          ? "none"
          : "unknown";
  const reasons: string[] = [];
  if (containsSpaces) reasons.push("contains_spaces");
  if (containsNonAscii) reasons.push("contains_non_ascii");
  if (containsDecomposedUnicode) reasons.push("contains_decomposed_unicode");
  if (containsPercentEncoding) reasons.push("contains_percent_encoding");

  return {
    risk,
    containsSpaces,
    containsNonAscii,
    containsDecomposedUnicode,
    containsPercentEncoding,
    reasons,
  };
}

function resolveWorkspacePathHealth(
  workspace: SetupHealthDiagnostics["workspace"],
): WorkspacePathHealth {
  if (!workspace?.selected) {
    return {
      risk: "unknown",
      reasons: [],
    };
  }

  return workspace.pathHealth ?? classifyWorkspacePathForSetupHealth(workspace.path);
}

export function buildAnalyzeWorkspaceRequest(
  diagnostics: SetupHealthDiagnostics,
): AnalyzeWorkspaceRequest | null {
  const workspace = diagnostics.workspace;
  if (!workspace?.selected) return null;

  const path = workspace.path?.trim();
  if (!path) return null;

  return {
    schemaVersion: 1,
    requestType: "analyze_workspace",
    workspace: {
      selected: true,
      path,
      displayName: workspace.displayName ?? null,
      pathHealth: workspace.pathHealth ?? classifyWorkspacePathForSetupHealth(path),
    },
    safety: {
      readOnly: true,
      allowFileWrites: false,
      allowCommandExecution: false,
      allowNetworkAccess: false,
      requireUserApprovalForCommands: true,
    },
    runtimePreference: {
      preferredMode: "cloud",
      allowLocalFallback: false,
      allowAutomaticRouting: false,
    },
    userIntent: {
      goal: "understand_workspace",
      firstRun: true,
    },
  };
}

export function validateAnalyzeWorkspaceRequest(
  request: AnalyzeWorkspaceRequest | null,
): AnalyzeWorkspaceValidationResult {
  const errors: string[] = [];

  if (!request) {
    return { ok: false, errors: ["No analyze-workspace request could be created."] };
  }

  if (request.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (request.requestType !== "analyze_workspace") errors.push('requestType must be "analyze_workspace".');
  if (request.workspace.selected !== true) errors.push("workspace.selected must be true.");
  if (request.workspace.path.trim().length === 0) errors.push("workspace.path must be a non-empty string.");
  if (request.safety.readOnly !== true) errors.push("safety.readOnly must be true.");
  if (request.safety.allowFileWrites !== false) errors.push("safety.allowFileWrites must be false.");
  if (request.safety.allowCommandExecution !== false) errors.push("safety.allowCommandExecution must be false.");
  if (request.safety.allowNetworkAccess !== false) errors.push("safety.allowNetworkAccess must be false.");
  if (request.safety.requireUserApprovalForCommands !== true) {
    errors.push("safety.requireUserApprovalForCommands must be true.");
  }
  if (request.runtimePreference.allowLocalFallback !== false) {
    errors.push("runtimePreference.allowLocalFallback must be false.");
  }
  if (request.runtimePreference.allowAutomaticRouting !== false) {
    errors.push("runtimePreference.allowAutomaticRouting must be false.");
  }
  if (request.userIntent.goal !== "understand_workspace") {
    errors.push('userIntent.goal must be "understand_workspace".');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function prepareAnalyzeWorkspaceHandoff(
  request: AnalyzeWorkspaceRequest | null,
): AnalyzeWorkspaceHandoffResult {
  const validation = validateAnalyzeWorkspaceRequest(request);
  const accepted = validation.ok;
  const pathHealth = request?.workspace.pathHealth ?? null;

  return {
    schemaVersion: 1,
    resultType: "analyze_workspace_handoff",
    accepted,
    executionStarted: false,
    requestType: "analyze_workspace",
    workspace: {
      displayName: request?.workspace.displayName ?? null,
      pathHealth: pathHealth
        ? {
          risk: pathHealth.risk,
          reasons: [...pathHealth.reasons],
        }
        : null,
    },
    validation: validation.ok
      ? {
        ok: true,
        errors: [],
      }
      : {
        ok: false,
        errors: [...validation.errors],
      },
    safety: {
      readOnly: true,
      filesChanged: false,
      commandsRun: false,
      networkAccessed: false,
      agentStarted: false,
      localFallbackUsed: false,
      automaticRoutingUsed: false,
    },
    next: {
      status: "not_wired_yet",
      recommendedNextPhase: "5I",
      message: accepted
        ? "Analyze Workspace request accepted for setup validation. Execution is not wired yet."
        : "Analyze Workspace request was not accepted. Fix validation errors before execution is wired.",
    },
  };
}

export function isSensitiveWorkspaceEntryName(name: string): boolean {
  const normalized = normalizeWorkspaceEntryName(name);
  if (SENSITIVE_ENTRY_NAMES.has(normalized)) return true;
  if (normalized.startsWith(".env.")) return true;
  if (normalized.includes("credential")) return true;
  if (normalized.includes("token")) return true;
  if (normalized === "secret" || normalized === "secrets") return true;
  return false;
}

export function classifyManifestIndicator(
  name: string,
): AnalyzeWorkspaceManifestIndicator | null {
  const normalized = normalizeWorkspaceEntryName(name);
  const category = MANIFEST_INDICATOR_CATEGORIES.get(normalized);
  if (!category) return null;

  return {
    name,
    present: true,
    category,
  };
}

export function buildAnalyzeWorkspaceMetadataSnapshotFromEntries(input: {
  workspace?: {
    displayName?: string | null;
    pathHealth?: {
      risk: "none" | "low" | "medium" | "unknown";
      reasons: string[];
    } | null;
  };
  entries: Array<{
    name: string;
    kind?: "file" | "directory" | "unknown";
  }>;
  maxTopLevelEntries?: number;
}): AnalyzeWorkspaceMetadataSnapshot {
  const maxTopLevelEntries = input.maxTopLevelEntries ?? 50;
  const trimmedEntries = input.entries.slice(0, maxTopLevelEntries);
  const redactions: AnalyzeWorkspaceMetadataSnapshot["redactions"] = [];
  const manifestIndicators: AnalyzeWorkspaceManifestIndicator[] = [];
  const topLevelEntries: AnalyzeWorkspaceTopLevelEntry[] = [];
  const seenIndicators = new Set<string>();

  for (const entry of trimmedEntries) {
    const kind = entry.kind ?? "unknown";
    if (isSensitiveWorkspaceEntryName(entry.name)) {
      const reason = "Sensitive-looking top-level entry name was redacted.";
      topLevelEntries.push({
        name: REDACTED_ENTRY_NAME,
        kind,
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
      kind,
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

  if (input.entries.length > maxTopLevelEntries) {
    notCollected.push(`Top-level entry list was truncated at ${maxTopLevelEntries} entries.`);
  }

  return {
    schemaVersion: 1,
    snapshotType: "analyze_workspace_metadata_snapshot",
    collectionMode: "provided_fixture_only",
    workspace: {
      displayName: input.workspace?.displayName ?? null,
      pathHealth: input.workspace?.pathHealth ?? null,
    },
    topLevelEntries,
    manifestIndicators,
    limits: {
      maxTopLevelEntries,
      recursiveScan: false,
      fileContentsRead: false,
      commandsRun: false,
      networkAccessed: false,
    },
    redactions,
    notCollected,
    safety: {
      readOnly: true,
      filesChanged: false,
      commandsRun: false,
      networkAccessed: false,
      agentStarted: false,
      localFallbackUsed: false,
      automaticRoutingUsed: false,
    },
  };
}

export function validateAnalyzeWorkspaceMetadataSnapshot(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
): AnalyzeWorkspaceMetadataSnapshotValidationResult {
  const errors: string[] = [];

  if (snapshot.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (snapshot.snapshotType !== "analyze_workspace_metadata_snapshot") {
    errors.push('snapshotType must be "analyze_workspace_metadata_snapshot".');
  }
  if (snapshot.collectionMode !== "provided_fixture_only" && snapshot.collectionMode !== "future_filesystem_read") {
    errors.push('collectionMode must be "provided_fixture_only" or "future_filesystem_read".');
  }
  if (snapshot.limits.maxTopLevelEntries < 1) {
    errors.push("limits.maxTopLevelEntries must be at least 1.");
  }
  if (snapshot.limits.recursiveScan !== false) errors.push("limits.recursiveScan must be false.");
  if (snapshot.limits.fileContentsRead !== false) errors.push("limits.fileContentsRead must be false.");
  if (snapshot.limits.commandsRun !== false) errors.push("limits.commandsRun must be false.");
  if (snapshot.limits.networkAccessed !== false) errors.push("limits.networkAccessed must be false.");
  if (snapshot.safety.filesChanged !== false) errors.push("safety.filesChanged must be false.");
  if (snapshot.safety.commandsRun !== false) errors.push("safety.commandsRun must be false.");
  if (snapshot.safety.networkAccessed !== false) errors.push("safety.networkAccessed must be false.");
  if (snapshot.safety.agentStarted !== false) errors.push("safety.agentStarted must be false.");
  if (snapshot.safety.localFallbackUsed !== false) errors.push("safety.localFallbackUsed must be false.");
  if (snapshot.safety.automaticRoutingUsed !== false) {
    errors.push("safety.automaticRoutingUsed must be false.");
  }

  for (const entry of snapshot.topLevelEntries) {
    if (entry.redacted === true) {
      if (entry.name !== REDACTED_ENTRY_NAME) {
        errors.push('Redacted top-level entries must use the "[redacted]" placeholder.');
      }
      continue;
    }
    if (isSensitiveWorkspaceEntryName(entry.name)) {
      errors.push(`Sensitive top-level entry name must be redacted: ${entry.name}`);
    }
  }

  for (const redaction of snapshot.redactions) {
    if (redaction.name !== REDACTED_ENTRY_NAME) {
      errors.push('Redaction records must not expose raw sensitive names.');
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries(
  input: AnalyzeWorkspaceCollectionInput,
): AnalyzeWorkspaceCollectionResult {
  const snapshot = buildAnalyzeWorkspaceMetadataSnapshotFromEntries({
    workspace: {
      displayName: input.workspace.displayName ?? null,
      pathHealth: input.workspace.pathHealth ?? null,
    },
    entries: input.topLevelEntries,
    maxTopLevelEntries: input.maxTopLevelEntries,
  });
  const validation = validateAnalyzeWorkspaceMetadataSnapshot(snapshot);
  const warnings: string[] = [
    "Collection is filename-only.",
    "No file contents were read.",
  ];

  if (snapshot.topLevelEntries.length < input.topLevelEntries.length) {
    warnings.push(`Top-level entries were truncated at ${snapshot.limits.maxTopLevelEntries}.`);
  }
  if (snapshot.redactions.length > 0) {
    warnings.push("Sensitive-looking top-level names were redacted.");
  }
  if (snapshot.workspace.pathHealth?.risk === "medium") {
    warnings.push("Workspace path health has a warning. Metadata collection remained read-only.");
  }

  if (!validation.ok) {
    return {
      ok: false,
      snapshot: null,
      errors: validation.errors,
      warnings,
    };
  }

  return {
    ok: true,
    snapshot,
    warnings,
  };
}

export function buildAnalyzeWorkspaceSetupState(
  diagnostics: SetupHealthDiagnostics,
): AnalyzeWorkspaceSetupState {
  const request = buildAnalyzeWorkspaceRequest(diagnostics);
  const validation = validateAnalyzeWorkspaceRequest(request);
  const workspace = diagnostics.workspace;
  const pathHealth = request?.workspace.pathHealth
    ?? (workspace?.selected ? resolveWorkspacePathHealth(workspace) : null);
  const warnings: string[] = [];

  if (!workspace?.selected || !request) {
    return {
      request,
      validation,
      canContinue: false,
      title: "Choose a workspace first",
      summary: "Select a local folder before starting the first analysis.",
      safetyBullets: [
        "Read-only first run",
        "No file changes",
        "No commands without approval",
        "No local fallback for this first analysis",
      ],
      warnings,
    };
  }

  if (pathHealth?.risk === "medium") {
    warnings.push("This workspace path has a warning. Analysis can continue, but some cloud runs may be slower.");
  }
  if (diagnostics.cloudAi?.authStatus === "missing") {
    warnings.push("Cloud AI is not connected. Connect Cloud AI before running the first analysis, or continue later when a local analysis mode is available.");
  }
  if (diagnostics.developerTools?.pathIssueDetected !== true) {
    const developerToolsCardLikePartial =
      diagnostics.developerTools
      && [diagnostics.developerTools.gitAvailable, diagnostics.developerTools.nodeAvailable, diagnostics.developerTools.pnpmAvailable, diagnostics.developerTools.swiftAvailable]
        .some((value) => value === false);
    if (developerToolsCardLikePartial) {
      warnings.push("Some developer tools are missing, but the first read-only analysis can still start.");
    }
  }
  if (diagnostics.localAi?.status === "available" || diagnostics.localAi?.status === "available_candidate") {
    warnings.push("Local AI is not used for the first analysis yet.");
  }

  return {
    request,
    validation,
    canContinue: validation.ok,
    title: "Ready to run read-only analysis",
    summary: "Paperclip can prepare a first read-only analysis request for this workspace.",
    safetyBullets: [
      "Read-only first run",
      "No file changes",
      "No commands without approval",
      "No local fallback for this first analysis",
    ],
    warnings,
  };
}

function buildCloudAiCard(cloudAi: SetupHealthDiagnostics["cloudAi"]): SetupHealthCard {
  const authStatus = cloudAi?.authStatus ?? "unknown";
  const ready = authStatus === "connected";
  const needsAttention = authStatus === "missing";

  return {
    id: "cloud_ai",
    title: "Cloud AI",
    status: ready ? "ready" : needsAttention ? "needs_attention" : "unknown",
    severity: ready ? "success" : needsAttention ? "error" : "info",
    summary: ready
      ? "Cloud AI is connected and ready."
      : needsAttention
        ? "Cloud AI is not connected. Sign in or reconnect to run cloud Codex tasks."
        : "Cloud AI status is not known yet.",
    primaryAction: ready
      ? { label: "Manage connection", actionId: "manage_cloud_ai" }
      : needsAttention
        ? { label: "Connect Cloud AI", actionId: "connect_cloud_ai" }
        : { label: "Check again", actionId: "check_cloud_ai_again" },
    secondaryAction: ready
      ? { label: "Check again", actionId: "check_cloud_ai_again" }
      : { label: "Open diagnostics", actionId: "open_diagnostics" },
    advancedDetails: compactDetails([
      detail("Provider", cloudAi?.provider ?? "Unknown"),
      detail("Model hosting", formatModelHosting(cloudAi?.modelHosting) ?? "Unknown"),
      detail("Billing type", cloudAi?.billingType ?? "Unknown"),
      detail("Requested/default model", cloudAi?.modelInfo?.requestedModel ?? cloudAi?.model ?? "Unknown"),
      detail("Resolved model", cloudAi?.modelInfo?.resolvedModel ?? "Unknown"),
      detail("Reported model", cloudAi?.modelInfo?.reportedModel ?? "Unknown"),
      detail("Model source", formatModelSource(cloudAi?.modelInfo?.modelSource) ?? "Unknown"),
      detail("Model confidence", cloudAi?.modelInfo?.confidence ?? "Unknown"),
      detail("Unknown reason", cloudAi?.modelInfo?.unknownReason ?? "None"),
    ]),
  };
}

function buildLocalAiCard(localAi: SetupHealthDiagnostics["localAi"]): SetupHealthCard {
  const available = localAi?.status === "available" || localAi?.status === "available_candidate";
  const unavailable = localAi?.status === "unavailable";

  return {
    id: "local_ai",
    title: "Local AI",
    status: "optional",
    severity: "info",
    summary: available
      ? "Local AI is available for small private drafts."
      : "Local AI is optional. You can set it up later.",
    primaryAction: available
      ? { label: "View local model", actionId: "view_local_model" }
      : { label: "Learn about local AI", actionId: "learn_local_ai" },
    secondaryAction: unavailable
      ? { label: "Open Ollama", actionId: "open_ollama" }
      : { label: "Set up later", actionId: "set_up_local_ai_later" },
    advancedDetails: compactDetails([
      detail("Runtime", localAi?.runtime ?? "Unknown"),
      detail("Selected local model", localAi?.model ?? "Unknown"),
      detail("Confidence", localAi?.confidence ?? "Unknown"),
      detail("Routing enabled", formatBooleanDetail(localAi?.routingEnabled, "Yes", "No")),
      detail("Role", "Optional for small private drafts"),
    ]),
  };
}

function buildWorkspaceCard(workspace: SetupHealthDiagnostics["workspace"]): SetupHealthCard {
  const selected = workspace?.selected === true;
  const pathHealth = resolveWorkspacePathHealth(workspace);
  const risk = pathHealth.risk;
  const workspaceLabel = workspace?.displayName ?? null;
  const pathWarningHelpText = risk === "medium"
    ? "This path may trigger slower cloud Codex websocket behavior, but Paperclip can continue via fallback."
    : undefined;

  if (!selected) {
    return {
      id: "workspace",
      title: "Workspace",
      status: "needs_attention",
      severity: "error",
      summary: "Choose a workspace before starting.",
      primaryAction: {
        label: "Choose workspace",
        actionId: "choose_workspace",
      },
      secondaryAction: {
        label: "Open diagnostics",
        actionId: "open_diagnostics",
      },
      advancedDetails: compactDetails([
        detail("Workspace", workspaceLabel ?? "None"),
        detail("Selected path", workspace?.path ?? "None"),
        detail("Path health", "Not available until a workspace is chosen"),
      ]),
    };
  }

  if (risk === "medium") {
    return {
      id: "workspace",
      title: "Workspace",
      status: "warning",
      severity: "warning",
      summary: "This workspace path may slow some cloud runs, but tasks should still work.",
      primaryAction: {
        label: "View path details",
        actionId: "view_path_details",
      },
      secondaryAction: {
        label: "Analyze this workspace",
        actionId: "analyze_workspace",
      },
      advancedDetails: compactDetails([
        detail("Workspace", workspaceLabel ?? "Selected workspace"),
        detail("Selected path", workspace.path ?? "Unknown"),
        detail("Path health", formatPathRisk(risk)),
        detail("Contains spaces", formatBooleanDetail(pathHealth.containsSpaces)),
        detail("Contains non-ASCII characters", formatBooleanDetail(pathHealth.containsNonAscii)),
        detail("Contains decomposed Unicode", formatBooleanDetail(pathHealth.containsDecomposedUnicode)),
        detail("Contains percent encoding", formatBooleanDetail(pathHealth.containsPercentEncoding)),
        detail("Reasons", pathHealth.reasons.map(formatWorkspaceReason).join(", ") || "None", pathWarningHelpText),
      ]),
    };
  }

  if (risk === "none" || risk === "low") {
    return {
      id: "workspace",
      title: "Workspace",
      status: "ready",
      severity: "success",
      summary: "Workspace looks ready.",
      primaryAction: {
        label: "Analyze this workspace",
        actionId: "analyze_workspace",
      },
      secondaryAction: {
        label: "Choose another workspace",
        actionId: "choose_another_workspace",
      },
      advancedDetails: compactDetails([
        detail("Workspace", workspaceLabel ?? "Selected workspace"),
        detail("Selected path", workspace.path ?? "Unknown"),
        detail("Path health", formatPathRisk(risk)),
        detail("Contains spaces", formatBooleanDetail(pathHealth.containsSpaces)),
        detail("Contains non-ASCII characters", formatBooleanDetail(pathHealth.containsNonAscii)),
        detail("Contains decomposed Unicode", formatBooleanDetail(pathHealth.containsDecomposedUnicode)),
        detail("Contains percent encoding", formatBooleanDetail(pathHealth.containsPercentEncoding)),
      ]),
    };
  }

  return {
    id: "workspace",
    title: "Workspace",
    status: "unknown",
    severity: "info",
    summary: "Workspace is selected, but path health is not known yet.",
    primaryAction: {
      label: "View path details",
      actionId: "view_path_details",
    },
    secondaryAction: {
      label: "Analyze this workspace",
      actionId: "analyze_workspace",
    },
    advancedDetails: compactDetails([
      detail("Workspace", workspaceLabel ?? "Selected workspace"),
      detail("Selected path", workspace.path ?? "Unknown"),
      detail("Path health", formatPathRisk(risk)),
      detail("Reasons", pathHealth.reasons.map(formatWorkspaceReason).join(", ") || "None"),
    ]),
  };
}

function buildDeveloperToolsCard(
  developerTools: SetupHealthDiagnostics["developerTools"],
): SetupHealthCard {
  const toolValues = [
    developerTools?.gitAvailable,
    developerTools?.nodeAvailable,
    developerTools?.pnpmAvailable,
    developerTools?.swiftAvailable,
  ];
  const knownValues = toolValues.filter((value): value is boolean => typeof value === "boolean");
  const hasAnyKnownToolSignal = knownValues.length > 0;
  const hasMissingTool = knownValues.some((value) => value === false);
  const allKnownToolsAvailable = hasAnyKnownToolSignal && knownValues.every((value) => value === true);

  let status: SetupHealthStatus = "unknown";
  let severity: SetupHealthSeverity = "info";
  let summary = "Developer tool status is not known yet.";
  let primaryAction = { label: "View tools", actionId: "view_tools" };
  let secondaryAction = { label: "Open diagnostics", actionId: "open_diagnostics" };

  if (developerTools?.pathIssueDetected === true) {
    status = "needs_attention";
    severity = "error";
    summary = "Paperclip cannot find required tools in the app environment.";
    primaryAction = { label: "Fix tool path", actionId: "fix_tool_path" };
    secondaryAction = { label: "Open diagnostics", actionId: "open_diagnostics" };
  } else if (allKnownToolsAvailable) {
    status = "ready";
    severity = "success";
    summary = "Required developer tools are available.";
    primaryAction = { label: "View tools", actionId: "view_tools" };
    secondaryAction = { label: "Check again", actionId: "check_tools_again" };
  } else if (hasMissingTool) {
    status = "partial";
    severity = "warning";
    summary = "Some developer tools are missing, but read-only analysis can still work.";
    primaryAction = { label: "View missing tools", actionId: "view_missing_tools" };
    secondaryAction = { label: "Check again", actionId: "check_tools_again" };
  }

  return {
    id: "developer_tools",
    title: "Developer Tools",
    status,
    severity,
    summary,
    primaryAction,
    secondaryAction,
    advancedDetails: compactDetails([
      detail("git", formatToolAvailability(developerTools?.gitAvailable)),
      detail("node", formatToolAvailability(developerTools?.nodeAvailable)),
      detail("pnpm", formatToolAvailability(developerTools?.pnpmAvailable)),
      detail("swift", formatToolAvailability(developerTools?.swiftAvailable)),
      detail(
        "PATH issue detected",
        formatBooleanDetail(developerTools?.pathIssueDetected, "Yes", "No"),
      ),
    ]),
  };
}

function buildRuntimeCard(runtime: SetupHealthDiagnostics["runtime"]): SetupHealthCard {
  const warnings = runtime?.warnings ?? [];
  const hasWarnings = warnings.length > 0;
  const failed = runtime?.lastRunStatus === "failed";
  const ready = runtime?.lastRunStatus === "success" && !hasWarnings;

  return {
    id: "runtime",
    title: "Runtime",
    status: failed ? "needs_attention" : hasWarnings ? "degraded" : ready ? "ready" : "unknown",
    severity: failed ? "error" : hasWarnings ? "warning" : ready ? "success" : "info",
    summary: failed
      ? "Runtime is not ready yet."
      : hasWarnings
        ? "Paperclip can run, but some diagnostics need attention."
        : ready
          ? "Runtime diagnostics look healthy."
          : "Runtime status is not known yet.",
    primaryAction: failed
      ? { label: "Troubleshoot runtime", actionId: "troubleshoot_runtime" }
      : hasWarnings
        ? { label: "View diagnostics", actionId: "view_diagnostics" }
        : { label: "Open diagnostics", actionId: "open_diagnostics" },
    secondaryAction: {
      label: "Check again",
      actionId: "check_runtime_again",
    },
    advancedDetails: compactDetails([
      detail("Last run status", runtime?.lastRunStatus ?? "Unknown"),
      detail(
        "Diagnostics available",
        formatBooleanDetail(runtime?.diagnosticsAvailable, "Yes", "No"),
      ),
      detail("Warnings", formatWarningList(runtime?.warnings) ?? "None"),
    ]),
  };
}

function deriveOverallStatus(
  cards: SetupHealthCard[],
): SetupHealthViewModel["overallStatus"] {
  if (cards.some((card) => card.status === "needs_attention")) {
    return "needs_attention";
  }

  const hasNonBlockingIssue = cards.some((card) => {
    if (card.id === "local_ai") return false;
    return card.status === "warning"
      || card.status === "partial"
      || card.status === "degraded"
      || card.status === "unknown";
  });

  return hasNonBlockingIssue ? "optional_improvements_available" : "ready_to_start";
}

function buildOverallCopy(
  overallStatus: SetupHealthViewModel["overallStatus"],
): Pick<SetupHealthViewModel, "headline" | "summary"> {
  switch (overallStatus) {
    case "ready_to_start":
      return {
        headline: "Ready to start",
        summary: "Paperclip is ready to analyze this workspace.",
      };
    case "needs_attention":
      return {
        headline: "Needs attention",
        summary: "Fix the items below before starting your first analysis.",
      };
    case "optional_improvements_available":
      return {
        headline: "Optional improvements available",
        summary: "You can start now, or improve setup for a smoother experience.",
      };
  }
}

function shouldDisableAnalyze(cards: SetupHealthCard[]): boolean {
  return cards.some((card) => {
    if (card.id === "local_ai" || card.id === "developer_tools") return false;
    return card.status === "needs_attention";
  });
}

export function buildSetupHealthViewModel(
  diagnostics?: SetupHealthDiagnostics,
): SetupHealthViewModel {
  const cards: SetupHealthCard[] = [
    buildCloudAiCard(diagnostics?.cloudAi),
    buildLocalAiCard(diagnostics?.localAi),
    buildWorkspaceCard(diagnostics?.workspace),
    buildDeveloperToolsCard(diagnostics?.developerTools),
    buildRuntimeCard(diagnostics?.runtime),
  ];

  const overallStatus = deriveOverallStatus(cards);
  const overallCopy = buildOverallCopy(overallStatus);

  return {
    overallStatus,
    headline: overallCopy.headline,
    summary: overallCopy.summary,
    primaryAction: {
      label: "Analyze this workspace",
      actionId: "analyze_workspace",
      disabled: shouldDisableAnalyze(cards),
    },
    secondaryAction: {
      label: "Open diagnostics",
      actionId: "open_diagnostics",
    },
    cards,
  };
}

export function setupHealthStatusLabel(status: SetupHealthStatus): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "needs_attention":
      return "Needs attention";
    case "optional":
      return "Optional";
    case "warning":
      return "Warning";
    case "unknown":
      return "Unknown";
    case "partial":
      return "Partial";
    case "degraded":
      return "Degraded";
  }
}

export function setupHealthOverallStatusLabel(status: SetupHealthViewModel["overallStatus"]): string {
  switch (status) {
    case "ready_to_start":
      return "Ready to start";
    case "needs_attention":
      return "Needs attention";
    case "optional_improvements_available":
      return "Optional improvements available";
  }
}

export const mockSetupHealthReadyDiagnostics: SetupHealthDiagnostics = {
  cloudAi: {
    authStatus: "connected",
    provider: "OpenAI",
    modelHosting: "cloud",
    model: "gpt-5.5",
    modelInfo: {
      requestedModel: "gpt-5.5",
      resolvedModel: "gpt-5.5",
      reportedModel: "gpt-5.5",
      modelSource: "provider_response",
      confidence: "high",
    },
  },
  localAi: {
    status: "optional",
    runtime: "ollama",
    model: "gemma4:e4b",
    confidence: "medium",
    routingEnabled: false,
  },
  workspace: {
    selected: true,
    displayName: "paperclip-app",
    path: "/Users/example/Projects/paperclip-app",
    pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Projects/paperclip-app"),
  },
  developerTools: {
    gitAvailable: true,
    nodeAvailable: true,
    pnpmAvailable: true,
    swiftAvailable: true,
    pathIssueDetected: false,
  },
  runtime: {
    lastRunStatus: "success",
    warnings: [],
    diagnosticsAvailable: true,
  },
};

export const mockSetupHealthReady: SetupHealthViewModel = buildSetupHealthViewModel(mockSetupHealthReadyDiagnostics);

export const mockSetupHealthNeedsAttentionDiagnostics: SetupHealthDiagnostics = {
  cloudAi: {
    authStatus: "missing",
    modelHosting: "unknown",
  },
  localAi: {
    status: "optional",
  },
  workspace: {
    selected: false,
    displayName: null,
  },
  developerTools: {
    gitAvailable: true,
    nodeAvailable: true,
    pnpmAvailable: true,
    swiftAvailable: null,
    pathIssueDetected: false,
  },
  runtime: {
    lastRunStatus: "success",
    warnings: [],
    diagnosticsAvailable: true,
  },
};

export const mockSetupHealthNeedsAttention: SetupHealthViewModel = buildSetupHealthViewModel(mockSetupHealthNeedsAttentionDiagnostics);

export const mockSetupHealthWorkspaceWarningDiagnostics: SetupHealthDiagnostics = {
  cloudAi: {
    authStatus: "connected",
    provider: "OpenAI",
    modelHosting: "cloud",
    model: "gpt-5.5",
    modelInfo: {
      requestedModel: "gpt-5.5",
      resolvedModel: "gpt-5.5",
      modelSource: "provider_response",
      confidence: "medium",
    },
  },
  localAi: {
    status: "available_candidate",
    runtime: "ollama",
    model: "gemma4:e4b",
    confidence: "medium",
    routingEnabled: false,
  },
  workspace: {
    selected: true,
    displayName: "Café",
    path: "/Users/example/Cafe\u0301",
    pathHealth: classifyWorkspacePathForSetupHealth("/Users/example/Cafe\u0301"),
  },
  developerTools: {
    gitAvailable: true,
    nodeAvailable: true,
    pnpmAvailable: null,
    swiftAvailable: null,
    pathIssueDetected: false,
  },
  runtime: {
    lastRunStatus: "success",
    warnings: [
      {
        code: "model_signal_partial",
        message: "Resolved model signal may be incomplete in some cloud runs.",
        severity: "warning",
      },
    ],
    diagnosticsAvailable: true,
  },
};

export const mockSetupHealthWorkspaceWarning: SetupHealthViewModel = buildSetupHealthViewModel(
  mockSetupHealthWorkspaceWarningDiagnostics,
);

export const mockSetupHealthStates = [
  {
    id: "needs_attention",
    label: "Needs attention",
    diagnostics: mockSetupHealthNeedsAttentionDiagnostics,
    viewModel: mockSetupHealthNeedsAttention,
  },
  {
    id: "workspace_warning",
    label: "Workspace warning",
    diagnostics: mockSetupHealthWorkspaceWarningDiagnostics,
    viewModel: mockSetupHealthWorkspaceWarning,
  },
  {
    id: "ready",
    label: "Ready",
    diagnostics: mockSetupHealthReadyDiagnostics,
    viewModel: mockSetupHealthReady,
  },
] as const;
