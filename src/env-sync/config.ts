import { isAbsolute } from "node:path";

export type SecretSource = {
  account?: string;
  exclude?: string[];
} & (
  | { template: string; vault?: never; item?: never; variables?: never }
  | { template?: never; vault: string; item: string; variables: string[] }
);
export type SyncTarget = {
  environments: Record<string, string>;
} & (
  | { provider: "vercel"; project: string; team: string; tokenEnv: string }
  | { provider: "github"; repo: string }
);
export type EnvSyncConfig = {
  sources: Record<string, SecretSource>;
  targets: Record<string, SyncTarget>;
};

export const variableName = /^[A-Z_][A-Z0-9_]*$/u;
const identifier = /^[a-z][a-z0-9-]{0,63}$/u;

function object(input: unknown, keys?: string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected an envSync configuration object.");
  const data = input as Record<string, unknown>;
  if (keys && Object.keys(data).some((key) => !keys.includes(key)))
    throw new Error("Unsupported envSync configuration field.");
  return data;
}
function text(input: unknown): string {
  if (
    typeof input !== "string" ||
    !input.trim() ||
    [...input].some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
  )
    throw new Error("Expected a non-empty envSync configuration string.");
  return input;
}
function referencePart(input: unknown): string {
  const value = text(input);
  if (/[/?#]/u.test(value))
    throw new Error("1Password vault and item names cannot contain /, ? or #.");
  return value;
}
function selectors(input: unknown, field: string): string[] | undefined {
  if (input === undefined) return undefined;
  if (
    !Array.isArray(input) ||
    !input.length ||
    input.some((name) => typeof name !== "string" || !/^[A-Z_*][A-Z0-9_*]*$/u.test(name)) ||
    new Set(input).size !== input.length
  )
    throw new Error(`envSync ${field} must be a unique, non-empty list of names or * patterns.`);
  return input as string[];
}
export function validateEnvSyncConfig(input: unknown): EnvSyncConfig {
  const raw = object(input, ["sources", "targets"]);
  const sources: EnvSyncConfig["sources"] = Object.create(null);
  for (const [key, input_] of Object.entries(object(raw.sources))) {
    if (!identifier.test(key)) throw new Error("Invalid envSync source identifier.");
    const value = object(input_, ["account", "template", "vault", "item", "variables", "exclude"]);
    const account = value.account === undefined ? undefined : text(value.account);
    const exclude = selectors(value.exclude, "exclude");
    if (value.template !== undefined) {
      if (value.vault !== undefined || value.item !== undefined || value.variables !== undefined)
        throw new Error("Choose an envSync template or a vault/item/variables source.");
      const template = text(value.template);
      if (
        isAbsolute(template) ||
        template.includes("\\") ||
        /^[a-z]:/iu.test(template) ||
        template.split("/").some((part) => !part || part === "." || part === "..")
      )
        throw new Error("envSync templates must be relative paths beneath the project directory.");
      sources[key] = { account, template, exclude };
    } else {
      sources[key] = {
        account,
        exclude,
        vault: referencePart(value.vault),
        item: referencePart(value.item),
        variables: selectors(value.variables, "variables") ?? ["*"],
      };
    }
  }
  const targets: EnvSyncConfig["targets"] = Object.create(null);
  for (const [key, input_] of Object.entries(object(raw.targets))) {
    if (!identifier.test(key)) throw new Error("Invalid envSync target identifier.");
    const value = object(input_);
    const environments: Record<string, string> = Object.create(null);
    for (const [environment, source] of Object.entries(object(value.environments))) {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/u.test(environment) || environment === "all")
        throw new Error("Invalid envSync environment name (all is reserved).");
      if (typeof source !== "string" || !Object.hasOwn(sources, source))
        throw new Error("Unknown envSync source in environment mapping.");
      environments[environment] = source;
    }
    if (!Object.keys(environments).length) throw new Error("envSync targets need environments.");
    if (value.provider === "vercel") {
      object(value, ["provider", "project", "team", "tokenEnv", "environments"]);
      if (
        Object.keys(environments).some(
          (env) => !["production", "preview", "development"].includes(env),
        )
      )
        throw new Error("Vercel envSync environments must be production, preview or development.");
      const tokenEnv = text(value.tokenEnv ?? "VERCEL_TOKEN");
      if (!variableName.test(tokenEnv))
        throw new Error("tokenEnv must name a process environment variable.");
      targets[key] = {
        provider: "vercel",
        project: text(value.project),
        team: text(value.team),
        tokenEnv,
        environments,
      };
    } else if (value.provider === "github") {
      object(value, ["provider", "repo", "environments"]);
      const names = Object.keys(environments).map((environment) => environment.toLowerCase());
      if (new Set(names).size !== names.length)
        throw new Error("GitHub envSync environment names must be unique ignoring case.");
      const repo = text(value.repo);
      if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/u.test(repo))
        throw new Error("GitHub envSync repo must be owner/repository.");
      targets[key] = { provider: "github", repo, environments };
    } else throw new Error("envSync supports vercel and github target providers.");
  }
  if (!Object.keys(sources).length || !Object.keys(targets).length)
    throw new Error("envSync needs at least one source and target.");
  return { sources, targets };
}
