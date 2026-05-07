import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";

const TRUTHY_ENV_RE = /^(1|true|yes|on)$/i;
const COPIED_SHARED_FILES = ["config.json", "instructions.md"] as const;
const SYMLINKED_SHARED_FILES = ["auth.json"] as const;
const DEFAULT_PAPERCLIP_INSTANCE_ID = "default";
const DEFAULT_LOCAL_REASONING_EFFORT = "medium";

type ManagedCodexHomeProfile = {
  provider?: string | null;
  model?: string | null;
  defaultReasoningEffort?: string | null;
};

function nonEmpty(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export async function pathExists(candidate: string): Promise<boolean> {
  return fs.access(candidate).then(() => true).catch(() => false);
}

export function resolveSharedCodexHomeDir(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const fromEnv = nonEmpty(env.CODEX_HOME);
  return fromEnv ? path.resolve(fromEnv) : path.join(os.homedir(), ".codex");
}

function isWorktreeMode(env: NodeJS.ProcessEnv): boolean {
  return TRUTHY_ENV_RE.test(env.PAPERCLIP_IN_WORKTREE ?? "");
}

export function resolveManagedCodexHomeDir(
  env: NodeJS.ProcessEnv,
  companyId?: string,
): string {
  const paperclipHome = nonEmpty(env.PAPERCLIP_HOME) ?? path.resolve(os.homedir(), ".paperclip");
  const instanceId = nonEmpty(env.PAPERCLIP_INSTANCE_ID) ?? DEFAULT_PAPERCLIP_INSTANCE_ID;
  return companyId
    ? path.resolve(paperclipHome, "instances", instanceId, "companies", companyId, "codex-home")
    : path.resolve(paperclipHome, "instances", instanceId, "codex-home");
}

async function ensureParentDir(target: string): Promise<void> {
  await fs.mkdir(path.dirname(target), { recursive: true });
}

async function ensureSymlink(target: string, source: string): Promise<void> {
  const existing = await fs.lstat(target).catch(() => null);
  if (!existing) {
    await ensureParentDir(target);
    await fs.symlink(source, target);
    return;
  }

  if (!existing.isSymbolicLink()) {
    return;
  }

  const linkedPath = await fs.readlink(target).catch(() => null);
  if (!linkedPath) return;

  const resolvedLinkedPath = path.resolve(path.dirname(target), linkedPath);
  if (resolvedLinkedPath === source) return;

  await fs.unlink(target);
  await fs.symlink(source, target);
}

async function ensureCopiedFile(target: string, source: string): Promise<void> {
  const existing = await fs.lstat(target).catch(() => null);
  if (existing) return;
  await ensureParentDir(target);
  await fs.copyFile(source, target);
}

function shouldUseLeanLocalProfile(provider: string | null | undefined): boolean {
  return provider === "ollama" || provider === "lmstudio";
}

function extractNamedSectionKeys(contents: string, prefix: "plugins"): string[] {
  const keys = new Set<string>();
  for (const line of contents.split(/\r?\n/)) {
    const match = line.trim().match(/^\[(plugins)\.(.+)\]$/);
    if (!match || match[1] !== prefix) continue;
    keys.add(match[2].trim());
  }
  return Array.from(keys).sort((left, right) => left.localeCompare(right));
}

function extractSectionBlocks(contents: string, prefix: "projects"): string[] {
  const lines = contents.split(/\r?\n/);
  const blocks: string[] = [];
  let current: string[] = [];
  let collecting = false;

  const flush = () => {
    if (current.length === 0) return;
    const block = current.join("\n").trimEnd();
    if (block) blocks.push(block);
    current = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const isHeader = /^\[[^\]]+\]$/.test(trimmed);
    if (isHeader) {
      if (collecting) flush();
      collecting = trimmed.startsWith(`[${prefix}.`);
    }

    if (collecting) {
      current.push(line);
    }
  }

  if (collecting) flush();
  return blocks;
}

function buildLeanLocalConfigToml(
  sourceContents: string,
  options: ManagedCodexHomeProfile = {},
): string {
  const pluginKeys = extractNamedSectionKeys(sourceContents, "plugins");
  const projectBlocks = extractSectionBlocks(sourceContents, "projects");
  const reasoningEffort = options.defaultReasoningEffort?.trim() || DEFAULT_LOCAL_REASONING_EFFORT;
  const lines = [
    "# Managed by Paperclip for local Codex heartbeat runs.",
    "# Keep this profile lean so simple issues do not inherit heavy global plugins or reasoning defaults.",
    `model_reasoning_effort = ${JSON.stringify(reasoningEffort)}`,
    "",
  ];

  for (const pluginKey of pluginKeys) {
    lines.push(`[plugins.${pluginKey}]`);
    lines.push("enabled = false");
    lines.push("");
  }

  for (const block of projectBlocks) {
    lines.push(block);
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

async function ensureManagedConfigFile(
  target: string,
  source: string,
  profile: ManagedCodexHomeProfile,
): Promise<"created" | "updated" | "unchanged"> {
  const sourceExists = await pathExists(source);
  const sourceContents = sourceExists ? await fs.readFile(source, "utf8") : "";
  const desiredContents = shouldUseLeanLocalProfile(profile.provider)
    ? buildLeanLocalConfigToml(sourceContents, profile)
    : sourceContents;

  if (!desiredContents) {
    return "unchanged";
  }

  const existingContents = await fs.readFile(target, "utf8").catch(() => null);
  if (existingContents === desiredContents) {
    return "unchanged";
  }

  await ensureParentDir(target);
  await fs.writeFile(target, desiredContents, "utf8");
  return existingContents === null ? "created" : "updated";
}

function selectLocalModelTemplate(
  models: Array<Record<string, unknown>>,
): Record<string, unknown> | null {
  const preferredSlugs = ["gpt-5.4", "gpt-5.4-mini", "gpt-5.3-codex"];
  for (const slug of preferredSlugs) {
    const candidate = models.find((model) => model.slug === slug);
    if (candidate && typeof candidate.model_messages === "object" && candidate.model_messages !== null) {
      return candidate;
    }
  }

  return models.find(
    (model) => typeof model.model_messages === "object" && model.model_messages !== null,
  ) ?? null;
}

function buildLocalModelAliasEntry(
  template: Record<string, unknown>,
  model: string,
  provider: string,
): Record<string, unknown> {
  return {
    ...template,
    slug: model,
    display_name: model,
    description: `Local ${provider} model alias for Paperclip heartbeat runs.`,
    supported_in_api: false,
    visibility: "list",
    priority: 0,
    availability_nux: null,
    upgrade: null,
  };
}

async function ensureManagedModelsCacheFile(
  target: string,
  source: string,
  profile: ManagedCodexHomeProfile,
): Promise<"created" | "updated" | "unchanged"> {
  if (!shouldUseLeanLocalProfile(profile.provider) || !profile.model?.trim()) {
    return "unchanged";
  }

  const sourceExists = await pathExists(source);
  if (!sourceExists) return "unchanged";

  const desiredModel = profile.model.trim();
  let root: Record<string, unknown>;
  try {
    root = JSON.parse(await fs.readFile(source, "utf8")) as Record<string, unknown>;
  } catch {
    return "unchanged";
  }

  const models = Array.isArray(root.models)
    ? root.models.filter((value): value is Record<string, unknown> => typeof value === "object" && value !== null)
    : [];
  if (models.length === 0) return "unchanged";

  const existingAlias = models.find((model) => model.slug === desiredModel);
  if (!existingAlias) {
    const template = selectLocalModelTemplate(models);
    if (!template || !profile.provider) return "unchanged";
    models.unshift(buildLocalModelAliasEntry(template, desiredModel, profile.provider));
  }

  const desiredContents = `${JSON.stringify({ ...root, models }, null, 2)}\n`;
  const existingContents = await fs.readFile(target, "utf8").catch(() => null);
  if (existingContents === desiredContents) {
    return "unchanged";
  }

  await ensureParentDir(target);
  await fs.writeFile(target, desiredContents, "utf8");
  return existingContents === null ? "created" : "updated";
}

export async function ensureCodexHomeProfile(
  targetHome: string,
  sourceHome: string,
  onLog: AdapterExecutionContext["onLog"],
  profile: ManagedCodexHomeProfile = {},
): Promise<void> {
  const managedConfigStatus = await ensureManagedConfigFile(
    path.join(targetHome, "config.toml"),
    path.join(sourceHome, "config.toml"),
    profile,
  );
  if (managedConfigStatus !== "unchanged" && shouldUseLeanLocalProfile(profile.provider)) {
    await onLog(
      "stdout",
      `[paperclip] ${managedConfigStatus === "created" ? "Created" : "Updated"} lightweight local Codex config for provider "${profile.provider}" in "${targetHome}".\n`,
    );
  }

  const managedModelsCacheStatus = await ensureManagedModelsCacheFile(
    path.join(targetHome, "models_cache.json"),
    path.join(sourceHome, "models_cache.json"),
    profile,
  );
  if (managedModelsCacheStatus !== "unchanged" && shouldUseLeanLocalProfile(profile.provider) && profile.model?.trim()) {
    await onLog(
      "stdout",
      `[paperclip] ${managedModelsCacheStatus === "created" ? "Created" : "Updated"} local model metadata alias for "${profile.model.trim()}" in "${targetHome}".\n`,
    );
  }
}

export async function prepareManagedCodexHome(
  env: NodeJS.ProcessEnv,
  onLog: AdapterExecutionContext["onLog"],
  companyId?: string,
  profile: ManagedCodexHomeProfile = {},
): Promise<string> {
  const targetHome = resolveManagedCodexHomeDir(env, companyId);

  const sourceHome = resolveSharedCodexHomeDir(env);
  if (path.resolve(sourceHome) === path.resolve(targetHome)) return targetHome;

  await fs.mkdir(targetHome, { recursive: true });

  for (const name of SYMLINKED_SHARED_FILES) {
    const source = path.join(sourceHome, name);
    if (!(await pathExists(source))) continue;
    await ensureSymlink(path.join(targetHome, name), source);
  }

  for (const name of COPIED_SHARED_FILES) {
    const source = path.join(sourceHome, name);
    if (!(await pathExists(source))) continue;
    await ensureCopiedFile(path.join(targetHome, name), source);
  }

  await ensureCodexHomeProfile(targetHome, sourceHome, onLog, profile);

  await onLog(
    "stdout",
    `[paperclip] Using ${isWorktreeMode(env) ? "worktree-isolated" : "Paperclip-managed"} Codex home "${targetHome}" (seeded from "${sourceHome}").\n`,
  );
  return targetHome;
}
