// Secret resolution and remote writes are deliberately sequential.
/* eslint-disable no-await-in-loop */
import { execFile } from "node:child_process";
import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { parseEnv } from "node:util";
import { loadStackConfig } from "../dev-all/config";
import { variableName, type EnvSyncConfig, type SecretSource, type SyncTarget } from "./config";

export type SyncArguments = {
  command: "env-sync";
  config: string;
  target: string;
  environment: string;
  variable?: string;
  apply: boolean;
};
export function parseSyncArguments(args: string[]): SyncArguments {
  let config = ".engineering/dev.yaml",
    target = "",
    environment = "",
    variable: string | undefined;
  let apply = false,
    dryRun = false;
  for (let index = 1; index < args.length; index++) {
    const option = args[index];
    if (option === "--apply") apply = true;
    else if (option === "--dry-run") dryRun = true;
    else if (["--config", "--target", "--env", "--var"].includes(option ?? "")) {
      const value = args[++index];
      if (!value || value.startsWith("-")) throw new Error(`${option} requires a value.`);
      if (option === "--config") config = value;
      else if (option === "--target") target = value;
      else if (option === "--env") environment = value;
      else variable = value;
    } else
      throw new Error("Unknown env-sync option. Use --config, --target, --env, --var or --apply.");
  }
  if (!target || !environment)
    throw new Error("env-sync requires --target and --env (or --env all).");
  if (variable && !variableName.test(variable))
    throw new Error("--var must name an environment variable.");
  if (apply && dryRun) throw new Error("Choose --apply or --dry-run.");
  return { command: "env-sync", config, target, environment, variable, apply };
}

export type ProcessRequest = {
  executable: "op" | "gh";
  args: string[];
  input?: string;
  signal?: AbortSignal;
};
export type SyncDependencies = {
  root?: string;
  environment?: NodeJS.ProcessEnv;
  execute?: (request: ProcessRequest) => Promise<string>;
  fetch?: typeof fetch;
  signal?: AbortSignal;
};
type Io = { stdout: (value: string) => void; stderr: (value: string) => void };
type Variable = {
  key: string;
  value: string;
  secret: boolean;
  resolved?: boolean;
  selector?: boolean;
};
type Operation = Variable & { environment: string; source: SecretSource };

// These framework prefixes can expose values in browser bundles regardless of storage type.
const publicPrefix = /^(?:NEXT_PUBLIC_|VITE_|PUBLIC_|REACT_APP_|GATSBY_|VUE_APP_|NUXT_PUBLIC_)/u;

export function executeSecretProcess(request: ProcessRequest): Promise<string> {
  return new Promise((resolve_, reject) => {
    const child = execFile(
      request.executable,
      request.args,
      { encoding: "utf8", maxBuffer: 1024 * 1024, timeout: 60000, signal: request.signal },
      (error, stdout) => {
        // Neither an exec error nor raw CLI output is safe to include in a diagnostic.
        if (error)
          reject(
            new Error(
              `${request.executable} failed. Check its installation, access and authentication.`,
            ),
          );
        else resolve_(stdout);
      },
    );
    child.stdin?.on("error", () => {});
    child.stdin?.end(request.input);
  });
}

function matchesSelector(key: string, selector: string): boolean {
  return new RegExp(`^${selector.split("*").join(".*")}$`, "u").test(key);
}
function excluded(source: SecretSource, key: string): boolean {
  return source.exclude?.some((selector) => matchesSelector(key, selector)) ?? false;
}

async function itemVariables(
  source: Extract<SecretSource, { vault: string }>,
  args: SyncArguments,
  dependencies: SyncDependencies,
): Promise<Variable[]> {
  if (!args.apply) {
    // Item discovery returns secret values. A dry run must show selectors instead.
    const selectors = args.variable
      ? source.variables.some((selector) => matchesSelector(args.variable!, selector))
        ? [args.variable]
        : []
      : source.variables;
    return selectors
      .filter((key) => key.includes("*") || !excluded(source, key))
      .map((key) => ({ key, value: "", secret: true, selector: true }));
  }
  let fields: unknown[];
  try {
    const output = await (dependencies.execute ?? executeSecretProcess)({
      executable: "op",
      args: [
        "item",
        "get",
        "--format",
        "json",
        "--reveal",
        "--vault",
        source.vault,
        ...(source.account ? ["--account", source.account] : []),
        "--",
        source.item,
      ],
      signal: dependencies.signal,
    });
    const item: unknown = JSON.parse(output);
    if (!item || typeof item !== "object" || !("fields" in item) || !Array.isArray(item.fields))
      throw new Error("Invalid item");
    fields = item.fields;
  } catch {
    throw new Error(
      "Cannot discover 1Password item fields. Check item access and authentication. No remote writes started.",
    );
  }
  const variables: Variable[] = [];
  const names = new Set<string>();
  for (const field of fields) {
    if (
      !field ||
      typeof field !== "object" ||
      !("label" in field) ||
      typeof field.label !== "string" ||
      !variableName.test(field.label) ||
      ("id" in field && field.id === "notesPlain")
    )
      continue;
    const key = field.label;
    if (
      !source.variables.some((selector) => matchesSelector(key, selector)) ||
      excluded(source, key) ||
      (args.variable && key !== args.variable)
    )
      continue;
    if (names.has(key))
      throw new Error(
        `Ambiguous 1Password fields named ${key}. Use a template with section-specific references. No remote writes started.`,
      );
    if (!("value" in field) || typeof field.value !== "string" || !field.value.trim())
      throw new Error(`Empty or missing 1Password value for ${key}. No remote writes started.`);
    names.add(key);
    variables.push({ key, value: field.value, secret: true, resolved: true });
  }
  const selectors = (args.variable ? [args.variable] : source.variables).filter(
    (selector) => selector.includes("*") || !excluded(source, selector),
  );
  if (
    selectors.some(
      (selector) => !variables.some((variable) => matchesSelector(variable.key, selector)),
    )
  )
    throw new Error(
      "A selected 1Password variable or pattern matches no environment fields. No remote writes started.",
    );
  return variables;
}

async function sourceVariables(
  source: SecretSource,
  root: string,
  args: SyncArguments,
  dependencies: SyncDependencies,
): Promise<Variable[]> {
  if (args.variable && excluded(source, args.variable)) return [];
  if (source.template === undefined && source.variables.some((selector) => selector.includes("*")))
    return itemVariables(source, args, dependencies);
  if (source.template === undefined)
    return source.variables
      .filter((key) => !excluded(source, key))
      .map((key) => ({
        key,
        value: `op://${source.vault}/${source.item}/${key}`,
        secret: true,
      }));
  let values: ReturnType<typeof parseEnv>;
  try {
    const [directory, path] = await Promise.all([
      realpath(root),
      realpath(resolve(root, source.template)),
    ]);
    const within = relative(directory, path);
    if (isAbsolute(within) || within === ".." || within.startsWith("../"))
      throw new Error("Outside project");
    values = parseEnv(await readFile(path, "utf8"));
  } catch {
    throw new Error("Cannot read envSync template beneath the project directory.");
  }
  if (!Object.keys(values).length)
    throw new Error("envSync template contains no active variables.");
  return Object.entries(values)
    .filter(([key]) => !excluded(source, key))
    .map(([key, value]) => {
      if (!variableName.test(key))
        throw new Error("Invalid environment variable name in envSync template.");
      if (value === undefined) throw new Error(`Missing template value for ${key}.`);
      const secret = value.startsWith("op://");
      if (
        value.includes("op://") &&
        (!secret || !/^op:\/\/[^/\r\n]+\/[^/\r\n]+\/[^/\r\n]+(?:\/[^/\r\n]+)?$/u.test(value))
      )
        throw new Error(
          `Invalid 1Password reference for ${key}. Use a complete op:// reference as the value.`,
        );
      return { key, value, secret };
    });
}

async function plan(
  config: EnvSyncConfig,
  args: SyncArguments,
  root: string,
  dependencies: SyncDependencies,
): Promise<{ target: SyncTarget; operations: Operation[] }> {
  const target = config.targets[args.target];
  if (!target) throw new Error("Unknown envSync target. Select a configured target.");
  const environments =
    args.environment === "all" ? Object.keys(target.environments) : [args.environment];
  const operations: Operation[] = [];
  const sourceCache = new Map<SecretSource, Variable[]>();
  for (const environment of environments) {
    const name = target.environments[environment];
    if (!name) throw new Error("The selected environment is not mapped on this envSync target.");
    const source = config.sources[name]!;
    let variables = sourceCache.get(source);
    if (!variables) {
      variables = await sourceVariables(source, root, args, dependencies);
      sourceCache.set(source, variables);
    }
    const selected = args.variable
      ? variables.filter((variable) => variable.key === args.variable)
      : variables;
    if (!selected.length)
      throw new Error("The requested variable is missing from a selected envSync source.");
    if (target.provider === "github" && selected.some((variable) => !variable.secret))
      throw new Error("GitHub envSync sources must contain only 1Password secret references.");
    for (const variable of selected) {
      if (target.provider === "github" && variable.key.startsWith("GITHUB_"))
        throw new Error(
          `GitHub reserves secret names starting with GITHUB_: ${variable.key}. Exclude or rename this variable. No remote writes started.`,
        );
      if (target.provider === "vercel" && variable.secret && publicPrefix.test(variable.key))
        throw new Error(
          `${variable.key} has a browser-public prefix and cannot be synced as a secret. Exclude or rename it, or supply an intentional public literal in a template. No remote writes started.`,
        );
    }
    for (const variable of selected) operations.push({ ...variable, source, environment });
  }
  return { target, operations };
}

async function checkVercelScopes(
  target: Extract<SyncTarget, { provider: "vercel" }>,
  operations: Operation[],
  token: string,
  dependencies: SyncDependencies,
): Promise<void> {
  const url = new URL(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(target.project)}/env`,
  );
  url.searchParams.set("slug", target.team);
  url.searchParams.set("decrypt", "false");
  let entries: unknown[];
  try {
    const response = await (dependencies.fetch ?? fetch)(url, {
      redirect: "error",
      signal: dependencies.signal
        ? AbortSignal.any([dependencies.signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) throw new Error("Rejected response");
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("envs" in data) || !Array.isArray(data.envs))
      throw new Error("Invalid metadata");
    entries = data.envs;
  } catch {
    throw new Error(
      "Cannot check Vercel environment scopes. Check project/team access and token. No remote writes started.",
    );
  }
  for (const entry of entries) {
    if (
      !entry ||
      typeof entry !== "object" ||
      !("key" in entry) ||
      typeof entry.key !== "string" ||
      !("target" in entry) ||
      !Array.isArray(entry.target)
    )
      throw new Error("Invalid Vercel environment metadata. No remote writes started.");
    if ("gitBranch" in entry && entry.gitBranch) continue;
    const targets = entry.target;
    if (
      !operations.some(
        (operation) => operation.key === entry.key && targets.includes(operation.environment),
      )
    )
      continue;
    // An upsert of a shared record could affect an environment outside this selection.
    if (
      entry.target.length !== 1 ||
      ("customEnvironmentIds" in entry &&
        Array.isArray(entry.customEnvironmentIds) &&
        entry.customEnvironmentIds.length)
    )
      throw new Error(
        "A selected Vercel variable spans multiple environments. Split its scopes in Vercel before syncing. No remote writes started.",
      );
  }
}

async function writeVercel(
  target: Extract<SyncTarget, { provider: "vercel" }>,
  operation: Operation,
  token: string,
  dependencies: SyncDependencies,
): Promise<void> {
  const url = new URL(
    `https://api.vercel.com/v10/projects/${encodeURIComponent(target.project)}/env`,
  );
  url.searchParams.set("slug", target.team);
  url.searchParams.set("upsert", "true");
  try {
    const response = await (dependencies.fetch ?? fetch)(url, {
      method: "POST",
      redirect: "error",
      signal: dependencies.signal
        ? AbortSignal.any([dependencies.signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        key: operation.key,
        value: operation.value,
        type: operation.secret
          ? operation.environment === "development"
            ? "encrypted"
            : "sensitive"
          : "plain",
        visibility: operation.secret ? "secret" : "config",
        target: [operation.environment],
      }),
    });
    if (!response.ok) throw new Error("Rejected response");
    const result: unknown = await response.json();
    if (
      !result ||
      typeof result !== "object" ||
      !("failed" in result) ||
      !Array.isArray(result.failed) ||
      result.failed.length ||
      !("created" in result) ||
      !result.created
    )
      throw new Error("Unconfirmed write");
  } catch {
    // API bodies can echo values, and fetch errors can include credential-bearing headers.
    throw new Error(
      "Vercel did not confirm the write. Check project/team access, token and environment policies.",
    );
  }
}

export async function runSyncCommand(
  args: SyncArguments,
  io: Io,
  dependencies: SyncDependencies = {},
): Promise<number> {
  const root = dependencies.root ?? process.cwd();
  const config = await loadStackConfig(resolve(root, args.config));
  if (!config.envSync)
    throw new Error("Configure envSync in the dev-all YAML before running env-sync.");
  const { target, operations } = await plan(config.envSync, args, root, dependencies);
  const reported = new Set<string>();
  for (const operation of operations) {
    if (reported.has(operation.environment) || !operation.source.exclude?.length) continue;
    reported.add(operation.environment);
    io.stdout(
      `Excluding ${args.target}/${operation.environment}: ${operation.source.exclude.join(", ")}\n`,
    );
  }
  for (const operation of operations)
    io.stdout(
      operation.selector
        ? `Would select ${args.target}/${operation.environment}: ${operation.key} (field names discovered on apply)\n`
        : `${args.apply ? "Selected" : "Would set"} ${args.target}/${operation.environment}: ${operation.key} (${operation.secret ? "secret" : "public value"})\n`,
    );
  if (!args.apply) {
    io.stdout("Dry run: no secrets read or remote writes. Add --apply to set these variables.\n");
    return 0;
  }
  const token =
    target.provider === "vercel"
      ? (dependencies.environment ?? process.env)[target.tokenEnv]
      : undefined;
  if (target.provider === "vercel" && !token?.trim())
    throw new Error(
      `Set ${target.tokenEnv} in the process environment before applying Vercel sync.`,
    );
  if (target.provider === "vercel")
    await checkVercelScopes(target, operations, token!, dependencies);
  const execute = dependencies.execute ?? executeSecretProcess;
  const resolved = new Map<string, string>();
  // Resolve everything before starting remote writes; a missing source cannot cause half a sync.
  for (const operation of operations) {
    dependencies.signal?.throwIfAborted();
    if (!operation.secret || operation.resolved) continue;
    const key = JSON.stringify([operation.source.account, operation.value]);
    let value = resolved.get(key);
    if (value === undefined) {
      try {
        value = await execute({
          executable: "op",
          args: [
            "read",
            "--no-newline",
            ...(operation.source.account ? ["--account", operation.source.account] : []),
            operation.value,
          ],
          signal: dependencies.signal,
        });
      } catch {
        throw new Error(
          `Cannot resolve 1Password value for ${operation.key}. Check source access and authentication. No remote writes started.`,
        );
      }
      if (!value.trim())
        throw new Error(`Empty 1Password value for ${operation.key}. No remote writes started.`);
      resolved.set(key, value);
    }
    operation.value = value;
  }
  let completed = 0;
  for (const operation of operations) {
    try {
      dependencies.signal?.throwIfAborted();
      if (target.provider === "vercel") await writeVercel(target, operation, token!, dependencies);
      else
        await execute({
          executable: "gh",
          args: [
            "secret",
            "set",
            operation.key,
            "--repo",
            target.repo,
            "--env",
            operation.environment,
            "--app",
            "actions",
          ],
          input: operation.value,
          signal: dependencies.signal,
        });
    } catch {
      throw new Error(
        `env-sync stopped at ${args.target}/${operation.environment}: ${operation.key}; ${completed}/${operations.length} writes confirmed. This unconfirmed write may also have applied. Check provider state before retrying; earlier writes are retained.`,
      );
    }
    completed++;
    io.stdout(`Set ${args.target}/${operation.environment}: ${operation.key}\n`);
  }
  io.stdout(
    `Confirmed ${completed} writes. Existing deployments may need redeployment to use the new values.\n`,
  );
  return 0;
}
