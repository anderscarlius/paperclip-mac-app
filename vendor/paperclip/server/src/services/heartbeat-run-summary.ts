function truncateSummaryText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

function readNumericField(record: Record<string, unknown>, key: string) {
  return key in record ? record[key] ?? null : undefined;
}

function readCommentText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStringArray(value: unknown, maxItems = 5) {
  if (!Array.isArray(value)) return [];
  const items: string[] = [];
  for (const entry of value) {
    const text = truncateSummaryText(entry, 280);
    if (!text) continue;
    items.push(text.trim());
    if (items.length >= maxItems) break;
  }
  return items;
}

function summarizeLocalFallbackCandidate(resultJson: Record<string, unknown>) {
  const runtimeDiagnostics = asRecord(resultJson.runtimeDiagnostics);
  const runtimeContext = asRecord(resultJson.runtimeContext);
  const candidate =
    asRecord(runtimeDiagnostics?.localFallbackCandidate)
    ?? asRecord(runtimeContext?.localFallbackCandidate)
    ?? asRecord(resultJson.localFallbackCandidate);
  if (!candidate) return null;
  if (candidate.schemaVersion !== 1) return null;
  if (readNonEmptyString(candidate.candidateType) !== "local_fallback_offer") return null;

  const decision = readNonEmptyString(candidate.decision);
  if (!decision || !["eligible", "diagnostic_only", "not_eligible", "not_available"].includes(decision)) {
    return null;
  }
  const source = readNonEmptyString(candidate.source);
  if (
    !source
    || !["explicit_task_metadata", "operator_handshake", "runtime_diagnostics", "lab_fixture", "not_available"].includes(source)
  ) {
    return null;
  }
  const model = readNonEmptyString(candidate.model);
  const runtime = readNonEmptyString(candidate.runtime);
  const confidence = readNonEmptyString(candidate.confidence);
  if (model !== "gemma4:e4b" || runtime !== "ollama" || !confidence) return null;
  if (candidate.routingEnabled !== false || candidate.automaticRoutingEnabled !== false) return null;
  if (readNonEmptyString(candidate.recommendedFallback) !== "stronger_model") return null;
  if (typeof candidate.available !== "boolean") return null;

  const taskClass = readNonEmptyString(candidate.taskClass);
  const eligibleReasons = readStringArray(candidate.eligibleReasons, 3);
  const ineligibleReasons = readStringArray(candidate.ineligibleReasons, 3);

  return {
    schemaVersion: 1,
    candidateType: "local_fallback_offer",
    available: candidate.available,
    decision,
    source,
    ...(taskClass ? { taskClass } : {}),
    confidence,
    model,
    runtime,
    routingEnabled: false,
    automaticRoutingEnabled: false,
    privacyBenefit: candidate.privacyBenefit === true,
    qualityWarning:
      readNonEmptyString(candidate.qualityWarning)
      ?? "Local result may be less capable than cloud.",
    eligibleReasons,
    ineligibleReasons,
    recommendedFallback: "stronger_model",
    actions: ["run_locally", "use_stronger_model", "cancel"],
  };
}

function summarizeRuntimeDiagnostics(resultJson: Record<string, unknown>) {
  const runtimeDiagnostics = asRecord(resultJson.runtimeDiagnostics);
  const runtimeContext = asRecord(resultJson.runtimeContext);
  const modelInfo = asRecord(runtimeDiagnostics?.modelInfo) ?? asRecord(runtimeContext?.modelInfo);
  const diagnostics: Record<string, unknown> = {};

  const provider = readNonEmptyString(runtimeDiagnostics?.provider) ?? readNonEmptyString(runtimeContext?.provider);
  if (provider) diagnostics.provider = provider;

  const modelHosting = readNonEmptyString(runtimeDiagnostics?.modelHosting) ?? readNonEmptyString(runtimeContext?.modelHosting);
  if (modelHosting) diagnostics.modelHosting = modelHosting;

  const requestedModel =
    readNonEmptyString(runtimeDiagnostics?.requestedModel)
    ?? readNonEmptyString(modelInfo?.requestedModel);
  if (requestedModel) diagnostics.requestedModel = requestedModel;

  const resolvedModelCandidate =
    readNonEmptyString(runtimeDiagnostics?.resolvedModel)
    ?? readNonEmptyString(modelInfo?.resolvedModel)
    ?? readNonEmptyString(modelInfo?.reportedModel)
    ?? readNonEmptyString(runtimeContext?.model);
  if (resolvedModelCandidate && resolvedModelCandidate !== "unknown") {
    diagnostics.resolvedModel = resolvedModelCandidate;
  }

  const reportedModel =
    readNonEmptyString(runtimeDiagnostics?.reportedModel)
    ?? readNonEmptyString(modelInfo?.reportedModel);
  if (reportedModel) diagnostics.reportedModel = reportedModel;

  const modelSource =
    readNonEmptyString(runtimeDiagnostics?.modelSource)
    ?? readNonEmptyString(modelInfo?.modelSource);
  if (modelSource) diagnostics.modelSource = modelSource;

  const confidence =
    readNonEmptyString(runtimeDiagnostics?.confidence)
    ?? readNonEmptyString(modelInfo?.confidence);
  if (confidence) diagnostics.confidence = confidence;

  const unknownReason =
    readNonEmptyString(runtimeDiagnostics?.unknownReason)
    ?? readNonEmptyString(modelInfo?.unknownReason);
  if (unknownReason) diagnostics.unknownReason = unknownReason;

  const localFallbackCandidate = summarizeLocalFallbackCandidate(resultJson);
  if (localFallbackCandidate) diagnostics.localFallbackCandidate = localFallbackCandidate;

  return Object.keys(diagnostics).length > 0 ? diagnostics : null;
}

export function enrichHeartbeatRunResultJson(
  resultJson: Record<string, unknown> | null | undefined,
  fields: {
    summary?: string | null;
    message?: string | null;
    error?: string | null;
    costUsd?: number | null;
  } = {},
): Record<string, unknown> | null {
  const summary = readCommentText(fields.summary);
  const message = readCommentText(fields.message);
  const error = readCommentText(fields.error);
  const costUsd = typeof fields.costUsd === "number" && Number.isFinite(fields.costUsd)
    ? fields.costUsd
    : null;

  const base =
    resultJson && typeof resultJson === "object" && !Array.isArray(resultJson)
      ? { ...resultJson }
      : {};

  if (summary && readCommentText(base.summary) == null) {
    base.summary = summary;
  }
  if (message && readCommentText(base.message) == null) {
    base.message = message;
  }
  if (error && readCommentText(base.error) == null) {
    base.error = error;
  }
  if (costUsd != null) {
    if (base.costUsd == null) {
      base.costUsd = costUsd;
    }
    if (base.cost_usd == null) {
      base.cost_usd = costUsd;
    }
  }

  return Object.keys(base).length > 0 ? base : null;
}

export function summarizeHeartbeatRunResultJson(
  resultJson: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!resultJson || typeof resultJson !== "object" || Array.isArray(resultJson)) {
    return null;
  }

  const summary: Record<string, unknown> = {};
  const textFields = ["summary", "result", "message", "error"] as const;
  for (const key of textFields) {
    const value = truncateSummaryText(resultJson[key]);
    if (value !== null) {
      summary[key] = value;
    }
  }

  const numericFieldAliases = ["total_cost_usd", "cost_usd", "costUsd"] as const;
  for (const key of numericFieldAliases) {
    const value = readNumericField(resultJson, key);
    if (value !== undefined && value !== null) {
      summary[key] = value;
    }
  }

  const warnings = readStringArray(resultJson.warnings);
  if (warnings.length > 0) {
    summary.warnings = warnings;
  }

  const runtimeDiagnostics = summarizeRuntimeDiagnostics(resultJson);
  if (runtimeDiagnostics) {
    summary.runtimeDiagnostics = runtimeDiagnostics;
  }

  return Object.keys(summary).length > 0 ? summary : null;
}

export function buildHeartbeatRunIssueComment(
  resultJson: Record<string, unknown> | null | undefined,
): string | null {
  if (!resultJson || typeof resultJson !== "object" || Array.isArray(resultJson)) {
    return null;
  }

  return (
    readCommentText(resultJson.summary)
    ?? readCommentText(resultJson.result)
    ?? readCommentText(resultJson.message)
    ?? null
  );
}
