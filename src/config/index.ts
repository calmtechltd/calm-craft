import { lstat, readFile } from "node:fs/promises";
import { join } from "node:path";

export type CalmCraftConfig = {
  specVersion: 1;
  specsRoot: string;
  defaultBase?: string;
};

const DEFAULT_CONFIG: CalmCraftConfig = {
  specVersion: 1,
  specsRoot: "specs",
};
const CONFIG_KEYS = new Set(["specVersion", "specsRoot", "defaultBase"]);

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export function validateSpecsRoot(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/$/u, "");
  const segments = normalized.split("/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[a-z]:/iu.test(normalized) ||
    normalized.startsWith(":") ||
    normalized.includes("\0") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new ConfigError("specsRoot must be a relative path beneath the repository root.");
  }
  return normalized;
}

export async function loadConfig(repositoryRoot: string): Promise<CalmCraftConfig> {
  const path = join(repositoryRoot, "calmcraft.json");
  let details;
  try {
    details = await lstat(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { ...DEFAULT_CONFIG };
    throw new ConfigError(`Could not inspect calmcraft.json: ${String(error)}`);
  }
  if (!details.isFile() || details.isSymbolicLink()) {
    throw new ConfigError("calmcraft.json must be a regular file inside the repository root.");
  }
  if (details.size > 64 * 1024) throw new ConfigError("calmcraft.json exceeds the 64 KiB limit.");

  let value: unknown;
  try {
    value = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new ConfigError(`calmcraft.json is not valid JSON: ${String(error)}`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConfigError("calmcraft.json must contain one JSON object.");
  }
  const record = value as Record<string, unknown>;
  const unknown = Object.keys(record).filter((key) => !CONFIG_KEYS.has(key));
  if (unknown.length > 0) throw new ConfigError(`Unsupported calmcraft.json field: ${unknown[0]}`);
  if (record.specVersion !== undefined && record.specVersion !== 1) {
    throw new ConfigError("Unsupported specVersion. CalmCraft currently supports version 1.");
  }
  if (record.specsRoot !== undefined && typeof record.specsRoot !== "string") {
    throw new ConfigError("specsRoot must be a relative path string.");
  }
  if (
    record.defaultBase !== undefined &&
    (typeof record.defaultBase !== "string" || !record.defaultBase.trim())
  ) {
    throw new ConfigError("defaultBase must be a non-empty Git reference string.");
  }
  return {
    specVersion: 1,
    specsRoot: validateSpecsRoot((record.specsRoot as string | undefined) ?? "specs"),
    defaultBase: record.defaultBase?.toString().trim(),
  };
}
