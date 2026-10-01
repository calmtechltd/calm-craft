import { join } from "node:path";

import { loadEngineeringConfig, type EngineeringConfig } from "./engineering";
import { ConfigError, readConfigFile, repositoryPath } from "./files";

export { ConfigError } from "./files";

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

export function validateSpecsRoot(value: string): string {
  return repositoryPath(value, "specsRoot");
}

export async function loadConfig(
  repositoryRoot: string,
  shared?: EngineeringConfig["shared"],
  label = ".engineering/config.yaml",
): Promise<CalmCraftConfig> {
  const yaml = shared ?? (await loadEngineeringConfig(repositoryRoot, true))?.shared ?? {};
  const path = join(repositoryRoot, "calmcraft.json");
  const source = await readConfigFile(repositoryRoot, path, true);
  let value: unknown = {};
  try {
    if (source !== undefined) value = JSON.parse(source);
  } catch {
    throw new ConfigError("calmcraft.json is not valid JSON.");
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
  const jsonRoot =
    record.specsRoot === undefined ? undefined : validateSpecsRoot(record.specsRoot as string);
  const jsonBase = record.defaultBase?.toString().trim();
  for (const [yamlKey, jsonKey, yamlValue, jsonValue] of [
    ["paths.specs", "specsRoot", yaml.specsRoot, jsonRoot],
    ["spec_version", "specVersion", yaml.specVersion, record.specVersion],
    ["vcs.review_base", "defaultBase", yaml.reviewBase, jsonBase],
  ]) {
    if (yamlValue !== undefined && jsonValue !== undefined && yamlValue !== jsonValue) {
      throw new ConfigError(
        `Conflicting ${label} ${yamlKey} and calmcraft.json ${jsonKey}; align or omit one explicit setting.`,
      );
    }
  }
  return {
    specVersion: DEFAULT_CONFIG.specVersion,
    specsRoot: yaml.specsRoot ?? jsonRoot ?? DEFAULT_CONFIG.specsRoot,
    defaultBase:
      yaml.reviewBase ??
      jsonBase ??
      (yaml.defaultBranch === undefined ? undefined : `origin/${yaml.defaultBranch}`),
  };
}
