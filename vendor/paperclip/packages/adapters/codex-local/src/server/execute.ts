import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inferOpenAiCompatibleBiller, type AdapterExecutionContext, type AdapterExecutionResult } from "@paperclipai/adapter-utils";
import {
  asString,
  asNumber,
  asBoolean,
  asStringArray,
  parseObject,
  buildPaperclipEnv,
  buildInvocationEnvForLogs,
  ensureAbsoluteDirectory,
  ensureCommandResolvable,
  ensurePaperclipSkillSymlink,
  ensurePathInEnv,
  readPaperclipRuntimeSkillEntries,
  resolveCommandForLogs,
  resolvePaperclipDesiredSkillNames,
  renderTemplate,
  renderPaperclipWakePrompt,
  stringifyPaperclipWakePayload,
  joinPromptSections,
  runChildProcess,
} from "@paperclipai/adapter-utils/server-utils";
import { parseCodexJsonl, isCodexUnknownSessionError } from "./parse.js";
import { ensureCodexHomeProfile, pathExists, prepareManagedCodexHome, resolveManagedCodexHomeDir, resolveSharedCodexHomeDir } from "./codex-home.js";
import { readCodexAuthInfo } from "./quota.js";
import { isCodexCommandBridgedSkill, resolveCodexDesiredSkillNames } from "./skills.js";

const __moduleDir = path.dirname(fileURLToPath(import.meta.url));
const CODEX_ROLLOUT_NOISE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+ERROR\s+codex_core::rollout::list:\s+state db missing rollout path for thread\s+[a-z0-9-]+$/i;
const CODEX_TELEMETRY_MODEL_TAG_NOISE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+WARN\s+codex_otel::events::session_telemetry:\s+metrics\s+(?:counter|duration|histogram)\s+\[[^\]]+\]\s+failed:\s+tag value contains invalid characters:\s+.+$/i;
const CODEX_PLUGIN_SYNC_AUTH_NOISE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+WARN\s+codex_core::plugins::startup_sync:\s+startup remote plugin sync failed; will retry on next app-server start error=chatgpt authentication required to sync remote plugins$/i;
const CODEX_FEATURED_PLUGIN_CACHE_NOISE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+WARN\s+codex_core::plugins::manager:\s+failed to warm featured plugin ids cache error=remote plugin sync request to https:\/\/chatgpt\.com\/backend-api\/plugins\/featured failed with status 401 Unauthorized: \{\"detail\":\"Unauthorized\"\}$/i;
const CODEX_UNKNOWN_MODEL_NOISE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+WARN\s+codex_models_manager::model_info:\s+Unknown model .+ is used\. This will use fallback model metadata\.$/i;
const CODEX_MODEL_PERSONALITY_NOISE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+WARN\s+codex_protocol::openai_models:\s+Model personality requested but model_messages is missing, falling back to base instructions\.\s+model=.+\s+personality=.+$/i;
const CODEX_PLUGIN_DEFAULT_PROMPT_NOISE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+WARN\s+codex_core::plugins::manifest:\s+ignoring interface\.defaultPrompt: prompt must be at most 128 characters path=.+$/i;
const CODEX_SHELL_SNAPSHOT_DELETE_NOISE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+WARN\s+codex_core::shell_snapshot:\s+Failed to delete shell snapshot at .+: Os \{ code: 2, kind: NotFound, message: "No such file or directory" \}$/i;
const CODEX_THREAD_PERSISTENCE_FAILURE_RE =
  /^\d{4}-\d{2}-\d{2}T[^\s]+\s+ERROR\s+codex_core::session:\s+failed to record rollout items:\s+thread\s+[a-z0-9-]+\s+not found$/i;
const PAPERCLIP_WEB_SEARCH_RUNTIME_GUIDANCE = [
  'Runtime web search is a shell command, not a Codex tool or skill. When current public web information is needed, run `paperclip-web-search "query" --max-results 5` from the shell.',
  "`websearch` is available as a compatibility alias.",
  "If a subject can mean multiple things, use the issue title, description, and recent comments to disambiguate it before searching.",
  "For ambiguous names, acronyms, or product names, try 2-3 refined queries before concluding there is no relevant coverage.",
  "If the first search returns generic or off-topic results, tighten the query with the domain, vendor, geography, language, or exact product phrase from the issue.",
  "Do not claim there is no news or no public information after one weak search.",
  "If evidence is still thin after refined searches, say that clearly and mention the specific framing you checked.",
  "Never call paperclip-web-search, websearch, skill_execute, exec_skill, execute_skill, or process_skill as tool calls.",
].join(" ");

function stripCodexRolloutNoise(text: string): string {
  const parts = text.split(/\r?\n/);
  const kept: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) {
      kept.push(part);
      continue;
    }
    if (CODEX_ROLLOUT_NOISE_RE.test(trimmed)) continue;
    if (CODEX_TELEMETRY_MODEL_TAG_NOISE_RE.test(trimmed)) continue;
    if (CODEX_PLUGIN_SYNC_AUTH_NOISE_RE.test(trimmed)) continue;
    if (CODEX_FEATURED_PLUGIN_CACHE_NOISE_RE.test(trimmed)) continue;
    if (CODEX_UNKNOWN_MODEL_NOISE_RE.test(trimmed)) continue;
    if (CODEX_MODEL_PERSONALITY_NOISE_RE.test(trimmed)) continue;
    if (CODEX_PLUGIN_DEFAULT_PROMPT_NOISE_RE.test(trimmed)) continue;
    if (CODEX_SHELL_SNAPSHOT_DELETE_NOISE_RE.test(trimmed)) continue;
    kept.push(part);
  }
  return kept.join("\n");
}

function hasCodexThreadPersistenceFailure(text: string): boolean {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => CODEX_THREAD_PERSISTENCE_FAILURE_RE.test(line));
}

function stripCodexThreadPersistenceFailure(text: string): string {
  return text
    .split(/\r?\n/)
    .filter((line) => !CODEX_THREAD_PERSISTENCE_FAILURE_RE.test(line.trim()))
    .join("\n");
}

function paperclipThreadPersistenceWarningLine(): string {
  return "[paperclip] Codex completed the run, but its session thread was not persisted correctly. Paperclip will discard this session and avoid reusing it on the next run.\n";
}

function firstNonEmptyLine(text: string): string {
  return (
    text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? ""
  );
}

function hasNonEmptyEnvValue(env: Record<string, string>, key: string): boolean {
  const raw = env[key];
  return typeof raw === "string" && raw.trim().length > 0;
}

function resolveCodexBillingType(env: Record<string, string>): "api" | "subscription" {
  // Codex uses API-key auth when OPENAI_API_KEY is present; otherwise rely on local login/session auth.
  return hasNonEmptyEnvValue(env, "OPENAI_API_KEY") ? "api" : "subscription";
}

function resolveCodexBiller(env: Record<string, string>, billingType: "api" | "subscription"): string {
  const openAiCompatibleBiller = inferOpenAiCompatibleBiller(env, "openai");
  if (openAiCompatibleBiller === "openrouter") return "openrouter";
  return billingType === "subscription" ? "chatgpt" : openAiCompatibleBiller ?? "openai";
}

function resolveCodexProvider(
  extraArgs: string[],
  env: Record<string, string>,
): string {
  for (let index = 0; index < extraArgs.length; index += 1) {
    if (extraArgs[index] === "--local-provider") {
      const provider = extraArgs[index + 1]?.trim();
      if (provider) return provider;
    }
  }

  const baseUrl = env.OPENAI_BASE_URL?.trim().toLowerCase() ?? "";
  if (baseUrl.includes("127.0.0.1:11434") || baseUrl.includes("localhost:11434")) {
    return "ollama";
  }

  return "openai";
}

function isLocalCodexProvider(provider: string): boolean {
  return new Set(["ollama", "lmstudio", "llamacpp", "local"]).has(provider.trim().toLowerCase());
}

type RuntimeModelSource =
  | "adapter_request"
  | "codex_home_config"
  | "codex_cli_output"
  | "provider_response"
  | "not_available";

type RuntimeModelConfidence = "high" | "medium" | "low" | "unknown";

type RuntimeModelInfo = {
  requestedModel: string | null;
  resolvedModel: string | null;
  reportedModel: string | null;
  modelSource: RuntimeModelSource;
  confidence: RuntimeModelConfidence;
  unknownReason?: string;
};

type LocalFallbackTaskClass =
  | "local_short_summary"
  | "local_small_code_explanation"
  | "local_short_policy_text";

type LocalFallbackCandidatePayload = {
  schemaVersion: 1;
  candidateType: "local_fallback_offer";
  available: boolean;
  decision: "eligible" | "diagnostic_only" | "not_eligible" | "not_available";
  source:
    | "explicit_task_metadata"
    | "operator_handshake"
    | "runtime_diagnostics"
    | "lab_fixture"
    | "not_available";
  taskClass?: LocalFallbackTaskClass;
  confidence: "medium" | "low";
  model: "gemma4:e4b";
  runtime: "ollama";
  routingEnabled: false;
  automaticRoutingEnabled: false;
  privacyBenefit: boolean;
  qualityWarning: string;
  eligibleReasons: string[];
  ineligibleReasons: string[];
  recommendedFallback: "stronger_model";
  actions: ["run_locally", "use_stronger_model", "cancel"];
};

type LocalFallbackHandshakeRequest = {
  requestType: "local_fallback_candidate";
  taskClass?: LocalFallbackTaskClass;
  privacyBenefit: boolean;
  requiresStrictJson: boolean;
  requiresCodeEdit: boolean;
  requiresCommandExecution: boolean;
  highStakesDomain: boolean;
  userExplicitlyRequestedLocal: boolean;
};

const CLOUD_MODEL_UNAVAILABLE_REASON = "codex_cloud_resolved_model_not_reported";
const MODEL_SIGNAL_NOT_AVAILABLE_REASON = "codex_model_signal_not_available";

function readTopLevelTomlString(contents: string, key: string): string | null {
  let inTopLevel = true;
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (/^\[[^\]]+\]$/.test(trimmed)) {
      inTopLevel = false;
      continue;
    }
    if (!inTopLevel) continue;
    const match = trimmed.match(/^([A-Za-z0-9_.-]+)\s*=\s*"((?:\\.|[^"\\])*)"/);
    if (!match || match[1] !== key) continue;
    try {
      const parsed = JSON.parse(`"${match[2]}"`);
      return typeof parsed === "string" && parsed.trim().length > 0 ? parsed.trim() : null;
    } catch {
      return match[2].trim() || null;
    }
  }
  return null;
}

function isLocalFallbackTaskClass(value: unknown): value is LocalFallbackTaskClass {
  return value === "local_short_summary"
    || value === "local_small_code_explanation"
    || value === "local_short_policy_text";
}

function isLocalFallbackDecision(
  value: unknown,
): value is LocalFallbackCandidatePayload["decision"] {
  return value === "eligible"
    || value === "diagnostic_only"
    || value === "not_eligible"
    || value === "not_available";
}

function isLocalFallbackSource(
  value: unknown,
): value is LocalFallbackCandidatePayload["source"] {
  return value === "explicit_task_metadata"
    || value === "operator_handshake"
    || value === "runtime_diagnostics"
    || value === "lab_fixture"
    || value === "not_available";
}

function readLocalFallbackReasonStrings(value: unknown, maxItems = 5): string[] {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    items.push(trimmed);
    if (items.length >= maxItems) break;
  }
  return items;
}

function normalizeLocalFallbackCandidatePayload(value: unknown): LocalFallbackCandidatePayload | null {
  const record = parseObject(value);
  if (!record) return null;
  if (record.schemaVersion !== 1) return null;
  if (asString(record.candidateType, "") !== "local_fallback_offer") return null;
  if (typeof record.available !== "boolean") return null;
  if (!isLocalFallbackDecision(record.decision)) return null;
  if (!isLocalFallbackSource(record.source)) return null;
  const confidence = asString(record.confidence, "");
  if (confidence !== "medium" && confidence !== "low") return null;
  if (asString(record.model, "") !== "gemma4:e4b") return null;
  if (asString(record.runtime, "") !== "ollama") return null;
  if (record.routingEnabled !== false || record.automaticRoutingEnabled !== false) return null;
  if (asString(record.recommendedFallback, "") !== "stronger_model") return null;

  const taskClass = isLocalFallbackTaskClass(record.taskClass) ? record.taskClass : undefined;
  if (record.decision === "eligible" && !taskClass) return null;
  if (record.decision === "not_available" && record.available !== false) return null;
  if (record.decision !== "not_available" && record.available !== true) return null;

  return {
    schemaVersion: 1,
    candidateType: "local_fallback_offer",
    available: record.available,
    decision: record.decision,
    source: record.source,
    ...(taskClass ? { taskClass } : {}),
    confidence,
    model: "gemma4:e4b",
    runtime: "ollama",
    routingEnabled: false,
    automaticRoutingEnabled: false,
    privacyBenefit: record.privacyBenefit === true,
    qualityWarning: asString(record.qualityWarning, "Local result may be less capable than cloud."),
    eligibleReasons: readLocalFallbackReasonStrings(record.eligibleReasons),
    ineligibleReasons: readLocalFallbackReasonStrings(record.ineligibleReasons),
    recommendedFallback: "stronger_model",
    actions: ["run_locally", "use_stronger_model", "cancel"],
  };
}

function readLocalFallbackHandshakeRequest(value: unknown): LocalFallbackHandshakeRequest | null {
  const record = parseObject(value);
  if (!record) return null;
  if (asString(record.requestType, "") !== "local_fallback_candidate") return null;
  return {
    requestType: "local_fallback_candidate",
    taskClass: isLocalFallbackTaskClass(record.taskClass) ? record.taskClass : undefined,
    privacyBenefit: record.privacyBenefit === true,
    requiresStrictJson: record.requiresStrictJson === true,
    requiresCodeEdit: record.requiresCodeEdit === true,
    requiresCommandExecution: record.requiresCommandExecution === true,
    highStakesDomain: record.highStakesDomain === true,
    userExplicitlyRequestedLocal: record.userExplicitlyRequestedLocal === true,
  };
}

function buildLocalFallbackCandidateFromHandshakeRequest(
  request: LocalFallbackHandshakeRequest,
): LocalFallbackCandidatePayload {
  const ineligibleReasons: string[] = [];
  if (!request.taskClass) {
    ineligibleReasons.push("No explicit eligible task class was provided for this run.");
  }
  if (request.requiresStrictJson) {
    ineligibleReasons.push("Task requires strict JSON output.");
  }
  if (request.requiresCodeEdit) {
    ineligibleReasons.push("Task requires code edits.");
  }
  if (request.requiresCommandExecution) {
    ineligibleReasons.push("Task requires command execution planning.");
  }
  if (request.highStakesDomain) {
    ineligibleReasons.push("Task is marked as high-stakes.");
  }

  const decision: LocalFallbackCandidatePayload["decision"] =
    ineligibleReasons.length > 0
      ? request.taskClass ? "not_eligible" : "diagnostic_only"
      : "eligible";

  return {
    schemaVersion: 1,
    candidateType: "local_fallback_offer",
    available: true,
    decision,
    source: "operator_handshake",
    ...(request.taskClass ? { taskClass: request.taskClass } : {}),
    confidence: "medium",
    model: "gemma4:e4b",
    runtime: "ollama",
    routingEnabled: false,
    automaticRoutingEnabled: false,
    privacyBenefit: request.privacyBenefit,
    qualityWarning: "Local result may be less capable than cloud.",
    eligibleReasons: decision === "eligible"
      ? [
          "Task class matches the narrow local fallback candidate policy.",
          request.userExplicitlyRequestedLocal
            ? "The operator explicitly requested local fallback consideration."
            : "This request was surfaced through explicit local fallback metadata.",
        ]
      : [
          "Local fallback metadata was present for this run.",
        ],
    ineligibleReasons,
    recommendedFallback: "stronger_model",
    actions: ["run_locally", "use_stronger_model", "cancel"],
  };
}

function resolveLocalFallbackCandidateFromContext(
  context: Record<string, unknown>,
): LocalFallbackCandidatePayload | null {
  const explicitCandidate =
    normalizeLocalFallbackCandidatePayload(context.localFallbackCandidate)
    ?? normalizeLocalFallbackCandidatePayload(context.paperclipLocalFallbackCandidate);
  if (explicitCandidate) return explicitCandidate;

  const handshakeRequest =
    readLocalFallbackHandshakeRequest(context.localFallbackCandidateRequest)
    ?? readLocalFallbackHandshakeRequest(context.paperclipLocalFallbackRequest);
  if (handshakeRequest) {
    return buildLocalFallbackCandidateFromHandshakeRequest(handshakeRequest);
  }

  return null;
}

async function resolveCodexRequestedModelSignal(input: {
  configuredModel: string;
  codexHome: string;
}): Promise<{ requestedModel: string | null; modelSource: RuntimeModelSource }> {
  const configuredModel = input.configuredModel.trim();
  if (configuredModel) {
    return {
      requestedModel: configuredModel,
      modelSource: "adapter_request",
    };
  }

  const configTomlPath = path.join(input.codexHome, "config.toml");
  const configToml = await fs.readFile(configTomlPath, "utf8").catch(() => null);
  if (!configToml) {
    return {
      requestedModel: null,
      modelSource: "not_available",
    };
  }

  const requestedModel = readTopLevelTomlString(configToml, "model");
  if (!requestedModel) {
    return {
      requestedModel: null,
      modelSource: "not_available",
    };
  }

  return {
    requestedModel,
    modelSource: "codex_home_config",
  };
}

function buildRuntimeModelInfo(input: {
  provider: string;
  requestedModel: string | null;
  modelSource: RuntimeModelSource;
  reportedModel?: string | null;
}): RuntimeModelInfo {
  const requestedModel = input.requestedModel?.trim() || null;
  const reportedModel = input.reportedModel?.trim() || null;
  const localHosted = isLocalCodexProvider(input.provider);

  if (reportedModel) {
    return {
      requestedModel,
      resolvedModel: reportedModel,
      reportedModel,
      modelSource: input.modelSource === "not_available" ? "codex_cli_output" : input.modelSource,
      confidence: "high",
    };
  }

  if (localHosted && requestedModel) {
    return {
      requestedModel,
      resolvedModel: requestedModel,
      reportedModel: null,
      modelSource: input.modelSource,
      confidence: "high",
    };
  }

  if (requestedModel) {
    return {
      requestedModel,
      resolvedModel: null,
      reportedModel: null,
      modelSource: input.modelSource,
      confidence: input.modelSource === "adapter_request" ? "medium" : "low",
      unknownReason: CLOUD_MODEL_UNAVAILABLE_REASON,
    };
  }

  return {
    requestedModel: null,
    resolvedModel: null,
    reportedModel: null,
    modelSource: "not_available",
    confidence: "unknown",
    unknownReason: MODEL_SIGNAL_NOT_AVAILABLE_REASON,
  };
}

function buildRuntimeContext(input: {
  provider: string;
  modelInfo: RuntimeModelInfo;
  billingType: "api" | "subscription";
  biller: string;
  localFallbackCandidate?: LocalFallbackCandidatePayload | null;
}) {
  const provider = input.provider.trim() || "unknown";
  const model = input.modelInfo.resolvedModel?.trim() || input.modelInfo.reportedModel?.trim() || "unknown";
  return {
    executionRuntime: "local",
    modelHosting: isLocalCodexProvider(provider) ? "local" : "cloud",
    provider,
    model,
    modelInfo: input.modelInfo,
    ...(input.localFallbackCandidate ? { localFallbackCandidate: input.localFallbackCandidate } : {}),
    biller: input.biller.trim() || "unknown",
    billingType: input.billingType,
  } as const;
}

function buildRuntimeContextPromptSection(runtimeContext: {
  executionRuntime: string;
  modelHosting: string;
  provider: string;
  model: string;
  modelInfo: RuntimeModelInfo;
  biller: string;
  billingType: string;
}): string {
  const lines = [
    "Paperclip runtime context for this run (authoritative):",
    `- execution_runtime: ${runtimeContext.executionRuntime}`,
    `- model_hosting: ${runtimeContext.modelHosting}`,
    `- provider: ${runtimeContext.provider}`,
    `- model: ${runtimeContext.model}`,
    `- biller: ${runtimeContext.biller}`,
    `- billing_type: ${runtimeContext.billingType}`,
  ];
  if (runtimeContext.modelInfo.requestedModel) {
    lines.push(`- requested_model: ${runtimeContext.modelInfo.requestedModel}`);
  }
  if (runtimeContext.modelInfo.reportedModel) {
    lines.push(`- reported_model: ${runtimeContext.modelInfo.reportedModel}`);
  }
  lines.push(`- model_source: ${runtimeContext.modelInfo.modelSource}`);
  lines.push(`- model_confidence: ${runtimeContext.modelInfo.confidence}`);
  if (runtimeContext.modelInfo.unknownReason) {
    lines.push(`- model_unknown_reason: ${runtimeContext.modelInfo.unknownReason}`);
  }
  lines.push(
    "Use these values when reasoning about whether this run is local or cloud, and which provider/model is active.",
  );
  return lines.join("\n");
}

function commandLooksLike(command: string, expected: string): boolean {
  const base = path.basename(command).toLowerCase();
  return base === expected || base === `${expected}.cmd` || base === `${expected}.exe`;
}

type CloudAuthPresence = {
  hasAuth: boolean;
  source: "openai_api_key" | "codex_auth_config" | null;
  checkedCodexHome: string | null;
};

type WorkspacePathClass = {
  asciiSafe: boolean;
  containsSpaces: boolean;
  containsNonAscii: boolean;
  containsDecomposedUnicode: boolean;
  containsPercentEncoding: boolean;
  riskLevel: "none" | "low" | "medium";
  reasons: string[];
};

type WorkspacePathClassWarning = {
  type: "workspace_path_class_warning";
  severity: "info";
  code: "cloud_codex_non_ascii_workspace_path";
  message: string;
  pathClass: WorkspacePathClass;
  runtimeContext: ReturnType<typeof buildRuntimeContext>;
};

const PERCENT_ENCODING_RE = /%[0-9A-Fa-f]{2}/;
const PRINTABLE_ASCII_RE = /^[\x20-\x7E]+$/;
const NON_ASCII_RE = /[^\x00-\x7F]/u;
const SPACES_RE = /\s/u;
const COMBINING_MARK_RE = /\p{M}/u;

function classifyWorkspacePath(pathValue: string): WorkspacePathClass {
  const normalizedPath = typeof pathValue === "string" ? pathValue : "";
  const containsPercentEncoding = PERCENT_ENCODING_RE.test(normalizedPath);
  const containsSpaces = SPACES_RE.test(normalizedPath);
  const containsNonAscii = NON_ASCII_RE.test(normalizedPath);
  const containsCombiningMarks = COMBINING_MARK_RE.test(normalizedPath);
  const differsUnderNormalization =
    normalizedPath.length > 0 &&
    (normalizedPath.normalize("NFC") !== normalizedPath || normalizedPath.normalize("NFD") !== normalizedPath);
  const containsDecomposedUnicode = containsCombiningMarks || differsUnderNormalization;
  const asciiSafe =
    normalizedPath.length > 0 &&
    PRINTABLE_ASCII_RE.test(normalizedPath) &&
    !containsPercentEncoding;
  const riskLevel: WorkspacePathClass["riskLevel"] =
    containsNonAscii || containsDecomposedUnicode || containsPercentEncoding
      ? "medium"
      : containsSpaces
        ? "low"
        : "none";
  const reasons: string[] = [];
  if (containsSpaces) reasons.push("contains_spaces");
  if (containsNonAscii) reasons.push("contains_non_ascii");
  if (containsDecomposedUnicode) reasons.push("contains_decomposed_unicode");
  if (containsPercentEncoding) reasons.push("contains_percent_encoding");
  return {
    asciiSafe,
    containsSpaces,
    containsNonAscii,
    containsDecomposedUnicode,
    containsPercentEncoding,
    riskLevel,
    reasons,
  };
}

function buildWorkspacePathClassWarning(input: {
  pathClass: WorkspacePathClass;
  runtimeContext: ReturnType<typeof buildRuntimeContext>;
}): WorkspacePathClassWarning {
  return {
    type: "workspace_path_class_warning",
    severity: "info",
    code: "cloud_codex_non_ascii_workspace_path",
    message:
      "Paperclip detected that this workspace path contains non-ASCII or encoded Unicode characters. Cloud-hosted Codex runs may hit a known websocket metadata issue on this path class and fall back to HTTP. The run will continue normally, but it may be slower or produce noisy diagnostics. If this becomes frequent, consider using an ASCII-only workspace path for cloud Codex runs.",
    pathClass: input.pathClass,
    runtimeContext: input.runtimeContext,
  };
}

async function resolveCloudAuthPresence(
  env: Record<string, string>,
  codexHome: string | null,
): Promise<CloudAuthPresence> {
  if (hasNonEmptyEnvValue(env, "OPENAI_API_KEY")) {
    return {
      hasAuth: true,
      source: "openai_api_key",
      checkedCodexHome: codexHome,
    };
  }

  if (codexHome) {
    const auth = await readCodexAuthInfo(codexHome).catch(() => null);
    if (auth) {
      return {
        hasAuth: true,
        source: "codex_auth_config",
        checkedCodexHome: codexHome,
      };
    }
  }

  return {
    hasAuth: false,
    source: null,
    checkedCodexHome: codexHome,
  };
}

function buildMissingAuthPreflightResult(input: {
  runtimeContext: ReturnType<typeof buildRuntimeContext>;
  authPresence: CloudAuthPresence;
}): AdapterExecutionResult {
  const { runtimeContext, authPresence } = input;
  const message =
    "Cloud-hosted Codex authentication is missing or unavailable. Paperclip did not start Codex execution. Sign in with `codex login` or configure OPENAI_API_KEY, then retry.";
  return {
    exitCode: 1,
    signal: null,
    timedOut: false,
    errorMessage: message,
    errorCode: "missing_auth_preflight",
    errorMeta: {
      errorType: "missing_auth_preflight",
      noExecutionAttempt: true,
      checkedCodexHome: authPresence.checkedCodexHome,
      authSource: authPresence.source,
      runtimeContext,
    },
    provider: runtimeContext.provider,
    biller: runtimeContext.biller,
    model: runtimeContext.model,
    billingType: runtimeContext.billingType,
    costUsd: null,
    resultJson: {
      ok: false,
      errorType: "missing_auth_preflight",
      message,
      noExecutionAttempt: true,
      checkedCodexHome: authPresence.checkedCodexHome,
      authSource: authPresence.source,
      runtimeContext,
    },
    summary: "",
    clearSession: false,
  };
}

async function isLikelyPaperclipRepoRoot(candidate: string): Promise<boolean> {
  const [hasWorkspace, hasPackageJson, hasServerDir, hasAdapterUtilsDir] = await Promise.all([
    pathExists(path.join(candidate, "pnpm-workspace.yaml")),
    pathExists(path.join(candidate, "package.json")),
    pathExists(path.join(candidate, "server")),
    pathExists(path.join(candidate, "packages", "adapter-utils")),
  ]);

  return hasWorkspace && hasPackageJson && hasServerDir && hasAdapterUtilsDir;
}

async function isLikelyPaperclipRuntimeSkillPath(
  candidate: string,
  skillName: string,
  options: { requireSkillMarkdown?: boolean } = {},
): Promise<boolean> {
  if (path.basename(candidate) !== skillName) return false;
  const skillsRoot = path.dirname(candidate);
  if (path.basename(skillsRoot) !== "skills") return false;
  if (options.requireSkillMarkdown !== false && !(await pathExists(path.join(candidate, "SKILL.md")))) {
    return false;
  }

  let cursor = path.dirname(skillsRoot);
  for (let depth = 0; depth < 6; depth += 1) {
    if (await isLikelyPaperclipRepoRoot(cursor)) return true;
    const parent = path.dirname(cursor);
    if (parent === cursor) break;
    cursor = parent;
  }

  return false;
}

async function pruneBrokenUnavailablePaperclipSkillSymlinks(
  skillsHome: string,
  allowedSkillNames: Iterable<string>,
  onLog: AdapterExecutionContext["onLog"],
) {
  const allowed = new Set(Array.from(allowedSkillNames));
  const entries = await fs.readdir(skillsHome, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (allowed.has(entry.name) || !entry.isSymbolicLink()) continue;

    const target = path.join(skillsHome, entry.name);
    const linkedPath = await fs.readlink(target).catch(() => null);
    if (!linkedPath) continue;

    const resolvedLinkedPath = path.resolve(path.dirname(target), linkedPath);
    if (await pathExists(resolvedLinkedPath)) continue;
    if (
      !(await isLikelyPaperclipRuntimeSkillPath(resolvedLinkedPath, entry.name, {
        requireSkillMarkdown: false,
      }))
    ) {
      continue;
    }

    await fs.unlink(target).catch(() => {});
    await onLog(
      "stdout",
      `[paperclip] Removed stale Codex skill "${entry.name}" from ${skillsHome}\n`,
    );
  }
}

function resolveCodexSkillsDir(codexHome: string): string {
  return path.join(codexHome, "skills");
}

function buildPaperclipWebSearchShimSource(): string {
  return [
    "#!/usr/bin/env node",
    'const process = require("node:process");',
    "",
    "function parseArgs(args) {",
    "  let maxResults = Number.parseInt(process.env.PAPERCLIP_WEB_SEARCH_MAX_RESULTS || \"5\", 10);",
    "  let json = false;",
    "  const queryParts = [];",
    "  for (let index = 0; index < args.length; index += 1) {",
    "    const arg = args[index];",
    "    if (arg === \"--json\") {",
    "      json = true;",
    "      continue;",
    "    }",
    "    if (arg === \"--max-results\" || arg === \"--maxResults\" || arg === \"-n\") {",
    "      index += 1;",
    "      maxResults = Number.parseInt(args[index] || \"\", 10);",
    "      continue;",
    "    }",
    "    if (arg.startsWith(\"--max-results=\")) {",
    "      maxResults = Number.parseInt(arg.slice(\"--max-results=\".length), 10);",
    "      continue;",
    "    }",
    "    queryParts.push(arg);",
    "  }",
    "  if (!Number.isFinite(maxResults) || maxResults < 1) maxResults = 5;",
    "  return { query: queryParts.join(\" \").trim(), maxResults: Math.min(Math.floor(maxResults), 10), json };",
    "}",
    "",
    "async function main() {",
    "  const { query, maxResults, json } = parseArgs(process.argv.slice(2));",
    "  if (!query) {",
    "    console.error('Usage: paperclip-web-search \"search query\" [--max-results 5] [--json]');",
    "    process.exit(2);",
    "  }",
    "  const apiUrl = process.env.PAPERCLIP_API_URL || \"http://127.0.0.1:3100\";",
    "  const token = process.env.PAPERCLIP_API_KEY || \"\";",
    "  if (!token) {",
    "    console.error(\"PAPERCLIP_API_KEY is not set; cannot call Paperclip web search.\");",
    "    process.exit(2);",
    "  }",
    "  const endpoint = apiUrl.replace(/\\/+$/, \"\") + \"/api/plugins/tools/execute\";",
    "  const body = {",
    "    tool: \"paperclipai.web-search:web-search\",",
    "    parameters: { query, maxResults },",
    "    runContext: {",
    "      agentId: process.env.PAPERCLIP_AGENT_ID || \"\",",
    "      runId: process.env.PAPERCLIP_RUN_ID || \"\",",
    "      companyId: process.env.PAPERCLIP_COMPANY_ID || \"\",",
    "      projectId: process.env.PAPERCLIP_PROJECT_ID || \"default\",",
    "    },",
    "  };",
    "  const response = await fetch(endpoint, {",
    "    method: \"POST\",",
    "    headers: {",
    "      \"content-type\": \"application/json\",",
    "      authorization: \"Bearer \" + token,",
    "    },",
    "    body: JSON.stringify(body),",
    "  });",
    "  const text = await response.text();",
    "  let payload = null;",
    "  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }",
    "  if (!response.ok) {",
    "    const message = payload && typeof payload.error === \"string\" ? payload.error : text;",
    "    console.error(\"Paperclip web search failed: \" + (message || response.status));",
    "    process.exit(1);",
    "  }",
    "  const content = payload && typeof payload.result?.content === \"string\"",
    "    ? payload.result.content",
    "    : payload && typeof payload.content === \"string\"",
    "      ? payload.content",
    "      : null;",
    "  if (json || typeof content !== \"string\") {",
    "    console.log(JSON.stringify(payload ?? { content: text }, null, 2));",
    "    return;",
    "  }",
    "  console.log(content);",
    "}",
    "",
    "main().catch((error) => {",
    "  console.error(\"Paperclip web search failed: \" + (error && error.message ? error.message : String(error)));",
    "  process.exit(1);",
    "});",
    "",
  ].join("\n");
}

async function ensurePaperclipWebSearchShim(
  codexHome: string,
  onLog: AdapterExecutionContext["onLog"],
): Promise<string | null> {
  const binDir = path.join(codexHome, "paperclip-bin");
  const source = buildPaperclipWebSearchShimSource();
  try {
    await fs.mkdir(binDir, { recursive: true });
    for (const commandName of ["paperclip-web-search", "websearch"]) {
      const commandPath = path.join(binDir, commandName);
      await fs.writeFile(commandPath, source, { encoding: "utf8", mode: 0o755 });
      await fs.chmod(commandPath, 0o755);
    }
    await onLog("stdout", `[paperclip] Installed web search CLI shim in ${binDir}\n`);
    return binDir;
  } catch (err) {
    await onLog(
      "stderr",
      `[paperclip] Failed to install web search CLI shim: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    return null;
  }
}

async function removeCommandBridgedCodexSkillSymlinks(
  skillsHome: string,
  entries: Array<{ runtimeName: string }>,
  onLog: AdapterExecutionContext["onLog"],
) {
  for (const entry of entries) {
    if (!isCodexCommandBridgedSkill(entry)) continue;
    const target = path.join(skillsHome, entry.runtimeName);
    const stat = await fs.lstat(target).catch(() => null);
    if (!stat?.isSymbolicLink()) continue;

    await fs.unlink(target).catch(() => {});
    await onLog(
      "stdout",
      `[paperclip] Removed Codex skill "${entry.runtimeName}" because it is provided as a runtime command bridge.\n`,
    );
  }
}

type EnsureCodexSkillsInjectedOptions = {
  skillsHome?: string;
  skillsEntries?: Array<{ key: string; runtimeName: string; source: string }>;
  desiredSkillNames?: string[];
  linkSkill?: (source: string, target: string) => Promise<void>;
};

export async function ensureCodexSkillsInjected(
  onLog: AdapterExecutionContext["onLog"],
  options: EnsureCodexSkillsInjectedOptions = {},
) {
  const allSkillsEntries = options.skillsEntries ?? await readPaperclipRuntimeSkillEntries({}, __moduleDir);
  const desiredSkillNames =
    options.desiredSkillNames ?? allSkillsEntries.map((entry) => entry.key);
  const desiredSet = new Set(desiredSkillNames);
  const commandBridgedSkillEntries = allSkillsEntries.filter(isCodexCommandBridgedSkill);
  const skillsEntries = allSkillsEntries.filter((entry) => desiredSet.has(entry.key) && !isCodexCommandBridgedSkill(entry));

  const skillsHome = options.skillsHome ?? resolveCodexSkillsDir(resolveSharedCodexHomeDir());
  await fs.mkdir(skillsHome, { recursive: true });
  await removeCommandBridgedCodexSkillSymlinks(skillsHome, commandBridgedSkillEntries, onLog);
  if (skillsEntries.length === 0) return;

  const linkSkill = options.linkSkill;
  for (const entry of skillsEntries) {
    const target = path.join(skillsHome, entry.runtimeName);

    try {
      const existing = await fs.lstat(target).catch(() => null);
      if (existing?.isSymbolicLink()) {
        const linkedPath = await fs.readlink(target).catch(() => null);
        const resolvedLinkedPath = linkedPath
          ? path.resolve(path.dirname(target), linkedPath)
          : null;
        if (
          resolvedLinkedPath &&
          resolvedLinkedPath !== entry.source &&
          (await isLikelyPaperclipRuntimeSkillPath(resolvedLinkedPath, entry.runtimeName))
        ) {
          await fs.unlink(target);
          if (linkSkill) {
            await linkSkill(entry.source, target);
          } else {
            await fs.symlink(entry.source, target);
          }
          await onLog(
            "stdout",
            `[paperclip] Repaired Codex skill "${entry.runtimeName}" into ${skillsHome}\n`,
          );
          continue;
        }
      }

      const result = await ensurePaperclipSkillSymlink(entry.source, target, linkSkill);
      if (result === "skipped") continue;

      await onLog(
        "stdout",
        `[paperclip] ${result === "repaired" ? "Repaired" : "Injected"} Codex skill "${entry.runtimeName}" into ${skillsHome}\n`,
      );
    } catch (err) {
      await onLog(
        "stderr",
        `[paperclip] Failed to inject Codex skill "${entry.key}" into ${skillsHome}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  await pruneBrokenUnavailablePaperclipSkillSymlinks(
    skillsHome,
    skillsEntries.map((entry) => entry.runtimeName),
    onLog,
  );
}

export async function execute(ctx: AdapterExecutionContext): Promise<AdapterExecutionResult> {
  const { runId, agent, runtime, config, context, onLog, onMeta, onSpawn, authToken } = ctx;

  const promptTemplate = asString(
    config.promptTemplate,
    "You are agent {{agent.id}} ({{agent.name}}) running a Paperclip heartbeat. Handle the scoped issue first, use Paperclip issue context before repo exploration, only inspect the workspace when the issue actually requires code or local files, and for simple issue questions do not use update_plan, skill_execute, exec_skill, execute_skill, or process_skill. If current public web information is required, run `paperclip-web-search \"query\" --max-results 5` from the shell; do not attempt a web-search tool call. If the subject is ambiguous, use the issue context to disambiguate it and try refined queries before concluding there is no relevant public information.",
  );
  const command = asString(config.command, "codex");
  const configuredModel = asString(config.model, "");
  const modelReasoningEffort = asString(
    config.modelReasoningEffort,
    asString(config.reasoningEffort, ""),
  );
  const search = asBoolean(config.search, false);
  const bypass = asBoolean(
    config.dangerouslyBypassApprovalsAndSandbox,
    asBoolean(config.dangerouslyBypassSandbox, false),
  );

  const workspaceContext = parseObject(context.paperclipWorkspace);
  const workspaceCwd = asString(workspaceContext.cwd, "");
  const workspaceSource = asString(workspaceContext.source, "");
  const workspaceStrategy = asString(workspaceContext.strategy, "");
  const workspaceId = asString(workspaceContext.workspaceId, "");
  const workspaceRepoUrl = asString(workspaceContext.repoUrl, "");
  const workspaceRepoRef = asString(workspaceContext.repoRef, "");
  const workspaceBranch = asString(workspaceContext.branchName, "");
  const workspaceWorktreePath = asString(workspaceContext.worktreePath, "");
  const agentHome = asString(workspaceContext.agentHome, "");
  const workspaceHints = Array.isArray(context.paperclipWorkspaces)
    ? context.paperclipWorkspaces.filter(
        (value): value is Record<string, unknown> => typeof value === "object" && value !== null,
      )
    : [];
  const runtimeServiceIntents = Array.isArray(context.paperclipRuntimeServiceIntents)
    ? context.paperclipRuntimeServiceIntents.filter(
        (value): value is Record<string, unknown> => typeof value === "object" && value !== null,
      )
    : [];
  const runtimeServices = Array.isArray(context.paperclipRuntimeServices)
    ? context.paperclipRuntimeServices.filter(
        (value): value is Record<string, unknown> => typeof value === "object" && value !== null,
      )
    : [];
  const runtimePrimaryUrl = asString(context.paperclipRuntimePrimaryUrl, "");
  const configuredCwd = asString(config.cwd, "");
  const useConfiguredInsteadOfAgentHome = workspaceSource === "agent_home" && configuredCwd.length > 0;
  const effectiveWorkspaceCwd = useConfiguredInsteadOfAgentHome ? "" : workspaceCwd;
  const cwd = effectiveWorkspaceCwd || configuredCwd || process.cwd();
  const envConfig = parseObject(config.env);
  const extraArgs = (() => {
    const fromExtraArgs = asStringArray(config.extraArgs);
    if (fromExtraArgs.length > 0) return fromExtraArgs;
    return asStringArray(config.args);
  })();
  const providerEnv = Object.fromEntries(
    Object.entries({ ...process.env, ...Object.fromEntries(
      Object.entries(envConfig).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
    ) }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
  const provider = resolveCodexProvider(extraArgs, providerEnv);
  const providerBillingType = resolveCodexBillingType(providerEnv);
  const providerBiller = resolveCodexBiller(providerEnv, providerBillingType);
  const configuredCodexHome =
    typeof envConfig.CODEX_HOME === "string" && envConfig.CODEX_HOME.trim().length > 0
      ? path.resolve(envConfig.CODEX_HOME.trim())
      : null;
  const codexSkillEntries = await readPaperclipRuntimeSkillEntries(config, __moduleDir);
  const desiredSkillNames = resolveCodexDesiredSkillNames(config, codexSkillEntries);
  await ensureAbsoluteDirectory(cwd, { createIfMissing: true });
  const preparedManagedCodexHome =
    configuredCodexHome ? null : await prepareManagedCodexHome(process.env, onLog, agent.companyId, {
      provider,
      model: configuredModel,
      defaultReasoningEffort: modelReasoningEffort || null,
    });
  const defaultCodexHome = resolveManagedCodexHomeDir(process.env, agent.companyId);
  const effectiveCodexHome = configuredCodexHome ?? preparedManagedCodexHome ?? defaultCodexHome;
  await fs.mkdir(effectiveCodexHome, { recursive: true });
  if (configuredCodexHome) {
    await ensureCodexHomeProfile(
      effectiveCodexHome,
      resolveSharedCodexHomeDir(process.env),
      onLog,
      {
        provider,
        model: configuredModel,
        defaultReasoningEffort: modelReasoningEffort || null,
      },
    );
  }
  const requestedModelSignal = await resolveCodexRequestedModelSignal({
    configuredModel,
    codexHome: effectiveCodexHome,
  });
  const runtimeModelInfo = buildRuntimeModelInfo({
    provider,
    requestedModel: requestedModelSignal.requestedModel,
    modelSource: requestedModelSignal.modelSource,
  });
  const localFallbackCandidate = resolveLocalFallbackCandidateFromContext(context);
  const runtimeContext = buildRuntimeContext({
    provider,
    modelInfo: runtimeModelInfo,
    billingType: providerBillingType,
    biller: providerBiller,
    localFallbackCandidate,
  });
  // Inject skills into the same CODEX_HOME that Codex will actually run with
  // (managed home in the default case, or an explicit override from adapter config).
  const codexSkillsDir = resolveCodexSkillsDir(effectiveCodexHome);
  await ensureCodexSkillsInjected(
    onLog,
    {
      skillsHome: codexSkillsDir,
      skillsEntries: codexSkillEntries,
      desiredSkillNames,
    },
  );
  const hasExplicitApiKey =
    typeof envConfig.PAPERCLIP_API_KEY === "string" && envConfig.PAPERCLIP_API_KEY.trim().length > 0;
  const env: Record<string, string> = { ...buildPaperclipEnv(agent) };
  env.CODEX_HOME = effectiveCodexHome;
  env.PAPERCLIP_RUN_ID = runId;
  const wakeTaskId =
    (typeof context.taskId === "string" && context.taskId.trim().length > 0 && context.taskId.trim()) ||
    (typeof context.issueId === "string" && context.issueId.trim().length > 0 && context.issueId.trim()) ||
    null;
  const wakeReason =
    typeof context.wakeReason === "string" && context.wakeReason.trim().length > 0
      ? context.wakeReason.trim()
      : null;
  const wakeCommentId =
    (typeof context.wakeCommentId === "string" && context.wakeCommentId.trim().length > 0 && context.wakeCommentId.trim()) ||
    (typeof context.commentId === "string" && context.commentId.trim().length > 0 && context.commentId.trim()) ||
    null;
  const approvalId =
    typeof context.approvalId === "string" && context.approvalId.trim().length > 0
      ? context.approvalId.trim()
      : null;
  const approvalStatus =
    typeof context.approvalStatus === "string" && context.approvalStatus.trim().length > 0
      ? context.approvalStatus.trim()
      : null;
  const linkedIssueIds = Array.isArray(context.issueIds)
    ? context.issueIds.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const wakePayloadJson = stringifyPaperclipWakePayload(context.paperclipWake);
  if (wakeTaskId) {
    env.PAPERCLIP_TASK_ID = wakeTaskId;
  }
  if (wakeReason) {
    env.PAPERCLIP_WAKE_REASON = wakeReason;
  }
  if (wakeCommentId) {
    env.PAPERCLIP_WAKE_COMMENT_ID = wakeCommentId;
  }
  if (approvalId) {
    env.PAPERCLIP_APPROVAL_ID = approvalId;
  }
  if (approvalStatus) {
    env.PAPERCLIP_APPROVAL_STATUS = approvalStatus;
  }
  if (linkedIssueIds.length > 0) {
    env.PAPERCLIP_LINKED_ISSUE_IDS = linkedIssueIds.join(",");
  }
  if (wakePayloadJson) {
    env.PAPERCLIP_WAKE_PAYLOAD_JSON = wakePayloadJson;
  }
  if (effectiveWorkspaceCwd) {
    env.PAPERCLIP_WORKSPACE_CWD = effectiveWorkspaceCwd;
  }
  if (workspaceSource) {
    env.PAPERCLIP_WORKSPACE_SOURCE = workspaceSource;
  }
  if (workspaceStrategy) {
    env.PAPERCLIP_WORKSPACE_STRATEGY = workspaceStrategy;
  }
  if (workspaceId) {
    env.PAPERCLIP_WORKSPACE_ID = workspaceId;
  }
  if (workspaceRepoUrl) {
    env.PAPERCLIP_WORKSPACE_REPO_URL = workspaceRepoUrl;
  }
  if (workspaceRepoRef) {
    env.PAPERCLIP_WORKSPACE_REPO_REF = workspaceRepoRef;
  }
  if (workspaceBranch) {
    env.PAPERCLIP_WORKSPACE_BRANCH = workspaceBranch;
  }
  if (workspaceWorktreePath) {
    env.PAPERCLIP_WORKSPACE_WORKTREE_PATH = workspaceWorktreePath;
  }
  if (agentHome) {
    env.AGENT_HOME = agentHome;
  }
  if (workspaceHints.length > 0) {
    env.PAPERCLIP_WORKSPACES_JSON = JSON.stringify(workspaceHints);
  }
  if (runtimeServiceIntents.length > 0) {
    env.PAPERCLIP_RUNTIME_SERVICE_INTENTS_JSON = JSON.stringify(runtimeServiceIntents);
  }
  if (runtimeServices.length > 0) {
    env.PAPERCLIP_RUNTIME_SERVICES_JSON = JSON.stringify(runtimeServices);
  }
  if (runtimePrimaryUrl) {
    env.PAPERCLIP_RUNTIME_PRIMARY_URL = runtimePrimaryUrl;
  }
  env.PAPERCLIP_RUNTIME_EXECUTION = runtimeContext.executionRuntime;
  env.PAPERCLIP_RUNTIME_MODEL_HOSTING = runtimeContext.modelHosting;
  env.PAPERCLIP_RUNTIME_PROVIDER = runtimeContext.provider;
  env.PAPERCLIP_RUNTIME_MODEL = runtimeContext.model;
  env.PAPERCLIP_RUNTIME_MODEL_SOURCE = runtimeContext.modelInfo.modelSource;
  env.PAPERCLIP_RUNTIME_MODEL_CONFIDENCE = runtimeContext.modelInfo.confidence;
  env.PAPERCLIP_RUNTIME_BILLER = runtimeContext.biller;
  env.PAPERCLIP_RUNTIME_BILLING_TYPE = runtimeContext.billingType;
  if (runtimeContext.modelInfo.requestedModel) {
    env.PAPERCLIP_RUNTIME_REQUESTED_MODEL = runtimeContext.modelInfo.requestedModel;
  }
  if (runtimeContext.modelInfo.resolvedModel) {
    env.PAPERCLIP_RUNTIME_RESOLVED_MODEL = runtimeContext.modelInfo.resolvedModel;
  }
  if (runtimeContext.modelInfo.reportedModel) {
    env.PAPERCLIP_RUNTIME_REPORTED_MODEL = runtimeContext.modelInfo.reportedModel;
  }
  if (runtimeContext.modelInfo.unknownReason) {
    env.PAPERCLIP_RUNTIME_MODEL_UNKNOWN_REASON = runtimeContext.modelInfo.unknownReason;
  }
  for (const [k, v] of Object.entries(envConfig)) {
    if (typeof v === "string") env[k] = v;
  }
  if (!hasExplicitApiKey && authToken) {
    env.PAPERCLIP_API_KEY = authToken;
  }
  const webSearchShimBinDir = await ensurePaperclipWebSearchShim(effectiveCodexHome, onLog);
  if (webSearchShimBinDir) {
    env.PAPERCLIP_WEB_SEARCH_COMMAND = "paperclip-web-search";
    env.PATH = [
      webSearchShimBinDir,
      path.dirname(process.execPath),
      typeof env.PATH === "string" && env.PATH.length > 0 ? env.PATH : process.env.PATH ?? "",
    ].filter(Boolean).join(path.delimiter);
  }
  const effectiveEnv = Object.fromEntries(
    Object.entries({ ...process.env, ...env }).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  const shouldRequireCloudAuthPreflight =
    runtimeContext.modelHosting === "cloud" && commandLooksLike(command, "codex");
  const cloudAuthPresence = shouldRequireCloudAuthPreflight
    ? await resolveCloudAuthPresence(effectiveEnv, effectiveCodexHome)
    : {
        hasAuth: true,
        source: null,
        checkedCodexHome: effectiveCodexHome,
      };
  const workspacePathClass = classifyWorkspacePath(cwd);
  const workspacePathWarning =
    runtimeContext.modelHosting === "cloud" && workspacePathClass.riskLevel === "medium"
      ? buildWorkspacePathClassWarning({
        pathClass: workspacePathClass,
        runtimeContext,
      })
      : null;
  const billingType = resolveCodexBillingType(effectiveEnv);
  const runtimeEnv = ensurePathInEnv(effectiveEnv);
  await ensureCommandResolvable(command, cwd, runtimeEnv);
  const resolvedCommand = await resolveCommandForLogs(command, cwd, runtimeEnv);
  const loggedEnv = buildInvocationEnvForLogs(env, {
    runtimeEnv,
    includeRuntimeKeys: ["HOME"],
    resolvedCommand,
  });

  const timeoutSec = asNumber(config.timeoutSec, 0);
  const graceSec = asNumber(config.graceSec, 20);

  const runtimeSessionParams = parseObject(runtime.sessionParams);
  const runtimeSessionId = asString(runtimeSessionParams.sessionId, runtime.sessionId ?? "");
  const runtimeSessionCwd = asString(runtimeSessionParams.cwd, "");
  const canResumeSession =
    runtimeSessionId.length > 0 &&
    (runtimeSessionCwd.length === 0 || path.resolve(runtimeSessionCwd) === path.resolve(cwd));
  const sessionId = canResumeSession ? runtimeSessionId : null;
  if (runtimeSessionId && !canResumeSession) {
    await onLog(
      "stdout",
      `[paperclip] Codex session "${runtimeSessionId}" was saved for cwd "${runtimeSessionCwd}" and will not be resumed in "${cwd}".\n`,
    );
  }
  const instructionsFilePath = asString(config.instructionsFilePath, "").trim();
  const instructionsDir = instructionsFilePath ? `${path.dirname(instructionsFilePath)}/` : "";
  let instructionsPrefix = "";
  let instructionsChars = 0;
  if (instructionsFilePath) {
    try {
      const instructionsContents = await fs.readFile(instructionsFilePath, "utf8");
      instructionsPrefix =
        `${instructionsContents}\n\n` +
        `The above agent instructions were loaded from ${instructionsFilePath}. ` +
        `Resolve any relative file references from ${instructionsDir}.\n\n`;
      instructionsChars = instructionsPrefix.length;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await onLog(
        "stdout",
        `[paperclip] Warning: could not read agent instructions file "${instructionsFilePath}": ${reason}\n`,
      );
    }
  }
  const repoAgentsNote =
    "Codex exec automatically applies repo-scoped AGENTS.md instructions from the current workspace; Paperclip does not currently suppress that discovery.";
  const bootstrapPromptTemplate = asString(config.bootstrapPromptTemplate, "");
  const templateData = {
    agentId: agent.id,
    companyId: agent.companyId,
    runId,
    company: { id: agent.companyId },
    agent,
    run: { id: runId, source: "on_demand" },
    context,
  };
  const renderedBootstrapPrompt =
    !sessionId && bootstrapPromptTemplate.trim().length > 0
      ? renderTemplate(bootstrapPromptTemplate, templateData).trim()
      : "";
  const wakePrompt = renderPaperclipWakePrompt(context.paperclipWake, { resumedSession: Boolean(sessionId) });
  const shouldUseResumeDeltaPrompt = Boolean(sessionId) && wakePrompt.length > 0;
  const promptInstructionsPrefix = shouldUseResumeDeltaPrompt ? "" : instructionsPrefix;
  instructionsChars = promptInstructionsPrefix.length;
  const commandNotes = (() => {
    if (!instructionsFilePath) {
      return [repoAgentsNote];
    }
    if (instructionsPrefix.length > 0) {
      if (shouldUseResumeDeltaPrompt) {
        return [
          `Loaded agent instructions from ${instructionsFilePath}`,
          "Skipped stdin instruction reinjection because an existing Codex session is being resumed with a wake delta.",
          repoAgentsNote,
        ];
      }
      return [
        `Loaded agent instructions from ${instructionsFilePath}`,
        `Prepended instructions + path directive to stdin prompt (relative references from ${instructionsDir}).`,
        repoAgentsNote,
      ];
    }
    return [
      `Configured instructionsFilePath ${instructionsFilePath}, but file could not be read; continuing without injected instructions.`,
      repoAgentsNote,
    ];
  })();
  const renderedPrompt = shouldUseResumeDeltaPrompt ? "" : renderTemplate(promptTemplate, templateData);
  const sessionHandoffNote = asString(context.paperclipSessionHandoffMarkdown, "").trim();
  const runtimeContextNote = buildRuntimeContextPromptSection(runtimeContext);
  const runtimeCapabilityNote = PAPERCLIP_WEB_SEARCH_RUNTIME_GUIDANCE;
  const prompt = joinPromptSections([
    promptInstructionsPrefix,
    runtimeContextNote,
    runtimeCapabilityNote,
    renderedBootstrapPrompt,
    wakePrompt,
    sessionHandoffNote,
    renderedPrompt,
  ]);
  const promptMetrics = {
    promptChars: prompt.length,
    instructionsChars,
    runtimeContextChars: runtimeContextNote.length,
    runtimeCapabilityChars: runtimeCapabilityNote.length,
    bootstrapPromptChars: renderedBootstrapPrompt.length,
    wakePromptChars: wakePrompt.length,
    sessionHandoffChars: sessionHandoffNote.length,
    heartbeatPromptChars: renderedPrompt.length,
  };

  if (shouldRequireCloudAuthPreflight && !cloudAuthPresence.hasAuth) {
    await onLog(
      "stdout",
      "[paperclip] Cloud-hosted Codex auth is missing; aborting before Codex execution begins.\n",
    );
    return buildMissingAuthPreflightResult({
      runtimeContext,
      authPresence: cloudAuthPresence,
    });
  }

  if (workspacePathWarning) {
    await onLog(
      "stdout",
      "[paperclip] Warning: this workspace path contains non-ASCII or encoded Unicode characters. Cloud-hosted Codex runs may hit a known websocket metadata issue and fall back to HTTP. The run will continue normally.\n",
    );
  }

  const buildArgs = (resumeSessionId: string | null) => {
    const args = ["exec", "--json"];
    if (search) args.unshift("--search");
    if (bypass) args.push("--dangerously-bypass-approvals-and-sandbox");
    if (configuredModel) args.push("--model", configuredModel);
    if (modelReasoningEffort) args.push("-c", `model_reasoning_effort=${JSON.stringify(modelReasoningEffort)}`);
    if (extraArgs.length > 0) args.push(...extraArgs);
    if (resumeSessionId) args.push("resume", resumeSessionId, "-");
    else args.push("-");
    return args;
  };

  const runAttempt = async (resumeSessionId: string | null) => {
    const args = buildArgs(resumeSessionId);
    if (onMeta) {
      await onMeta({
        adapterType: "codex_local",
        command: resolvedCommand,
        cwd,
        commandNotes,
        commandArgs: args.map((value, idx) => {
          if (idx === args.length - 1 && value !== "-") return `<prompt ${prompt.length} chars>`;
          return value;
        }),
        env: loggedEnv,
        prompt,
        promptMetrics,
        context,
      });
    }

    const proc = await runChildProcess(runId, command, args, {
      cwd,
      env,
      stdin: prompt,
      timeoutSec,
      graceSec,
      onSpawn,
      onLog: async (stream, chunk) => {
        if (stream !== "stderr") {
          await onLog(stream, chunk);
          return;
        }
        const sawThreadPersistenceFailure = hasCodexThreadPersistenceFailure(chunk);
        let cleaned = stripCodexThreadPersistenceFailure(chunk);
        cleaned = stripCodexRolloutNoise(cleaned);
        if (sawThreadPersistenceFailure) {
          await onLog("stdout", paperclipThreadPersistenceWarningLine());
        }
        if (!cleaned.trim()) return;
        await onLog(stream, cleaned);
      },
    });
    const cleanedStderr = stripCodexRolloutNoise(proc.stderr);
    return {
      proc: {
        ...proc,
        stderr: cleanedStderr,
      },
      rawStderr: proc.stderr,
      parsed: parseCodexJsonl(proc.stdout),
    };
  };

  const toResult = (
    attempt: { proc: { exitCode: number | null; signal: string | null; timedOut: boolean; stdout: string; stderr: string }; rawStderr: string; parsed: ReturnType<typeof parseCodexJsonl> },
    clearSessionOnMissingSession = false,
  ): AdapterExecutionResult => {
    if (attempt.proc.timedOut) {
      return {
        exitCode: attempt.proc.exitCode,
        signal: attempt.proc.signal,
        timedOut: true,
        errorMessage: `Timed out after ${timeoutSec}s`,
        clearSession: clearSessionOnMissingSession,
      };
    }

    const invalidateSessionOnPersistenceFailure =
      (attempt.proc.exitCode ?? 0) === 0 &&
      hasCodexThreadPersistenceFailure(attempt.rawStderr);
    const resolvedSessionId = invalidateSessionOnPersistenceFailure
      ? null
      : (attempt.parsed.sessionId ?? runtimeSessionId ?? runtime.sessionId ?? null);
    const resolvedSessionParams = resolvedSessionId
      ? ({
        sessionId: resolvedSessionId,
        cwd,
        ...(workspaceId ? { workspaceId } : {}),
        ...(workspaceRepoUrl ? { repoUrl: workspaceRepoUrl } : {}),
        ...(workspaceRepoRef ? { repoRef: workspaceRepoRef } : {}),
      } as Record<string, unknown>)
      : null;
    const parsedError = typeof attempt.parsed.errorMessage === "string" ? attempt.parsed.errorMessage.trim() : "";
    const stderrLine = firstNonEmptyLine(attempt.proc.stderr);
    const fallbackErrorMessage =
      parsedError ||
      stderrLine ||
      `Codex exited with code ${attempt.proc.exitCode ?? -1}`;
    const persistedStderr = invalidateSessionOnPersistenceFailure
      ? stripCodexThreadPersistenceFailure(attempt.proc.stderr).trim()
      : attempt.proc.stderr;

    return {
      exitCode: attempt.proc.exitCode,
      signal: attempt.proc.signal,
      timedOut: false,
      errorMessage:
        (attempt.proc.exitCode ?? 0) === 0
          ? null
          : fallbackErrorMessage,
      usage: attempt.parsed.usage,
      sessionId: resolvedSessionId,
      sessionParams: resolvedSessionParams,
      sessionDisplayId: resolvedSessionId,
      provider,
      biller: providerBiller,
      model: runtimeContext.model,
      billingType,
      costUsd: null,
      resultJson: {
        stdout: attempt.proc.stdout,
        stderr: persistedStderr,
        runtimeContext,
        ...(workspacePathWarning ? { warnings: [workspacePathWarning] } : {}),
      },
      summary: attempt.parsed.summary,
      clearSession: Boolean(
        invalidateSessionOnPersistenceFailure ||
        (clearSessionOnMissingSession && !resolvedSessionId),
      ),
    };
  };

  const initial = await runAttempt(sessionId);
  if (
    sessionId &&
    !initial.proc.timedOut &&
    (initial.proc.exitCode ?? 0) !== 0 &&
    isCodexUnknownSessionError(initial.proc.stdout, initial.rawStderr)
  ) {
    await onLog(
      "stdout",
      `[paperclip] Codex resume session "${sessionId}" is unavailable; retrying with a fresh session.\n`,
    );
    const retry = await runAttempt(null);
    return toResult(retry, true);
  }

  return toResult(initial);
}
