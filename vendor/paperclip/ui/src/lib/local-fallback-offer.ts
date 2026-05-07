export type LocalFallbackOfferAction =
  | "run_locally"
  | "use_stronger_model"
  | "cancel";

export type LocalFallbackTaskClass =
  | "local_short_summary"
  | "local_small_code_explanation"
  | "local_short_policy_text";

export type LocalFallbackCandidateDecision =
  | "eligible"
  | "diagnostic_only"
  | "not_eligible"
  | "not_available";

export type LocalFallbackCandidateSource =
  | "explicit_task_metadata"
  | "operator_handshake"
  | "runtime_diagnostics"
  | "lab_fixture"
  | "not_available";

export type LocalFallbackCandidateSignal = {
  schemaVersion: 1;
  candidateType: "local_fallback_offer";
  available: boolean;
  decision: LocalFallbackCandidateDecision;
  source: LocalFallbackCandidateSource;
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStringArray(value: unknown, maxItems = 5): string[] {
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

function isTaskClass(value: unknown): value is LocalFallbackTaskClass {
  return value === "local_short_summary"
    || value === "local_small_code_explanation"
    || value === "local_short_policy_text";
}

function isDecision(value: unknown): value is LocalFallbackCandidateDecision {
  return value === "eligible"
    || value === "diagnostic_only"
    || value === "not_eligible"
    || value === "not_available";
}

function isSource(value: unknown): value is LocalFallbackCandidateSource {
  return value === "explicit_task_metadata"
    || value === "operator_handshake"
    || value === "runtime_diagnostics"
    || value === "lab_fixture"
    || value === "not_available";
}

function isConfidence(value: unknown): value is LocalFallbackCandidateSignal["confidence"] {
  return value === "medium" || value === "low";
}

function normalizeLocalFallbackCandidateSignal(value: unknown): LocalFallbackCandidateSignal | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.schemaVersion !== 1) return null;
  if (record.candidateType !== "local_fallback_offer") return null;
  if (typeof record.available !== "boolean") return null;
  if (!isDecision(record.decision)) return null;
  if (!isSource(record.source)) return null;
  if (!isConfidence(record.confidence)) return null;
  if (record.model !== "gemma4:e4b") return null;
  if (record.runtime !== "ollama") return null;
  if (record.routingEnabled !== false) return null;
  if (record.automaticRoutingEnabled !== false) return null;
  if (record.recommendedFallback !== "stronger_model") return null;

  const taskClass = isTaskClass(record.taskClass) ? record.taskClass : undefined;
  if (record.decision === "eligible" && !taskClass) return null;
  if (record.decision === "not_available" && record.available !== false) return null;
  if (record.decision !== "not_available" && record.available !== true) return null;

  return {
    schemaVersion: 1,
    candidateType: "local_fallback_offer",
    available: record.available,
    decision: record.decision,
    source: record.source,
    taskClass,
    confidence: record.confidence,
    model: "gemma4:e4b",
    runtime: "ollama",
    routingEnabled: false,
    automaticRoutingEnabled: false,
    privacyBenefit: Boolean(record.privacyBenefit),
    qualityWarning: asNonEmptyString(record.qualityWarning) ?? "Local result may be less capable than cloud.",
    eligibleReasons: readStringArray(record.eligibleReasons),
    ineligibleReasons: readStringArray(record.ineligibleReasons),
    recommendedFallback: "stronger_model",
    actions: ["run_locally", "use_stronger_model", "cancel"],
  };
}

export function readLocalFallbackCandidateSignal(
  resultJson: Record<string, unknown> | null,
): LocalFallbackCandidateSignal | null {
  if (!resultJson) return null;
  const runtimeDiagnostics = asRecord(resultJson.runtimeDiagnostics);
  const runtimeContext = asRecord(resultJson.runtimeContext);
  return normalizeLocalFallbackCandidateSignal(
    runtimeDiagnostics?.localFallbackCandidate
      ?? runtimeContext?.localFallbackCandidate
      ?? resultJson.localFallbackCandidate,
  );
}

export function getLabLocalFallbackCandidateSignal({
  hasRuntimeDiagnostics,
  taskClass,
}: {
  hasRuntimeDiagnostics: boolean;
  taskClass?: LocalFallbackTaskClass;
}): LocalFallbackCandidateSignal | null {
  if (!hasRuntimeDiagnostics) return null;

  return {
    schemaVersion: 1,
    candidateType: "local_fallback_offer",
    available: true,
    decision: taskClass ? "eligible" : "diagnostic_only",
    source: "lab_fixture",
    taskClass,
    confidence: "medium",
    model: "gemma4:e4b",
    runtime: "ollama",
    routingEnabled: false,
    automaticRoutingEnabled: false,
    privacyBenefit: true,
    qualityWarning: "Local result may be less capable than cloud.",
    eligibleReasons: taskClass
      ? [
          "Local fallback is available in the current lab environment.",
          "The selected task class is within the narrow candidate policy.",
        ]
      : [
          "Local fallback is available in the current lab environment.",
        ],
    ineligibleReasons: taskClass
      ? []
      : [
          "This run has not been classified as one of the narrow eligible local task classes yet.",
        ],
    recommendedFallback: "stronger_model",
    actions: ["run_locally", "use_stronger_model", "cancel"],
  };
}

export function isLocalFallbackEligibleSignal(signal: LocalFallbackCandidateSignal | null): boolean {
  return signal?.decision === "eligible";
}

export function isLocalFallbackDiagnosticOnlySignal(signal: LocalFallbackCandidateSignal | null): boolean {
  return signal?.decision === "diagnostic_only";
}

export function isLocalFallbackNotEligibleSignal(signal: LocalFallbackCandidateSignal | null): boolean {
  return signal?.decision === "not_eligible";
}

export function localFallbackOfferPrototypeMessage(action: LocalFallbackOfferAction | null): string | null {
  switch (action) {
    case "run_locally":
      return "Prototype only. UI execution is not wired yet. Use operator tooling or the handshake flow for a manual local run.";
    case "use_stronger_model":
      return "Prototype only. Stronger-model fallback remains the normal path for this task.";
    case "cancel":
      return "Offer dismissed for this view only.";
    default:
      return null;
  }
}
