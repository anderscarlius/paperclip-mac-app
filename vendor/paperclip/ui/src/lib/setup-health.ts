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

export type AnalyzeWorkspaceResultConfidence = "high" | "medium" | "low";

export type AnalyzeWorkspaceResult = {
  schemaVersion: 1;
  resultType: "analyze_workspace_result";
  analysisMode: "metadata_only_rule_based";
  aiUsed: false;
  workspace: {
    displayName?: string | null;
    pathHealth?: {
      risk: "none" | "low" | "medium" | "unknown";
      reasons: string[];
    } | null;
  };
  summary: {
    title: string;
    description: string;
    confidence: AnalyzeWorkspaceResultConfidence;
  };
  detected: {
    languages: string[];
    frameworks: string[];
    packageManagers: string[];
    importantFiles: Array<{
      path: string;
      reason: string;
    }>;
  };
  setupWarnings: Array<{
    severity: "info" | "warning" | "needs_attention";
    title: string;
    message: string;
    action?: string;
  }>;
  suggestedNextActions: Array<{
    label: string;
    description: string;
    risk: "low" | "medium" | "high";
    requiresApproval: boolean;
  }>;
  inspected: {
    filesListed: string[];
    filesRead: string[];
    commandsRun: string[];
  };
  notInspected: string[];
  safety: {
    readOnly: true;
    filesChanged: false;
    commandsRun: false;
    fileContentsRead: boolean;
    recursiveScan: false;
    aiUsed: false;
    agentStarted: false;
    localFallbackUsed: false;
    automaticRoutingUsed: false;
  };
  contentReads: Array<{
    path: string;
    maxBytes: number;
    bytesRead: number;
    truncated: boolean;
    approved: true;
  }>;
};

export type AnalyzeWorkspaceResultValidationResult =
  | { ok: true }
  | { ok: false; errors: string[] };

export type AnalyzeWorkspaceReadmeExcerptRequest = {
  schemaVersion: 1;
  requestType: "analyze_workspace_readme_excerpt";
  workspace: {
    path: string;
    displayName?: string | null;
  };
  candidate: {
    filename: string;
  };
  limits: {
    maxBytes: number;
    recursive: false;
    followSymlinks: false;
  };
  safety: {
    readOnly: true;
    allowFileWrites: false;
    allowCommandExecution: false;
    allowNetworkAccess: false;
    allowAI: false;
  };
};

export type AnalyzeWorkspaceReadmeExcerpt = {
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

export type AnalyzeWorkspaceManifestKind =
  | "package_json"
  | "pyproject_toml"
  | "cargo_toml"
  | "go_mod"
  | "package_swift";

export type AnalyzeWorkspaceManifestFieldRequest = {
  schemaVersion: 1;
  requestType: "analyze_workspace_manifest_fields";
  workspace: {
    path: string;
    displayName?: string | null;
  };
  candidate: {
    filename: string;
    kind: AnalyzeWorkspaceManifestKind;
  };
  limits: {
    maxBytes: number;
    recursive: false;
    followSymlinks: false;
  };
  safety: {
    readOnly: true;
    allowFileWrites: false;
    allowCommandExecution: false;
    allowNetworkAccess: false;
    allowAI: false;
  };
};

export type AnalyzeWorkspaceManifestFields = {
  schemaVersion: 1;
  fieldsType: "analyze_workspace_manifest_fields";
  filename: string;
  kind: AnalyzeWorkspaceManifestKind;
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

export type AnalyzeWorkspaceFlowStepId =
  | "setup_health"
  | "confirm_read_only"
  | "request_prepared"
  | "metadata_collected"
  | "first_summary"
  | "readme_excerpt"
  | "manifest_fields"
  | "improved_summary";

export type AnalyzeWorkspaceFlowStep = {
  id: AnalyzeWorkspaceFlowStepId;
  label: string;
  status: "not_started" | "current" | "complete" | "optional" | "disabled";
  description: string;
};

export type PrivateAlphaCapability = {
  label: string;
  status: "working" | "partial" | "not_built";
  description: string;
};

export type AnalyzeWorkspaceFeedbackQuestion = {
  id: string;
  label: string;
  helperText?: string;
};

export type FirstSuccessfulRunChecklistItem = {
  id:
    | "workspace_selected"
    | "read_only_confirmed"
    | "request_prepared"
    | "metadata_collected"
    | "first_summary_shown"
    | "readme_excerpt_optional"
    | "manifest_fields_optional"
    | "feedback_prompt_shown";
  label: string;
  status: "complete" | "current" | "optional" | "not_started";
  required: boolean;
  description: string;
};

export type FirstSuccessfulRunState = {
  complete: boolean;
  title: string;
  summary: string;
  items: FirstSuccessfulRunChecklistItem[];
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
const IMPORTANT_FILE_REASONS = new Map<string, string>([
  ["readme", "Project documentation entry point"],
  ["readme.md", "Project documentation entry point"],
  ["readme.txt", "Project documentation entry point"],
  ["package.json", "JavaScript package manifest"],
  ["pnpm-lock.yaml", "pnpm lockfile"],
  ["package-lock.json", "npm lockfile"],
  ["yarn.lock", "Yarn lockfile"],
  ["bun.lockb", "Bun lockfile"],
  ["package.swift", "Swift package manifest"],
  ["pyproject.toml", "Python project manifest"],
  ["requirements.txt", "Python dependency manifest"],
  ["poetry.lock", "Poetry lockfile"],
  ["cargo.toml", "Rust package manifest"],
  ["cargo.lock", "Cargo lockfile"],
  ["go.mod", "Go module definition"],
  ["go.sum", "Go dependency checksum file"],
  ["gemfile", "Ruby dependency manifest"],
  ["gemfile.lock", "Bundler lockfile"],
  ["composer.json", "PHP package manifest"],
  ["composer.lock", "Composer lockfile"],
  ["dockerfile", "Container build definition"],
  ["docker-compose.yml", "Local service orchestration definition"],
  ["src", "Source directory"],
  ["sources", "Source directory"],
  ["test", "Test directory"],
  ["tests", "Test directory"],
  ["docs", "Documentation directory"],
]);
const NEXT_CONFIG_NAMES = new Set(["next.config.js", "next.config.mjs", "next.config.ts"]);
const VITE_CONFIG_NAMES = new Set(["vite.config.js", "vite.config.mjs", "vite.config.ts"]);
const READ_ME_CANDIDATE_ORDER = [
  "README.md",
  "README",
  "README.txt",
  "readme.md",
  "readme",
  "readme.txt",
] as const;
const MANIFEST_CANDIDATE_ORDER = [
  "package.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "Package.swift",
] as const;
const MANIFEST_KIND_BY_FILENAME = new Map<string, AnalyzeWorkspaceManifestKind>([
  ["package.json", "package_json"],
  ["pyproject.toml", "pyproject_toml"],
  ["Cargo.toml", "cargo_toml"],
  ["go.mod", "go_mod"],
  ["Package.swift", "package_swift"],
]);
const JS_PACKAGE_MANAGER_NAMES = new Map<string, string>([
  ["pnpm-lock.yaml", "pnpm"],
  ["package-lock.json", "npm"],
  ["yarn.lock", "yarn"],
  ["bun.lockb", "Bun"],
]);
const OTHER_PACKAGE_MANAGER_NAMES = new Map<string, string>([
  ["poetry.lock", "Poetry"],
  ["cargo.lock", "Cargo"],
  ["go.mod", "Go modules"],
  ["gemfile.lock", "Bundler"],
  ["composer.lock", "Composer"],
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
const NOT_INSPECTED_ITEMS = [
  "File contents",
  "Nested directories",
  "Secrets and credentials",
  ".git internals",
  "node_modules",
  "dist/build artifacts",
  "Dependency health",
  "Test results",
  "Security posture",
  "Runtime behavior",
] as const;

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

export function isAllowedReadmeFilename(name: string): boolean {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0") || trimmed.includes("..")) {
    return false;
  }
  if (isSensitiveWorkspaceEntryName(trimmed)) return false;
  return READ_ME_CANDIDATE_ORDER.includes(trimmed as (typeof READ_ME_CANDIDATE_ORDER)[number]);
}

export function isAllowedManifestFilename(name: string): boolean {
  if (typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes("/") || trimmed.includes("\\") || trimmed.includes("\0") || trimmed.includes("..")) {
    return false;
  }
  if (isSensitiveWorkspaceEntryName(trimmed)) return false;
  return MANIFEST_KIND_BY_FILENAME.has(trimmed);
}

export function manifestKindForFilename(
  name: string,
): AnalyzeWorkspaceManifestKind | null {
  return MANIFEST_KIND_BY_FILENAME.get(name.trim()) ?? null;
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

export function findReadmeCandidatesFromSnapshot(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
): string[] {
  const topLevelNames = new Set(
    snapshot.topLevelEntries
      .filter((entry) => entry.redacted !== true)
      .map((entry) => entry.name),
  );

  return READ_ME_CANDIDATE_ORDER.filter((candidate) =>
    topLevelNames.has(candidate) && isAllowedReadmeFilename(candidate),
  );
}

export function findManifestCandidatesFromSnapshot(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
): Array<{ filename: string; kind: AnalyzeWorkspaceManifestKind }> {
  const topLevelNames = new Set(
    snapshot.topLevelEntries
      .filter((entry) => entry.redacted !== true)
      .map((entry) => entry.name),
  );

  return MANIFEST_CANDIDATE_ORDER
    .filter((candidate) => topLevelNames.has(candidate) && isAllowedManifestFilename(candidate))
    .map((filename) => ({
      filename,
      kind: manifestKindForFilename(filename)!,
    }));
}

export function buildReadmeExcerptRequest(input: {
  workspacePath: string;
  displayName?: string | null;
  filename: string;
  maxBytes?: number;
}): AnalyzeWorkspaceReadmeExcerptRequest | null {
  const workspacePath = input.workspacePath.trim();
  if (!workspacePath || !isAllowedReadmeFilename(input.filename)) return null;

  return {
    schemaVersion: 1,
    requestType: "analyze_workspace_readme_excerpt",
    workspace: {
      path: workspacePath,
      displayName: input.displayName ?? null,
    },
    candidate: {
      filename: input.filename,
    },
    limits: {
      maxBytes: Math.min(input.maxBytes ?? 4096, 4096),
      recursive: false,
      followSymlinks: false,
    },
    safety: {
      readOnly: true,
      allowFileWrites: false,
      allowCommandExecution: false,
      allowNetworkAccess: false,
      allowAI: false,
    },
  };
}

export function buildManifestFieldRequest(input: {
  workspacePath: string;
  displayName?: string | null;
  filename: string;
  maxBytes?: number;
}): AnalyzeWorkspaceManifestFieldRequest | null {
  const workspacePath = input.workspacePath.trim();
  const kind = manifestKindForFilename(input.filename);
  if (!workspacePath || !kind || !isAllowedManifestFilename(input.filename)) return null;

  return {
    schemaVersion: 1,
    requestType: "analyze_workspace_manifest_fields",
    workspace: {
      path: workspacePath,
      displayName: input.displayName ?? null,
    },
    candidate: {
      filename: input.filename,
      kind,
    },
    limits: {
      maxBytes: Math.min(input.maxBytes ?? 16384, 16384),
      recursive: false,
      followSymlinks: false,
    },
    safety: {
      readOnly: true,
      allowFileWrites: false,
      allowCommandExecution: false,
      allowNetworkAccess: false,
      allowAI: false,
    },
  };
}

export function buildAnalyzeWorkspaceFlowSteps(input: {
  confirmationOpen: boolean;
  requestPrepared: boolean;
  metadataCollected: boolean;
  firstResultAvailable: boolean;
  readmeCandidateAvailable: boolean;
  readmeExcerptRead: boolean;
  manifestCandidateAvailable: boolean;
  manifestFieldsRead: boolean;
}): AnalyzeWorkspaceFlowStep[] {
  const {
    confirmationOpen,
    requestPrepared,
    metadataCollected,
    firstResultAvailable,
    readmeCandidateAvailable,
    readmeExcerptRead,
    manifestCandidateAvailable,
    manifestFieldsRead,
  } = input;

  return [
    {
      id: "setup_health",
      label: "Setup checked",
      status: confirmationOpen || requestPrepared || metadataCollected || firstResultAvailable
        ? "complete"
        : "current",
      description: "Workspace readiness and safety signals are visible before analysis starts.",
    },
    {
      id: "confirm_read_only",
      label: "Read-only confirmed",
      status: requestPrepared || metadataCollected || firstResultAvailable
        ? "complete"
        : confirmationOpen
          ? "current"
          : "not_started",
      description: "The user explicitly confirms a safe read-only first run.",
    },
    {
      id: "request_prepared",
      label: "Request prepared",
      status: metadataCollected || firstResultAvailable
        ? "complete"
        : requestPrepared
          ? "current"
          : "not_started",
      description: "Paperclip prepares a validated request without starting execution.",
    },
    {
      id: "metadata_collected",
      label: "Limited metadata collected",
      status: firstResultAvailable
        ? "complete"
        : metadataCollected
          ? "current"
          : "not_started",
      description: "Only immediate top-level names and types are collected.",
    },
    {
      id: "first_summary",
      label: "First summary",
      status: readmeExcerptRead
        ? "complete"
        : firstResultAvailable
          ? "current"
          : "not_started",
      description: "Paperclip builds a first conservative summary from safe metadata.",
    },
    {
      id: "readme_excerpt",
      label: "README excerpt",
      status: readmeExcerptRead
        ? "complete"
        : readmeCandidateAvailable
          ? firstResultAvailable
            ? "optional"
            : "not_started"
          : "disabled",
      description: readmeCandidateAvailable
        ? "An optional top-level README excerpt can improve the first summary."
        : "No top-level README candidate was found for the optional deeper read.",
    },
    {
      id: "manifest_fields",
      label: "Manifest fields",
      status: manifestFieldsRead
        ? "complete"
        : manifestCandidateAvailable
          ? firstResultAvailable
            ? "optional"
            : "not_started"
          : "disabled",
      description: manifestCandidateAvailable
        ? "An optional top-level manifest read can extract selected safe fields."
        : "No supported top-level manifest candidate was found for the optional deeper read.",
    },
    {
      id: "improved_summary",
      label: "Improved summary",
      status: readmeExcerptRead || manifestFieldsRead ? "current" : "not_started",
      description: "The summary is updated after approved README or manifest reads.",
    },
  ];
}

export function buildPrivateAlphaCapabilities(): PrivateAlphaCapability[] {
  return [
    {
      label: "Setup Health",
      status: "working",
      description: "Paperclip can show setup readiness and first-run safety context.",
    },
    {
      label: "Workspace readiness",
      status: "working",
      description: "Paperclip can confirm whether a workspace is selected before analysis starts.",
    },
    {
      label: "Path health warnings",
      status: "working",
      description: "Paperclip can warn when the selected workspace path may cause compatibility issues later.",
    },
    {
      label: "Limited top-level metadata collection",
      status: "working",
      description: "Paperclip can collect immediate top-level names and types without recursive scanning.",
    },
    {
      label: "Metadata-only first summary",
      status: "working",
      description: "Paperclip can build a conservative first summary from safe metadata alone.",
    },
    {
      label: "Approved README excerpt",
      status: "working",
      description: "Paperclip can read one small approved top-level README excerpt.",
    },
    {
      label: "Approved manifest field reading",
      status: "working",
      description: "Paperclip can extract selected safe fields from one approved top-level manifest.",
    },
    {
      label: "Safety transparency",
      status: "working",
      description: "Paperclip can show what it inspected, what it did not inspect, and whether file content was read.",
    },
    {
      label: "First analysis flow",
      status: "partial",
      description: "The first-run flow is coherent, but still limited to safe local inspection steps.",
    },
    {
      label: "Project understanding",
      status: "partial",
      description: "The first summary is useful for onboarding, but still conservative and incomplete.",
    },
    {
      label: "Cloud/Local AI readiness visibility",
      status: "partial",
      description: "Paperclip can show readiness signals, but it does not yet use AI in the first summary.",
    },
    {
      label: "Early-user onboarding",
      status: "partial",
      description: "The app is demoable, but still relies on private-alpha guidance and feedback.",
    },
    {
      label: "AI-assisted analysis",
      status: "not_built",
      description: "Paperclip does not yet use AI to improve or extend the first workspace summary.",
    },
    {
      label: "Code editing",
      status: "not_built",
      description: "Paperclip does not yet edit project files from the first-run flow.",
    },
    {
      label: "Command execution",
      status: "not_built",
      description: "Paperclip does not yet run workspace commands from this alpha flow.",
    },
    {
      label: "Deep repo scanning",
      status: "not_built",
      description: "Paperclip does not recursively inspect the repository in this private alpha.",
    },
    {
      label: "Dependency health checks",
      status: "not_built",
      description: "Paperclip does not yet assess dependency health or package safety.",
    },
    {
      label: "Security review",
      status: "not_built",
      description: "Paperclip does not yet review security posture or security risks.",
    },
    {
      label: "Automatic routing",
      status: "not_built",
      description: "Paperclip does not automatically route between cloud and local analysis modes.",
    },
    {
      label: "Local fallback execution",
      status: "not_built",
      description: "Paperclip does not yet run local fallback execution from the first-user flow.",
    },
    {
      label: "Public installer polish",
      status: "not_built",
      description: "Paperclip is still packaged as a private alpha rather than a polished public release.",
    },
  ];
}

export function buildAnalyzeWorkspaceFeedbackQuestions(): AnalyzeWorkspaceFeedbackQuestion[] {
  return [
    {
      id: "inspected_scope",
      label: "Did you understand what Paperclip inspected?",
      helperText: "This checks whether the first-run transparency is clear enough.",
    },
    {
      id: "safety_copy",
      label: "Did the safety copy feel clear?",
      helperText: "This checks whether users understand what Paperclip did not do.",
    },
    {
      id: "summary_usefulness",
      label: "Was the first summary useful?",
      helperText: "This checks whether the first result creates value before AI is added.",
    },
    {
      id: "approved_reads",
      label: "Did you trust the README and manifest read steps?",
      helperText: "This checks whether explicit approved reads feel safe and understandable.",
    },
    {
      id: "next_action",
      label: "What would you expect the next button to do?",
      helperText: "This helps shape the next safe capability after the alpha flow.",
    },
    {
      id: "self_use",
      label: "Would you try this on your own project?",
      helperText: "This helps estimate real first-user trust.",
    },
  ];
}

export function buildFirstSuccessfulRunState(input: {
  workspaceSelected: boolean;
  readOnlyConfirmed: boolean;
  requestPrepared: boolean;
  metadataCollected: boolean;
  firstSummaryShown: boolean;
  readmeExcerptRead: boolean;
  manifestFieldsRead: boolean;
  feedbackPromptShown: boolean;
}): FirstSuccessfulRunState {
  const {
    workspaceSelected,
    readOnlyConfirmed,
    requestPrepared,
    metadataCollected,
    firstSummaryShown,
    readmeExcerptRead,
    manifestFieldsRead,
    feedbackPromptShown,
  } = input;

  const complete = workspaceSelected
    && readOnlyConfirmed
    && requestPrepared
    && metadataCollected
    && firstSummaryShown;

  const items: FirstSuccessfulRunChecklistItem[] = [
    {
      id: "workspace_selected",
      label: "Workspace selected",
      status: workspaceSelected ? "complete" : "current",
      required: true,
      description: "A local workspace is selected before the private-alpha flow begins.",
    },
    {
      id: "read_only_confirmed",
      label: "Read-only flow confirmed",
      status: readOnlyConfirmed
        ? "complete"
        : workspaceSelected
          ? "current"
          : "not_started",
      required: true,
      description: "The user confirms that the first run is safe and read-only.",
    },
    {
      id: "request_prepared",
      label: "Request prepared",
      status: requestPrepared
        ? "complete"
        : readOnlyConfirmed
          ? "current"
          : "not_started",
      required: true,
      description: "Paperclip prepares a validated request without starting execution.",
    },
    {
      id: "metadata_collected",
      label: "Limited metadata collected",
      status: metadataCollected
        ? "complete"
        : requestPrepared
          ? "current"
          : "not_started",
      required: true,
      description: "Paperclip collects only immediate top-level names and types.",
    },
    {
      id: "first_summary_shown",
      label: "First workspace summary shown",
      status: firstSummaryShown
        ? "complete"
        : metadataCollected
          ? "current"
          : "not_started",
      required: true,
      description: "A conservative first summary is visible together with safety transparency.",
    },
    {
      id: "readme_excerpt_optional",
      label: "README excerpt read",
      status: readmeExcerptRead ? "complete" : "optional",
      required: false,
      description: "Optional improvement step: read one small approved top-level README excerpt.",
    },
    {
      id: "manifest_fields_optional",
      label: "Manifest fields read",
      status: manifestFieldsRead ? "complete" : "optional",
      required: false,
      description: "Optional improvement step: read selected safe fields from one approved top-level manifest.",
    },
    {
      id: "feedback_prompt_shown",
      label: "Feedback prompt shown",
      status: feedbackPromptShown ? "complete" : "optional",
      required: false,
      description: "Optional follow-up step: review the private-alpha feedback questions.",
    },
  ];

  return {
    complete,
    title: complete ? "Private alpha first run complete" : "First run in progress",
    summary: complete
      ? "Paperclip completed the safe first-run flow without running commands or using AI."
      : "Complete the safe Analyze Workspace flow to finish the private-alpha first run.",
    items,
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

function hasTopLevelEntry(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  ...candidateNames: string[]
): boolean {
  const wantedNames = new Set(candidateNames.map((name) => normalizeWorkspaceEntryName(name)));
  return snapshot.topLevelEntries.some((entry) => wantedNames.has(normalizeWorkspaceEntryName(entry.name)));
}

function pushUnique(values: string[], nextValue: string) {
  if (!values.includes(nextValue)) {
    values.push(nextValue);
  }
}

function detectLanguages(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  manifestFields?: AnalyzeWorkspaceManifestFields | null,
): string[] {
  const languages: string[] = [];
  const indicatorNames = new Set(
    snapshot.manifestIndicators.map((indicator) => normalizeWorkspaceEntryName(indicator.name)),
  );

  if (
    indicatorNames.has("package.json")
    || indicatorNames.has("pnpm-lock.yaml")
    || indicatorNames.has("package-lock.json")
    || indicatorNames.has("yarn.lock")
    || indicatorNames.has("bun.lockb")
  ) {
    pushUnique(
      languages,
      hasTopLevelEntry(snapshot, "tsconfig.json") ? "TypeScript" : "JavaScript",
    );
  }
  if (indicatorNames.has("package.swift")) pushUnique(languages, "Swift");
  if (
    indicatorNames.has("pyproject.toml")
    || indicatorNames.has("requirements.txt")
    || indicatorNames.has("poetry.lock")
  ) {
    pushUnique(languages, "Python");
  }
  if (indicatorNames.has("cargo.toml") || indicatorNames.has("cargo.lock")) {
    pushUnique(languages, "Rust");
  }
  if (indicatorNames.has("go.mod") || indicatorNames.has("go.sum")) {
    pushUnique(languages, "Go");
  }
  if (indicatorNames.has("gemfile") || indicatorNames.has("gemfile.lock")) {
    pushUnique(languages, "Ruby");
  }
  if (indicatorNames.has("composer.json") || indicatorNames.has("composer.lock")) {
    pushUnique(languages, "PHP");
  }
  if (manifestFields?.fields.language) {
    pushUnique(languages, manifestFields.fields.language);
  }
  if (manifestFields?.kind === "package_json" && hasTopLevelEntry(snapshot, "tsconfig.json")) {
    const jsIndex = languages.indexOf("JavaScript");
    if (jsIndex >= 0) languages[jsIndex] = "TypeScript";
    else pushUnique(languages, "TypeScript");
  }

  return languages;
}

function detectFrameworks(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  manifestFields?: AnalyzeWorkspaceManifestFields | null,
): string[] {
  const frameworks: string[] = [];
  if (hasTopLevelEntry(snapshot, ...Array.from(NEXT_CONFIG_NAMES))) {
    frameworks.push("Next.js");
  }
  if (hasTopLevelEntry(snapshot, ...Array.from(VITE_CONFIG_NAMES))) {
    frameworks.push("Vite");
  }
  for (const framework of manifestFields?.fields.frameworkHints ?? []) {
    pushUnique(frameworks, framework);
  }
  return frameworks;
}

function detectPackageManagers(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  manifestFields?: AnalyzeWorkspaceManifestFields | null,
): string[] {
  const packageManagers: string[] = [];

  for (const entry of snapshot.topLevelEntries) {
    const normalizedName = normalizeWorkspaceEntryName(entry.name);
    const jsPackageManager = JS_PACKAGE_MANAGER_NAMES.get(normalizedName);
    const otherPackageManager = OTHER_PACKAGE_MANAGER_NAMES.get(normalizedName);

    if (jsPackageManager) pushUnique(packageManagers, jsPackageManager);
    if (otherPackageManager) pushUnique(packageManagers, otherPackageManager);
  }
  for (const hint of manifestFields?.fields.packageManagerHints ?? []) {
    pushUnique(packageManagers, hint);
  }

  return packageManagers;
}

function buildImportantFiles(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  manifestFields?: AnalyzeWorkspaceManifestFields | null,
): AnalyzeWorkspaceResult["detected"]["importantFiles"] {
  const files = snapshot.topLevelEntries.flatMap((entry) => {
    if (entry.redacted) return [];
    const reason = IMPORTANT_FILE_REASONS.get(normalizeWorkspaceEntryName(entry.name));
    return reason ? [{ path: entry.name, reason }] : [];
  });
  if (manifestFields && !files.some((file) => file.path === manifestFields.filename)) {
    const reason = IMPORTANT_FILE_REASONS.get(normalizeWorkspaceEntryName(manifestFields.filename));
    if (reason) files.push({ path: manifestFields.filename, reason });
  }
  return files;
}

function buildSummaryTitle(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  languages: string[],
  manifestFields?: AnalyzeWorkspaceManifestFields | null,
): string {
  if (languages.length > 1) return "Multi-language workspace detected";
  if (manifestFields?.fields.name && manifestFields.fields.name.trim().length > 0) {
    if (languages.length === 1) {
      return `${languages[0]} workspace detected`;
    }
  }

  switch (languages[0] ?? null) {
    case "JavaScript":
    case "TypeScript":
      return "JavaScript/TypeScript workspace detected";
    case "Swift":
      return "Swift workspace detected";
    case "Python":
      return "Python workspace detected";
    case "Rust":
      return "Rust workspace detected";
    case "Go":
      return "Go workspace detected";
    case "Ruby":
      return "Ruby workspace detected";
    case "PHP":
      return "PHP workspace detected";
    default:
      return snapshot.manifestIndicators.length > 0
        ? "Workspace metadata collected"
        : "Limited workspace metadata collected";
  }
}

function buildSummaryConfidence(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  languages: string[],
  manifestFields?: AnalyzeWorkspaceManifestFields | null,
): AnalyzeWorkspaceResultConfidence {
  if (manifestFields?.confidence === "high") return "high";
  if (manifestFields?.confidence === "medium") return "medium";
  if (languages.length > 0 || snapshot.manifestIndicators.some((indicator) => indicator.category === "readme")) {
    return "medium";
  }
  return "low";
}

function buildSetupWarnings(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  options?: {
    readmeWasRead?: boolean;
    manifestFields?: AnalyzeWorkspaceManifestFields | null;
  },
): AnalyzeWorkspaceResult["setupWarnings"] {
  const manifestFields = options?.manifestFields ?? null;
  const readmeWasRead = options?.readmeWasRead === true;
  const warnings: AnalyzeWorkspaceResult["setupWarnings"] = [
    {
      severity: "info",
      title: manifestFields || readmeWasRead ? "Limited approved reads" : "Metadata-only result",
      message: manifestFields || readmeWasRead
        ? "This result is based on top-level metadata plus explicitly approved file reads."
        : "This first result is based only on top-level filenames and directory names.",
      action: "Collect deeper approved metadata later",
    },
  ];

  if (snapshot.workspace.pathHealth?.risk === "medium") {
    warnings.push({
      severity: "warning",
      title: "Workspace path warning",
      message: "This path may slow some cloud runs or trigger compatibility fallbacks.",
      action: "Review path health before deeper cloud analysis",
    });
  }

  if (snapshot.redactions.length > 0) {
    warnings.push({
      severity: "warning",
      title: "Sensitive-looking entries were redacted",
      message: "Paperclip saw one or more sensitive-looking top-level names and hid them from the result.",
      action: "Review sensitive files manually if needed",
    });
  }

  if (manifestFields) {
    warnings.push({
      severity: "info",
      title: "Selected manifest fields read",
      message: "Paperclip read selected safe fields from the top-level manifest file. It did not expose raw manifest content.",
      action: "Review extracted fields before deeper analysis",
    });
  }

  return warnings;
}

function buildSuggestedNextActions(
  snapshot: AnalyzeWorkspaceMetadataSnapshot,
  manifestFields?: AnalyzeWorkspaceManifestFields | null,
): AnalyzeWorkspaceResult["suggestedNextActions"] {
  const actions: AnalyzeWorkspaceResult["suggestedNextActions"] = [
    {
      label: "Open diagnostics",
      description: "Review setup and runtime details before running deeper analysis.",
      risk: "low",
      requiresApproval: false,
    },
  ];

  if (snapshot.manifestIndicators.some((indicator) => indicator.category === "readme")) {
    actions.push({
      label: "Inspect README safely",
      description: "Read a small approved excerpt from README to improve the project summary.",
      risk: "low",
      requiresApproval: true,
    });
  }

  if (
    snapshot.manifestIndicators.some((indicator) =>
      ["javascript", "swift", "python", "rust", "go", "ruby", "php"].includes(indicator.category),
    )
    && !manifestFields
  ) {
    actions.push({
      label: "Inspect project manifest safely",
      description: "Read selected fields from the detected manifest file to improve the summary.",
      risk: "low",
      requiresApproval: true,
    });
  }

  actions.push({
    label: "Prepare AI summary from safe metadata",
    description: "Use only the collected metadata to ask Cloud AI for a first summary later.",
    risk: "low",
    requiresApproval: true,
  });

  return actions;
}

function mentionsOverclaiming(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("tests passed")
    || normalized.includes("test passed")
    || normalized.includes("security posture")
    || normalized.includes("security verified")
    || normalized.includes("dependency health")
    || normalized.includes("production ready")
  );
}

function extractReadmeHeading(readmeExcerpt: AnalyzeWorkspaceReadmeExcerpt | null | undefined): string | null {
  if (!readmeExcerpt) return null;
  const firstMeaningfulLine = readmeExcerpt.content
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstMeaningfulLine) return null;

  const markdownHeadingMatch = firstMeaningfulLine.match(/^#\s+(.+)$/u);
  if (!markdownHeadingMatch) return null;

  const heading = markdownHeadingMatch[1]?.trim();
  return heading && heading.length > 0 ? heading : null;
}

function buildManifestSummarySnippet(
  manifestFields: AnalyzeWorkspaceManifestFields | null | undefined,
): string | null {
  if (!manifestFields) return null;

  const details: string[] = [];
  if (manifestFields.fields.name) details.push(`manifest name "${manifestFields.fields.name}"`);
  if (manifestFields.fields.description) details.push("a project description");
  if ((manifestFields.fields.frameworkHints?.length ?? 0) > 0) {
    details.push(`framework hints such as ${manifestFields.fields.frameworkHints!.slice(0, 2).join(" and ")}`);
  }
  if ((manifestFields.fields.dependencies?.length ?? 0) > 0) {
    details.push(`dependency names from ${manifestFields.filename}`);
  }
  if ((manifestFields.fields.targets?.length ?? 0) > 0) {
    details.push(`target names from ${manifestFields.filename}`);
  }

  if (details.length === 0) {
    return `Paperclip read selected safe fields from ${manifestFields.filename}.`;
  }

  return `Paperclip read selected safe fields from ${manifestFields.filename}, including ${details.slice(0, 2).join(" and ")}.`;
}

export function buildAnalyzeWorkspaceResultFromMetadata(input: {
  request: AnalyzeWorkspaceRequest;
  snapshot: AnalyzeWorkspaceMetadataSnapshot;
  readmeExcerpt?: AnalyzeWorkspaceReadmeExcerpt | null;
  manifestFields?: AnalyzeWorkspaceManifestFields | null;
}): AnalyzeWorkspaceResult {
  const languages = detectLanguages(input.snapshot, input.manifestFields);
  const frameworks = detectFrameworks(input.snapshot, input.manifestFields);
  const packageManagers = detectPackageManagers(input.snapshot, input.manifestFields);
  const importantFiles = buildImportantFiles(input.snapshot, input.manifestFields);
  const readmeHeading = extractReadmeHeading(input.readmeExcerpt);
  const readmeWasRead = Boolean(input.readmeExcerpt);
  const manifestWasRead = Boolean(input.manifestFields);
  const manifestSnippet = buildManifestSummarySnippet(input.manifestFields);
  const summaryDescription = readmeWasRead && manifestWasRead
    ? readmeHeading
      ? `Paperclip inspected limited top-level metadata, one approved README excerpt, and selected safe manifest fields. README heading suggests this project is called "${readmeHeading}". ${manifestSnippet ?? ""} It did not run commands or use AI.`.trim()
      : `Paperclip inspected limited top-level metadata, one approved README excerpt, and selected safe manifest fields. ${manifestSnippet ?? ""} It did not run commands or use AI.`.trim()
    : readmeWasRead
      ? readmeHeading
        ? `Paperclip inspected limited top-level metadata and one approved README excerpt. README heading suggests this project is called "${readmeHeading}", but deeper project details still need approved reads or AI later.`
        : "Paperclip inspected limited top-level metadata and one approved README excerpt. It used that excerpt only as a cautious documentation signal and did not run commands or use AI."
      : manifestWasRead
        ? `Paperclip inspected limited top-level metadata and selected safe manifest fields. ${manifestSnippet ?? ""} It did not run commands or use AI.`.trim()
        : "Paperclip inspected limited top-level metadata for this workspace. It detected common project indicators but did not read file contents or run commands.";
  const filesRead = [
    ...(input.readmeExcerpt ? [input.readmeExcerpt.filename] : []),
    ...(input.manifestFields ? [input.manifestFields.filename] : []),
  ];
  const contentReads = [
    ...(input.readmeExcerpt
      ? [{
        path: input.readmeExcerpt.filename,
        maxBytes: 4096,
        bytesRead: input.readmeExcerpt.bytesRead,
        truncated: input.readmeExcerpt.truncated,
        approved: true as const,
      }]
      : []),
    ...(input.manifestFields
      ? [{
        path: input.manifestFields.filename,
        maxBytes: 16384,
        bytesRead: input.manifestFields.bytesRead,
        truncated: input.manifestFields.truncated,
        approved: true as const,
      }]
      : []),
  ];

  return {
    schemaVersion: 1,
    resultType: "analyze_workspace_result",
    analysisMode: "metadata_only_rule_based",
    aiUsed: false,
    workspace: {
      displayName: input.request.workspace.displayName ?? input.snapshot.workspace.displayName ?? null,
      pathHealth: input.snapshot.workspace.pathHealth ?? input.request.workspace.pathHealth ?? null,
    },
    summary: {
      title: buildSummaryTitle(input.snapshot, languages, input.manifestFields),
      description: summaryDescription,
      confidence: buildSummaryConfidence(input.snapshot, languages, input.manifestFields),
    },
    detected: {
      languages,
      frameworks,
      packageManagers,
      importantFiles,
    },
    setupWarnings: buildSetupWarnings(input.snapshot, {
      readmeWasRead,
      manifestFields: input.manifestFields,
    }),
    suggestedNextActions: buildSuggestedNextActions(input.snapshot, input.manifestFields),
    inspected: {
      filesListed: input.snapshot.topLevelEntries.map((entry) => entry.name),
      filesRead,
      commandsRun: [],
    },
    notInspected: [...NOT_INSPECTED_ITEMS],
    safety: {
      readOnly: true,
      filesChanged: false,
      commandsRun: false,
      fileContentsRead: filesRead.length > 0,
      recursiveScan: false,
      aiUsed: false,
      agentStarted: false,
      localFallbackUsed: false,
      automaticRoutingUsed: false,
    },
    contentReads,
  };
}

export function validateAnalyzeWorkspaceResult(
  result: AnalyzeWorkspaceResult,
): AnalyzeWorkspaceResultValidationResult {
  const errors: string[] = [];

  if (result.schemaVersion !== 1) errors.push("schemaVersion must be 1.");
  if (result.resultType !== "analyze_workspace_result") {
    errors.push('resultType must be "analyze_workspace_result".');
  }
  if (result.analysisMode !== "metadata_only_rule_based") {
    errors.push('analysisMode must be "metadata_only_rule_based".');
  }
  if (result.aiUsed !== false) errors.push("aiUsed must be false.");
  if (result.safety.readOnly !== true) errors.push("safety.readOnly must be true.");
  if (result.safety.filesChanged !== false) errors.push("safety.filesChanged must be false.");
  if (result.safety.commandsRun !== false) errors.push("safety.commandsRun must be false.");
  if (typeof result.safety.fileContentsRead !== "boolean") {
    errors.push("safety.fileContentsRead must be a boolean.");
  }
  if (result.safety.recursiveScan !== false) errors.push("safety.recursiveScan must be false.");
  if (result.safety.aiUsed !== false) errors.push("safety.aiUsed must be false.");
  if (result.safety.agentStarted !== false) errors.push("safety.agentStarted must be false.");
  if (result.safety.localFallbackUsed !== false) errors.push("safety.localFallbackUsed must be false.");
  if (result.safety.automaticRoutingUsed !== false) {
    errors.push("safety.automaticRoutingUsed must be false.");
  }
  if (result.inspected.commandsRun.length > 0) errors.push("inspected.commandsRun must be empty.");
  if (result.safety.fileContentsRead === true && result.inspected.filesRead.length === 0) {
    errors.push("inspected.filesRead must list approved content reads when fileContentsRead is true.");
  }
  if (result.safety.fileContentsRead === false && result.inspected.filesRead.length > 0) {
    errors.push("safety.fileContentsRead must be true when inspected.filesRead is not empty.");
  }
  if (result.safety.fileContentsRead === true && result.contentReads.length === 0) {
    errors.push("contentReads must describe approved content reads when fileContentsRead is true.");
  }
  if (result.safety.fileContentsRead === false && result.contentReads.length > 0) {
    errors.push("contentReads must be empty when fileContentsRead is false.");
  }
  if (!result.notInspected.some((item) => item.toLowerCase().includes("file contents"))) {
    errors.push("notInspected must mention file contents.");
  }
  if (
    !result.notInspected.some((item) =>
      item.toLowerCase().includes("secret") || item.toLowerCase().includes("credential"),
    )
  ) {
    errors.push("notInspected must mention secrets or credentials.");
  }

  const claimChecks = [
    result.summary.title,
    result.summary.description,
    ...result.setupWarnings.flatMap((warning) => [warning.title, warning.message, warning.action ?? ""]),
    ...result.suggestedNextActions.flatMap((action) => [action.label, action.description]),
  ];
  if (claimChecks.some((text) => mentionsOverclaiming(text))) {
    errors.push("result contains overclaiming about tests, security posture, dependency health, or production readiness.");
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
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
  {
    id: "ready_no_readme",
    label: "Ready (No README)",
    diagnostics: mockSetupHealthReadyDiagnostics,
    viewModel: mockSetupHealthReady,
  },
  {
    id: "ready_no_manifest",
    label: "Ready (No Manifest)",
    diagnostics: mockSetupHealthReadyDiagnostics,
    viewModel: mockSetupHealthReady,
  },
  {
    id: "ready_metadata_error",
    label: "Ready (Metadata Error)",
    diagnostics: mockSetupHealthReadyDiagnostics,
    viewModel: mockSetupHealthReady,
  },
  {
    id: "ready_readme_error",
    label: "Ready (README Error)",
    diagnostics: mockSetupHealthReadyDiagnostics,
    viewModel: mockSetupHealthReady,
  },
  {
    id: "ready_manifest_error",
    label: "Ready (Manifest Error)",
    diagnostics: mockSetupHealthReadyDiagnostics,
    viewModel: mockSetupHealthReady,
  },
] as const;
