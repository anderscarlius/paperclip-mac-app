import { useMemo, useState } from "react";
import type { HeartbeatRun } from "@paperclipai/shared";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { analyzeWorkspaceApi } from "@/api/analyze-workspace";
import { healthApi, type HealthStatus } from "@/api/health";
import { heartbeatsApi } from "@/api/heartbeats";
import { useCompany } from "@/context/CompanyContext";
import { readLocalFallbackCandidateSignal } from "@/lib/local-fallback-offer";
import { queryKeys } from "@/lib/queryKeys";
import {
  buildAnalyzeWorkspaceFlowSteps,
  buildAnalyzeWorkspaceResultFromMetadata,
  buildReadmeExcerptRequest,
  collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries,
  findReadmeCandidatesFromSnapshot,
  prepareAnalyzeWorkspaceHandoff,
  buildAnalyzeWorkspaceSetupState,
  buildSetupHealthViewModel,
  mockSetupHealthStates,
  setupHealthOverallStatusLabel,
  setupHealthStatusLabel,
  type AnalyzeWorkspaceCollectionResult,
  type AnalyzeWorkspaceHandoffResult,
  type AnalyzeWorkspaceReadmeExcerpt,
  type AnalyzeWorkspaceResult,
  type AnalyzeWorkspaceResultValidationResult,
  type AnalyzeWorkspaceSetupState,
  type SetupHealthCard,
  type SetupHealthDiagnostics,
  type SetupHealthSeverity,
  validateAnalyzeWorkspaceResult,
} from "@/lib/setup-health";
import { cn } from "@/lib/utils";

type MockStateId = (typeof mockSetupHealthStates)[number]["id"];
type ViewMode = "diagnostics" | "mock";
type AnalyzeFlowState = "closed" | "confirm" | "ready" | "prepared" | "collected";
type MetadataPreviewSource = "live" | "example";

const MOCK_METADATA_ENTRIES: Record<MockStateId, Array<{ name: string; kind: "file" | "directory" | "unknown" }>> = {
  needs_attention: [],
  workspace_warning: [
    { name: "README.md", kind: "file" },
    { name: "package.json", kind: "file" },
    { name: ".env", kind: "file" },
    { name: "src", kind: "directory" },
    { name: "node_modules", kind: "directory" },
    { name: ".git", kind: "directory" },
  ],
  ready: [
    { name: "README.md", kind: "file" },
    { name: "Package.swift", kind: "file" },
    { name: "Sources", kind: "directory" },
    { name: "Tests", kind: "directory" },
    { name: "docs", kind: "directory" },
  ],
  ready_no_readme: [
    { name: "Package.swift", kind: "file" },
    { name: "Sources", kind: "directory" },
    { name: "Tests", kind: "directory" },
    { name: "docs", kind: "directory" },
  ],
};
const MOCK_README_EXCERPTS: Record<MockStateId, string | null> = {
  needs_attention: null,
  workspace_warning: "# Paperclip Demo\n\nA lightweight Mac app for safe AI workspace analysis.\n",
  ready: "# Paperclip App\n\nA Swift workspace for the Paperclip desktop application.\n",
  ready_no_readme: null,
};

function severityBadgeVariant(severity: SetupHealthSeverity): "default" | "secondary" | "outline" | "destructive" {
  switch (severity) {
    case "success":
      return "default";
    case "info":
      return "secondary";
    case "warning":
      return "outline";
    case "error":
      return "destructive";
  }
}

function overallToneClasses(overallStatus: "ready_to_start" | "needs_attention" | "optional_improvements_available") {
  switch (overallStatus) {
    case "ready_to_start":
      return "border-emerald-500/30 bg-emerald-500/5";
    case "needs_attention":
      return "border-destructive/30 bg-destructive/5";
    case "optional_improvements_available":
      return "border-amber-500/30 bg-amber-500/5";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function pickLatestRun(runs: HeartbeatRun[] | undefined): HeartbeatRun | null {
  if (!runs || runs.length === 0) return null;

  return [...runs].sort((left, right) => {
    const leftTimestamp = new Date(
      left.finishedAt ?? left.startedAt ?? left.createdAt,
    ).getTime();
    const rightTimestamp = new Date(
      right.finishedAt ?? right.startedAt ?? right.createdAt,
    ).getTime();
    return rightTimestamp - leftTimestamp;
  })[0] ?? null;
}

function readRunDiagnostics(run: HeartbeatRun | null): SetupHealthDiagnostics {
  if (!run?.resultJson) {
    return {
      runtime: {
        lastRunStatus: "unknown",
        warnings: [],
        diagnosticsAvailable: false,
      },
    };
  }

  const resultJson = run.resultJson;
  const runtimeDiagnostics = asRecord(resultJson.runtimeDiagnostics);
  const runtimeContext = asRecord(resultJson.runtimeContext);
  const modelInfo = asRecord(runtimeDiagnostics?.modelInfo) ?? asRecord(runtimeContext?.modelInfo);
  const localFallbackCandidate = readLocalFallbackCandidateSignal(resultJson);
  const warningMessages = readStringArray(resultJson.warnings);
  const modelHosting = asNonEmptyString(runtimeDiagnostics?.modelHosting) ?? asNonEmptyString(runtimeContext?.modelHosting);

  let localAiStatus: "available_candidate" | "available" | "optional" | "unavailable" | "unknown" = "unknown";
  if (localFallbackCandidate?.available) {
    localAiStatus = "available_candidate";
  } else if (modelHosting === "local") {
    localAiStatus = "available";
  } else if (localFallbackCandidate?.decision === "not_available") {
    localAiStatus = "unavailable";
  }

  const resolvedModelCandidate =
    asNonEmptyString(runtimeDiagnostics?.resolvedModel)
    ?? asNonEmptyString(modelInfo?.resolvedModel)
    ?? asNonEmptyString(modelInfo?.reportedModel)
    ?? asNonEmptyString(runtimeContext?.model);

  return {
    cloudAi: {
      provider: asNonEmptyString(runtimeDiagnostics?.provider) ?? asNonEmptyString(runtimeContext?.provider),
      modelHosting: modelHosting === "cloud" || modelHosting === "local" ? modelHosting : "unknown",
      model: resolvedModelCandidate,
      modelInfo: {
        requestedModel:
          asNonEmptyString(runtimeDiagnostics?.requestedModel)
          ?? asNonEmptyString(modelInfo?.requestedModel),
        resolvedModel: resolvedModelCandidate,
        reportedModel:
          asNonEmptyString(runtimeDiagnostics?.reportedModel)
          ?? asNonEmptyString(modelInfo?.reportedModel),
        modelSource:
          asNonEmptyString(runtimeDiagnostics?.modelSource)
          ?? asNonEmptyString(modelInfo?.modelSource),
        confidence:
          asNonEmptyString(runtimeDiagnostics?.confidence)
          ?? asNonEmptyString(modelInfo?.confidence),
        unknownReason:
          asNonEmptyString(runtimeDiagnostics?.unknownReason)
          ?? asNonEmptyString(modelInfo?.unknownReason),
      },
    },
    localAi: {
      status: localAiStatus,
      runtime: localFallbackCandidate?.runtime ?? (modelHosting === "local" ? "ollama" : null),
      model: localFallbackCandidate?.model ?? (modelHosting === "local" ? resolvedModelCandidate : null),
      confidence: localFallbackCandidate?.confidence ?? "unknown",
      routingEnabled: localFallbackCandidate?.routingEnabled,
    },
    runtime: {
      lastRunStatus:
        run.status === "succeeded"
          ? "success"
          : run.status === "failed" || run.status === "cancelled" || run.status === "timed_out"
            ? "failed"
            : "unknown",
      warnings: warningMessages.map((message) => ({ message, severity: "warning" })),
      diagnosticsAvailable:
        runtimeDiagnostics !== null
        || runtimeContext !== null
        || warningMessages.length > 0,
    },
  };
}

function buildDiagnosticsFromSources({
  health,
  latestRun,
}: {
  health: HealthStatus | undefined;
  latestRun: HeartbeatRun | null;
}): SetupHealthDiagnostics | undefined {
  if (!health && !latestRun) return undefined;

  const runDiagnostics = readRunDiagnostics(latestRun);
  const modelHosting = runDiagnostics.cloudAi?.modelHosting;
  const inferredAuthStatus =
    modelHosting === "cloud"
      ? "connected"
      : health?.authReady === true
        ? "connected"
        : health?.authReady === false
          ? "missing"
          : "unknown";

  return {
    cloudAi: {
      authStatus: inferredAuthStatus,
      provider: runDiagnostics.cloudAi?.provider ?? null,
      modelHosting: modelHosting ?? "unknown",
      model: runDiagnostics.cloudAi?.model ?? null,
      modelInfo: runDiagnostics.cloudAi?.modelInfo ?? null,
    },
    localAi: runDiagnostics.localAi,
    workspace: undefined,
    developerTools: undefined,
    runtime: {
      lastRunStatus: runDiagnostics.runtime?.lastRunStatus ?? "unknown",
      warnings: runDiagnostics.runtime?.warnings ?? [],
      diagnosticsAvailable:
        Boolean(health)
        || runDiagnostics.runtime?.diagnosticsAvailable === true,
    },
  };
}

function StatusPill({
  status,
  severity,
}: {
  status: SetupHealthCard["status"];
  severity: SetupHealthSeverity;
}) {
  return (
    <Badge variant={severityBadgeVariant(severity)}>
      {setupHealthStatusLabel(status)}
    </Badge>
  );
}

function SetupHealthCardView({
  card,
  onAction,
}: {
  card: SetupHealthCard;
  onAction: (label: string) => void;
}) {
  return (
    <Card className="gap-4 py-5">
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <CardTitle>{card.title}</CardTitle>
            <StatusPill status={card.status} severity={card.severity} />
          </div>
          <CardAction className="self-start" />
        </div>
        <CardDescription>{card.summary}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {card.primaryAction || card.secondaryAction ? (
          <div className="flex flex-wrap gap-2">
            {card.primaryAction ? (
              <Button size="sm" onClick={() => onAction(card.primaryAction!.label)}>
                {card.primaryAction.label}
              </Button>
            ) : null}
            {card.secondaryAction ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAction(card.secondaryAction!.label)}
              >
                {card.secondaryAction.label}
              </Button>
            ) : null}
          </div>
        ) : null}

        <Collapsible>
          <div className="flex flex-col gap-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start px-0 text-muted-foreground hover:text-foreground"
              >
                Advanced details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="flex flex-col gap-3">
              {card.advancedDetails.map((detail) => (
                <div key={`${card.id}-${detail.label}`} className="flex flex-col gap-1">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {detail.label}
                  </div>
                  <div className="text-sm">{detail.value}</div>
                  {detail.helpText ? (
                    <div className="text-xs text-muted-foreground">{detail.helpText}</div>
                  ) : null}
                </div>
              ))}
            </CollapsibleContent>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

function liveDiagnosticsNote({
  diagnostics,
  isHealthLoading,
  areRunsLoading,
  selectedCompanyId,
}: {
  diagnostics: SetupHealthDiagnostics | undefined;
  isHealthLoading: boolean;
  areRunsLoading: boolean;
  selectedCompanyId: string | null;
}): string {
  if (isHealthLoading || areRunsLoading) {
    return "Loading live diagnostics where available.";
  }

  if (!diagnostics) {
    return "Live diagnostics are not available yet, so Paperclip is showing safe fallback states.";
  }

  if (!selectedCompanyId) {
    return "Using live app health. Recent run diagnostics will appear after a company is selected.";
  }

  return "Using live app health and recent run diagnostics where available.";
}

export function SetupHealth() {
  const { selectedCompanyId } = useCompany();
  const [viewMode, setViewMode] = useState<ViewMode>("diagnostics");
  const [selectedState, setSelectedState] = useState<MockStateId>("workspace_warning");
  const [selectedActionMessage, setSelectedActionMessage] = useState<string | null>(null);
  const [analyzeFlowState, setAnalyzeFlowState] = useState<AnalyzeFlowState>("closed");
  const [metadataCollectionResult, setMetadataCollectionResult] = useState<AnalyzeWorkspaceCollectionResult | null>(null);
  const [metadataPreviewSource, setMetadataPreviewSource] = useState<MetadataPreviewSource | null>(null);
  const [isCollectingMetadata, setIsCollectingMetadata] = useState(false);
  const [readmeExcerpt, setReadmeExcerpt] = useState<AnalyzeWorkspaceReadmeExcerpt | null>(null);
  const [isReadingReadme, setIsReadingReadme] = useState(false);

  const { data: health, isLoading: isHealthLoading } = useQuery({
    queryKey: queryKeys.health,
    queryFn: () => healthApi.get(),
  });

  const { data: runs, isLoading: areRunsLoading } = useQuery({
    queryKey: queryKeys.heartbeats(selectedCompanyId ?? "__none__"),
    queryFn: () => heartbeatsApi.list(selectedCompanyId!, undefined, 10),
    enabled: Boolean(selectedCompanyId),
  });

  const diagnostics = useMemo(
    () => buildDiagnosticsFromSources({ health, latestRun: pickLatestRun(runs) }),
    [health, runs],
  );
  const activeMockState = useMemo(
    () => mockSetupHealthStates.find((state) => state.id === selectedState) ?? mockSetupHealthStates[0],
    [selectedState],
  );
  const displayedDiagnostics = viewMode === "diagnostics" ? (diagnostics ?? {}) : activeMockState.diagnostics;

  const viewModel = useMemo(() => {
    if (viewMode === "diagnostics") {
      return buildSetupHealthViewModel(diagnostics);
    }
    return activeMockState.viewModel;
  }, [activeMockState, diagnostics, viewMode]);
  const analyzeSetupState = useMemo<AnalyzeWorkspaceSetupState>(
    () => buildAnalyzeWorkspaceSetupState(displayedDiagnostics),
    [displayedDiagnostics],
  );
  const analyzeHandoffResult = useMemo<AnalyzeWorkspaceHandoffResult>(
    () => prepareAnalyzeWorkspaceHandoff(analyzeSetupState.request),
    [analyzeSetupState.request],
  );
  const firstWorkspaceResult = useMemo<AnalyzeWorkspaceResult | null>(() => {
    if (!metadataCollectionResult?.ok || !analyzeSetupState.request) return null;
    return buildAnalyzeWorkspaceResultFromMetadata({
      request: analyzeSetupState.request,
      snapshot: metadataCollectionResult.snapshot,
      readmeExcerpt,
    });
  }, [analyzeSetupState.request, metadataCollectionResult, readmeExcerpt]);
  const firstWorkspaceResultValidation = useMemo<AnalyzeWorkspaceResultValidationResult | null>(() => {
    if (!firstWorkspaceResult) return null;
    return validateAnalyzeWorkspaceResult(firstWorkspaceResult);
  }, [firstWorkspaceResult]);
  const readmeCandidates = useMemo(
    () => metadataCollectionResult?.ok ? findReadmeCandidatesFromSnapshot(metadataCollectionResult.snapshot) : [],
    [metadataCollectionResult],
  );
  const analyzeFlowSteps = useMemo(
    () => buildAnalyzeWorkspaceFlowSteps({
      confirmationOpen: analyzeFlowState === "confirm" || analyzeFlowState === "ready" || analyzeFlowState === "prepared" || analyzeFlowState === "collected",
      requestPrepared: analyzeFlowState === "prepared" || analyzeFlowState === "collected",
      metadataCollected: analyzeFlowState === "collected" && metadataCollectionResult?.ok === true,
      firstResultAvailable: firstWorkspaceResult !== null,
      readmeCandidateAvailable: readmeCandidates.length > 0,
      readmeExcerptRead: readmeExcerpt !== null,
    }),
    [analyzeFlowState, firstWorkspaceResult, metadataCollectionResult, readmeCandidates.length, readmeExcerpt],
  );

  const sourceNote = useMemo(() => {
    if (viewMode === "mock") {
      return "Previewing mock states with local scenario data only.";
    }

    return liveDiagnosticsNote({
      diagnostics,
      isHealthLoading,
      areRunsLoading,
      selectedCompanyId,
    });
  }, [areRunsLoading, diagnostics, isHealthLoading, selectedCompanyId, viewMode]);

  const workspaceCard = useMemo(
    () => viewModel.cards.find((card) => card.id === "workspace") ?? null,
    [viewModel.cards],
  );
  const workspacePath = workspaceCard?.advancedDetails.find((detail) => detail.label === "Selected path")?.value ?? null;
  const workspaceName = workspaceCard?.advancedDetails.find((detail) => detail.label === "Workspace")?.value ?? null;
  const analyzeHelperCopy = useMemo(() => {
    if (viewModel.primaryAction.disabled) {
      return "Choose a workspace before starting.";
    }
    if (workspaceCard?.status === "warning") {
      return "Workspace selected with a path warning. Read-only analysis can still continue.";
    }
    if (workspaceCard?.status === "ready") {
      return "Workspace selected and ready for a read-only first analysis.";
    }
    if (workspaceCard?.status === "unknown") {
      return "Workspace selected. Path health is still being confirmed.";
    }
    return null;
  }, [viewModel.primaryAction.disabled, workspaceCard?.status]);
  const analyzePreviewMessage = useMemo(() => {
    if (workspaceCard?.status === "warning") {
      return "Ready to analyze this workspace. This path has a warning, but read-only analysis can continue.";
    }
    return "Ready to analyze this workspace. The first analysis will be read-only and will not modify files.";
  }, [workspaceCard?.status]);

  async function handleCollectLimitedMetadata() {
    if (!analyzeSetupState.request) return;

    setIsCollectingMetadata(true);
    setSelectedActionMessage(null);
    setReadmeExcerpt(null);
    try {
      let result: AnalyzeWorkspaceCollectionResult;
      let previewSource: MetadataPreviewSource;

      if (viewMode === "mock") {
        result = collectAnalyzeWorkspaceTopLevelMetadataFromProvidedEntries({
          workspace: {
            displayName: analyzeSetupState.request.workspace.displayName ?? null,
            path: analyzeSetupState.request.workspace.path,
            pathHealth: analyzeSetupState.request.workspace.pathHealth
              ? {
                risk: analyzeSetupState.request.workspace.pathHealth.risk,
                reasons: [...analyzeSetupState.request.workspace.pathHealth.reasons],
              }
              : null,
          },
          topLevelEntries: MOCK_METADATA_ENTRIES[selectedState] ?? [],
          maxTopLevelEntries: 50,
        });
        previewSource = "example";
      } else {
        result = await analyzeWorkspaceApi.collectMetadata({
          workspace: {
            displayName: analyzeSetupState.request.workspace.displayName ?? null,
            path: analyzeSetupState.request.workspace.path,
            pathHealth: analyzeSetupState.request.workspace.pathHealth
              ? {
                risk: analyzeSetupState.request.workspace.pathHealth.risk,
                reasons: [...analyzeSetupState.request.workspace.pathHealth.reasons],
              }
              : null,
          },
          maxTopLevelEntries: 50,
        });
        previewSource = "live";
      }

      setMetadataCollectionResult(result);
      setMetadataPreviewSource(previewSource);
      setAnalyzeFlowState("collected");
    } catch (error) {
      setSelectedActionMessage(
        error instanceof Error
          ? `Metadata collection is not wired yet: ${error.message}`
          : "Metadata collection is not wired yet.",
      );
    } finally {
      setIsCollectingMetadata(false);
    }
  }

  async function handleReadReadmeExcerpt() {
    if (!analyzeSetupState.request || !metadataCollectionResult?.ok) return;
    const candidate = readmeCandidates[0];
    if (!candidate) {
      setSelectedActionMessage("No top-level README candidate was found.");
      return;
    }

    const excerptRequest = buildReadmeExcerptRequest({
      workspacePath: analyzeSetupState.request.workspace.path,
      displayName: analyzeSetupState.request.workspace.displayName ?? null,
      filename: candidate,
      maxBytes: 4096,
    });
    if (!excerptRequest) {
      setSelectedActionMessage("README excerpt request could not be prepared safely.");
      return;
    }

    setIsReadingReadme(true);
    setSelectedActionMessage(null);

    try {
      if (viewMode === "mock") {
        const mockContent = MOCK_README_EXCERPTS[selectedState];
        if (!mockContent) {
          setSelectedActionMessage("No top-level README candidate was found.");
          return;
        }

        setReadmeExcerpt({
          schemaVersion: 1,
          excerptType: "analyze_workspace_readme_excerpt",
          filename: candidate,
          bytesRead: new TextEncoder().encode(mockContent).length,
          truncated: false,
          content: mockContent,
          safety: {
            readOnly: true,
            filesChanged: false,
            commandsRun: false,
            networkAccessed: false,
            aiUsed: false,
            recursiveScan: false,
            followedSymlink: false,
          },
        });
        return;
      }

      const response = await analyzeWorkspaceApi.readmeExcerpt({
        workspacePath: excerptRequest.workspace.path,
        filename: excerptRequest.candidate.filename,
        maxBytes: excerptRequest.limits.maxBytes,
      });
      if (!response.ok) {
        setSelectedActionMessage(response.error);
        return;
      }
      setReadmeExcerpt(response.excerpt);
    } catch (error) {
      setSelectedActionMessage(
        error instanceof Error
          ? `README excerpt could not be read safely: ${error.message}`
          : "README excerpt could not be read safely.",
      );
    } finally {
      setIsReadingReadme(false);
    }
  }

  function handleAction(label: string) {
    if (label === "Analyze this workspace") {
      if (viewModel.primaryAction.disabled) return;
      setAnalyzeFlowState("confirm");
      setSelectedActionMessage(null);
      setMetadataCollectionResult(null);
      setMetadataPreviewSource(null);
      setReadmeExcerpt(null);
      return;
    }

    if (label === "Open diagnostics") {
      setAnalyzeFlowState("closed");
      setSelectedActionMessage("Open diagnostics action selected");
      return;
    }

    if (label === "Continue") {
      setAnalyzeFlowState("ready");
      setSelectedActionMessage(null);
      setMetadataCollectionResult(null);
      setMetadataPreviewSource(null);
      setReadmeExcerpt(null);
      return;
    }

    if (label === "Back") {
      setAnalyzeFlowState((currentState) => (currentState === "prepared" || currentState === "collected" ? "ready" : "confirm"));
      setSelectedActionMessage(null);
      return;
    }

    if (label === "Cancel") {
      setAnalyzeFlowState("closed");
      setSelectedActionMessage("Analysis setup preview cancelled");
      return;
    }

    if (label === "Prepare request") {
      setAnalyzeFlowState("prepared");
      setSelectedActionMessage(null);
      return;
    }

    setAnalyzeFlowState("closed");
    setSelectedActionMessage(`${label} action selected`);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Setup Health</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Check that Paperclip is ready to analyze your local workspace.
        </p>
      </div>

      <Card className={cn("gap-5 py-5", overallToneClasses(viewModel.overallStatus))}>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline">{setupHealthOverallStatusLabel(viewModel.overallStatus)}</Badge>
            <div className="text-xs text-muted-foreground">
              {sourceNote}
            </div>
          </div>
          <CardTitle>{viewModel.headline}</CardTitle>
          <CardDescription>{viewModel.summary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleAction(viewModel.primaryAction.label)}
              disabled={viewModel.primaryAction.disabled === true}
            >
              {viewModel.primaryAction.label}
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAction(viewModel.secondaryAction.label)}
            >
              {viewModel.secondaryAction.label}
            </Button>
          </div>

          {analyzeHelperCopy ? (
            <div className="text-sm text-muted-foreground">
              {analyzeHelperCopy}
            </div>
          ) : null}

          {workspaceName && workspaceName !== "None" ? (
            <div className="rounded-md border border-border/70 bg-background/70 px-3 py-2 text-sm text-muted-foreground">
              <div><span className="font-medium text-foreground">Selected workspace:</span> {workspaceName}</div>
              {workspacePath && workspacePath !== "None" ? (
                <div className="mt-1 break-all font-mono text-xs">{workspacePath}</div>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3">
            <div className="text-sm font-medium text-foreground">Analyze Workspace flow</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Paperclip will show you what it inspected, what it did not inspect, and whether any file contents were read.
            </div>
            <div className="mt-2 text-sm text-muted-foreground">
              This private alpha does not yet run AI analysis or edit code.
            </div>
            <div className="mt-4 space-y-2">
              {analyzeFlowSteps.map((step) => (
                <div
                  key={step.id}
                  className="rounded-md border border-border/60 bg-background/80 px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-medium text-foreground">{step.label}</div>
                    <Badge variant={step.status === "complete" ? "default" : step.status === "current" ? "secondary" : "outline"}>
                      {step.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="mt-1 text-muted-foreground">{step.description}</div>
                </div>
              ))}
            </div>
          </div>

          {analyzeFlowState === "confirm" ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-foreground">Analyze this workspace</div>
                  <div className="mt-1 text-sm text-muted-foreground">{analyzePreviewMessage}</div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>Read-only first task</div>
                  <div>No files will be changed</div>
                  <div>No commands will run without approval</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => handleAction("Continue")}>
                    Continue
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction("Cancel")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {analyzeFlowState === "ready" ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">{analyzeSetupState.title}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{analyzeSetupState.summary}</div>
                </div>

                <div className="rounded-md border border-border/70 bg-background/80 px-3 py-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Analysis has not started yet.</div>
                  <div className="mt-1">This setup request is read-only.</div>
                  <div>No files will be changed.</div>
                  <div>No commands will run without your approval.</div>
                </div>

                {workspaceName && workspaceName !== "None" ? (
                  <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                    <div><span className="font-medium text-foreground">Workspace:</span> {workspaceName}</div>
                    {workspacePath && workspacePath !== "None" ? (
                      <div className="mt-1 break-all font-mono text-xs">{workspacePath}</div>
                    ) : null}
                  </div>
                ) : null}

                <div className="space-y-1 text-sm text-muted-foreground">
                  {analyzeSetupState.safetyBullets.map((bullet) => (
                    <div key={bullet}>{bullet}</div>
                  ))}
                </div>

                {analyzeSetupState.warnings.length > 0 ? (
                  <div className="space-y-2">
                    {analyzeSetupState.warnings.map((warning) => (
                      <div
                        key={warning}
                        className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground"
                      >
                        {warning}
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">
                    Validation status: {analyzeSetupState.validation.ok ? "Request is valid" : "Request needs fixes"}
                  </div>
                  {!analyzeSetupState.validation.ok ? (
                    <div className="mt-2 space-y-1">
                      {analyzeSetupState.validation.errors.map((error) => (
                        <div key={error}>{error}</div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <Collapsible>
                  <div className="flex flex-col gap-3">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start px-0 text-muted-foreground hover:text-foreground"
                      >
                        Request preview
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="overflow-x-auto rounded-md border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                        {JSON.stringify(analyzeSetupState.request, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <div className="flex flex-wrap gap-2">
                  {analyzeSetupState.canContinue ? (
                    <Button size="sm" onClick={() => handleAction("Prepare request")}>
                      Prepare request
                    </Button>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => handleAction("Back")}>
                    Back
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction("Cancel")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {analyzeFlowState === "prepared" ? (
            <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 px-4 py-4">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Analysis request prepared</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {analyzeHandoffResult.next.message}
                  </div>
                </div>

                <div className="rounded-md border border-border/70 bg-background/80 px-3 py-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Execution has not started.</div>
                  <div className="mt-1">No agent has been started.</div>
                  <div>No files have been read or changed.</div>
                  <div>No commands have been run.</div>
                  <div className="mt-2">The next implementation phase will add safe metadata collection.</div>
                </div>

                {workspaceName && workspaceName !== "None" ? (
                  <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                    <div><span className="font-medium text-foreground">Workspace:</span> {workspaceName}</div>
                    {workspacePath && workspacePath !== "None" ? (
                      <div className="mt-1 break-all font-mono text-xs">{workspacePath}</div>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">
                    Handoff status: {analyzeHandoffResult.accepted ? "Accepted" : "Not accepted"}
                  </div>
                  <div className="mt-1">
                    Validation: {analyzeHandoffResult.validation.ok ? "OK" : "Needs fixes"}
                  </div>
                  {!analyzeHandoffResult.validation.ok ? (
                    <div className="mt-2 space-y-1">
                      {analyzeHandoffResult.validation.errors.map((error) => (
                        <div key={error}>{error}</div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">Future safe metadata scope</div>
                  <div className="mt-1">
                    The next phase will collect only limited read-only metadata such as top-level filenames, manifest presence, README presence, and path health.
                  </div>
                  <div className="mt-2">No file contents will be read in this phase.</div>
                  <div>No commands will be run.</div>
                  <div>No recursive scan will be performed.</div>
                  <div>Secrets will not be read.</div>
                  <div className="mt-2 text-xs">Example only</div>
                </div>

                <Collapsible>
                  <div className="flex flex-col gap-3">
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="justify-start px-0 text-muted-foreground hover:text-foreground"
                      >
                        Handoff preview
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="overflow-x-auto rounded-md border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                        {JSON.stringify(analyzeHandoffResult, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </div>
                </Collapsible>

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      void handleCollectLimitedMetadata();
                    }}
                    disabled={isCollectingMetadata || !analyzeHandoffResult.accepted}
                  >
                    {isCollectingMetadata ? "Collecting limited metadata..." : "Collect limited metadata"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction("Back")}>
                    Back
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction("Cancel")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          {analyzeFlowState === "collected" && metadataCollectionResult ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-4">
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-foreground">Limited read-only metadata collected</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {metadataCollectionResult.ok
                      ? "Paperclip collected only immediate top-level names and types for this workspace."
                      : "Paperclip could not complete limited metadata collection for this workspace."}
                  </div>
                </div>

                <div className="rounded-md border border-border/70 bg-background/80 px-3 py-3 text-sm text-muted-foreground">
                  <div>{readmeExcerpt ? "One approved README excerpt was read." : "No file contents were read."}</div>
                  <div>No commands were run.</div>
                  <div>No recursive scan was performed.</div>
                  <div>Secrets were not read.</div>
                  <div>No agent has been started.</div>
                  {metadataPreviewSource === "example" ? (
                    <div className="mt-2 text-xs">Example only</div>
                  ) : null}
                </div>

                {metadataCollectionResult.warnings.filter((warning) => !readmeExcerpt || warning !== "No file contents were read.").length > 0 ? (
                  <div className="space-y-2">
                    {metadataCollectionResult.warnings
                      .filter((warning) => !readmeExcerpt || warning !== "No file contents were read.")
                      .map((warning) => (
                      <div
                        key={warning}
                        className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-muted-foreground"
                      >
                        {warning}
                      </div>
                      ))}
                  </div>
                ) : null}

                {metadataCollectionResult.ok ? (
                  <>
                    <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">Top-level entries</div>
                      <div className="mt-2 space-y-1">
                        {metadataCollectionResult.snapshot.topLevelEntries.map((entry, index) => (
                          <div key={`${entry.name}-${index}`}>
                            {entry.name} · {entry.kind}{entry.redacted ? " · redacted" : ""}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">Detected manifest indicators</div>
                      <div className="mt-2 space-y-1">
                        {metadataCollectionResult.snapshot.manifestIndicators.length > 0 ? (
                          metadataCollectionResult.snapshot.manifestIndicators.map((indicator) => (
                            <div key={`${indicator.name}-${indicator.category}`}>
                              {indicator.name} · {indicator.category}
                            </div>
                          ))
                        ) : (
                          <div>No common manifest indicators were detected.</div>
                        )}
                      </div>
                    </div>

                    {firstWorkspaceResult ? (
                      <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-3 text-sm text-muted-foreground">
                        <div className="font-medium text-foreground">First workspace summary</div>
                        <div className="mt-1">
                          {metadataPreviewSource === "example"
                            ? "Example only"
                            : "Based on limited read-only metadata"}
                        </div>
                        <div className="mt-2">
                          {readmeExcerpt
                            ? "This result uses limited top-level metadata and one approved README excerpt."
                            : "This first result is based only on limited top-level metadata."}
                        </div>
                        <div>
                          {readmeExcerpt
                            ? "A small approved README excerpt was read."
                            : "No file contents were read."}
                        </div>
                        <div>No commands were run.</div>
                        <div>No AI was used.</div>
                        <div>No recursive scan was performed.</div>

                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="font-medium text-foreground">Project summary</div>
                            <div className="mt-1">{firstWorkspaceResult.summary.title}</div>
                            <div className="mt-1">{firstWorkspaceResult.summary.description}</div>
                            <div className="mt-1 text-xs">Confidence: {firstWorkspaceResult.summary.confidence}</div>
                          </div>

                          <div>
                            <div className="font-medium text-foreground">Detected languages/tools</div>
                            <div className="mt-1 space-y-1">
                              <div>
                                Languages: {firstWorkspaceResult.detected.languages.length > 0
                                  ? firstWorkspaceResult.detected.languages.join(", ")
                                  : "No language indicators detected."}
                              </div>
                              <div>
                                Frameworks: {firstWorkspaceResult.detected.frameworks.length > 0
                                  ? firstWorkspaceResult.detected.frameworks.join(", ")
                                  : "No framework indicators detected."}
                              </div>
                              <div>
                                Package managers: {firstWorkspaceResult.detected.packageManagers.length > 0
                                  ? firstWorkspaceResult.detected.packageManagers.join(", ")
                                  : "No package manager indicators detected."}
                              </div>
                            </div>
                          </div>

                          <div>
                            <div className="font-medium text-foreground">Important files</div>
                            <div className="mt-1 space-y-1">
                              {firstWorkspaceResult.detected.importantFiles.length > 0 ? (
                                firstWorkspaceResult.detected.importantFiles.map((file) => (
                                  <div key={`${file.path}-${file.reason}`}>
                                    {file.path} · {file.reason}
                                  </div>
                                ))
                              ) : (
                                <div>No important top-level files were identified yet.</div>
                              )}
                            </div>
                          </div>

                          <div>
                            <div className="font-medium text-foreground">Setup warnings</div>
                            <div className="mt-1 space-y-1">
                              {firstWorkspaceResult.setupWarnings.map((warning) => (
                                <div key={`${warning.title}-${warning.message}`}>
                                  {warning.title} · {warning.message}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="font-medium text-foreground">Suggested next actions</div>
                            <div className="mt-1 space-y-1">
                              {firstWorkspaceResult.suggestedNextActions.map((action) => (
                                <div key={`${action.label}-${action.description}`}>
                                  {action.label} · {action.description}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className="font-medium text-foreground">What I inspected</div>
                            <div className="mt-1 space-y-1">
                              <div>
                                Top-level entries: {firstWorkspaceResult.inspected.filesListed.join(", ")}
                              </div>
                              <div>
                                Files read: {firstWorkspaceResult.inspected.filesRead.length > 0
                                  ? firstWorkspaceResult.inspected.filesRead.join(", ")
                                  : "none"}
                              </div>
                              <div>Commands run: none</div>
                            </div>
                          </div>

                          <div>
                            <div className="font-medium text-foreground">What I did not inspect</div>
                            <div className="mt-1 space-y-1">
                              {firstWorkspaceResult.notInspected.map((item) => (
                                <div key={item}>{item}</div>
                              ))}
                            </div>
                          </div>

                          {firstWorkspaceResultValidation ? (
                            <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3">
                              <div className="font-medium text-foreground">
                                Result validation: {firstWorkspaceResultValidation.ok ? "OK" : "Needs fixes"}
                              </div>
                              {!firstWorkspaceResultValidation.ok ? (
                                <div className="mt-2 space-y-1">
                                  {firstWorkspaceResultValidation.errors.map((error) => (
                                    <div key={error}>{error}</div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3">
                            <div className="font-medium text-foreground">Approved README step</div>
                            {readmeCandidates.length > 0 ? (
                              <div className="mt-2 space-y-2">
                                <div>Paperclip can improve this summary by reading up to 4 KB from the top-level README file. This is optional and read-only.</div>
                                <div>Only the top-level README file will be read.</div>
                                <div>No commands will be run.</div>
                                <div>No AI will be used.</div>
                                <div>No other files will be opened.</div>
                                <div>Candidate: {readmeCandidates[0]}</div>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    void handleReadReadmeExcerpt();
                                  }}
                                  disabled={isReadingReadme}
                                >
                                  {isReadingReadme ? "Reading README excerpt..." : "Read small README excerpt"}
                                </Button>
                              </div>
                            ) : (
                              <div className="mt-2">No top-level README candidate was found.</div>
                            )}

                            {readmeExcerpt ? (
                              <div className="mt-4 space-y-2">
                                <div className="font-medium text-foreground">README excerpt read</div>
                                <div>
                                  {readmeExcerpt.filename} · {readmeExcerpt.bytesRead} bytes{readmeExcerpt.truncated ? " · truncated" : ""}
                                </div>
                                <Collapsible>
                                  <div className="flex flex-col gap-3">
                                    <CollapsibleTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="justify-start px-0 text-muted-foreground hover:text-foreground"
                                      >
                                        Approved README excerpt
                                      </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                                        {readmeExcerpt.content}
                                      </pre>
                                    </CollapsibleContent>
                                  </div>
                                </Collapsible>
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-md border border-border/70 bg-background/70 px-3 py-3">
                            <div className="font-medium text-foreground">What’s next?</div>
                            <div className="mt-2 space-y-1 text-muted-foreground">
                              <div>Read selected manifest fields — coming next</div>
                              <div>Improve summary with Cloud AI — coming later</div>
                              <div>Inspect project structure — coming later</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">Metadata collection could not continue</div>
                    <div className="mt-2 space-y-1">
                      {metadataCollectionResult.errors.map((error) => (
                        <div key={error}>{error}</div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAction("Back")}>
                    Back
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAction("Cancel")}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : null}

          <Separator />

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">View mode</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={viewMode === "diagnostics" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setViewMode("diagnostics");
                  setSelectedActionMessage(null);
                  setAnalyzeFlowState("closed");
                  setMetadataCollectionResult(null);
                  setMetadataPreviewSource(null);
                  setReadmeExcerpt(null);
                }}
              >
                Live diagnostics
              </Button>
              <Button
                variant={viewMode === "mock" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setViewMode("mock");
                  setSelectedActionMessage(null);
                  setAnalyzeFlowState("closed");
                  setMetadataCollectionResult(null);
                  setMetadataPreviewSource(null);
                  setReadmeExcerpt(null);
                }}
              >
                Mock states
              </Button>
            </div>
          </div>

          {viewMode === "mock" ? (
            <div className="flex flex-col gap-2">
              <div className="text-sm font-medium">Mock scenarios</div>
              <div className="flex flex-wrap gap-2">
                {mockSetupHealthStates.map((state) => (
                  <Button
                    key={state.id}
                    variant={state.id === selectedState ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedState(state.id);
                      setSelectedActionMessage(null);
                      setAnalyzeFlowState("closed");
                      setMetadataCollectionResult(null);
                      setMetadataPreviewSource(null);
                      setReadmeExcerpt(null);
                    }}
                  >
                    {state.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          {selectedActionMessage ? (
            <div
              aria-live="polite"
              className="rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-muted-foreground"
            >
              {selectedActionMessage}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {viewModel.cards.map((card) => (
          <div
            key={card.id}
            className={cn(card.id === "runtime" && "md:col-span-2")}
          >
            <SetupHealthCardView card={card} onAction={handleAction} />
          </div>
        ))}
      </div>
    </div>
  );
}
