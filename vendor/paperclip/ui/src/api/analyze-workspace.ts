import type {
  AnalyzeWorkspaceCollectionResult,
  AnalyzeWorkspaceReadmeExcerpt,
} from "@/lib/setup-health";
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

export type AnalyzeWorkspaceReadmeExcerptResponse =
  | { ok: true; excerpt: AnalyzeWorkspaceReadmeExcerpt }
  | { ok: false; error: string };

export const analyzeWorkspaceApi = {
  collectMetadata: (body: AnalyzeWorkspaceCollectMetadataRequest) =>
    api.post<AnalyzeWorkspaceCollectionResult>("/analyze-workspace/collect-metadata", body),
  readmeExcerpt: (body: { workspacePath: string; filename: string; maxBytes?: number }) =>
    api.post<AnalyzeWorkspaceReadmeExcerptResponse>("/analyze-workspace/readme-excerpt", body),
};
