import type { AnalyzeWorkspaceCollectionResult } from "@/lib/setup-health";
import { api } from "./client";

export type AnalyzeWorkspaceCollectMetadataRequest = {
  workspace: {
    displayName?: string | null;
    path: string;
    pathHealth?: {
      risk: "none" | "low" | "medium" | "unknown";
      reasons: string[];
    } | null;
  };
  maxTopLevelEntries?: number;
};

export const analyzeWorkspaceApi = {
  collectMetadata: (body: AnalyzeWorkspaceCollectMetadataRequest) =>
    api.post<AnalyzeWorkspaceCollectionResult>("/analyze-workspace/collect-metadata", body),
};
