import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { assertBoard } from "./authz.js";
import { collectAnalyzeWorkspaceTopLevelMetadataFromFilesystem } from "../services/analyze-workspace-metadata.js";

const collectAnalyzeWorkspaceMetadataSchema = z.object({
  workspace: z.object({
    displayName: z.string().trim().min(1).nullable().optional(),
    path: z.string().trim().min(1),
    pathHealth: z.object({
      risk: z.enum(["none", "low", "medium", "unknown"]),
      reasons: z.array(z.string()),
    }).nullable().optional(),
  }),
  maxTopLevelEntries: z.number().int().min(1).max(200).optional(),
});

export function analyzeWorkspaceRoutes() {
  const router = Router();

  router.post(
    "/analyze-workspace/collect-metadata",
    validate(collectAnalyzeWorkspaceMetadataSchema),
    async (req, res) => {
      assertBoard(req);
      const result = await collectAnalyzeWorkspaceTopLevelMetadataFromFilesystem(req.body);
      if (!result.ok) {
        res.status(422).json(result);
        return;
      }
      res.json(result);
    },
  );

  return router;
}
