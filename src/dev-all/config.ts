import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { validateEnvSyncConfig, type EnvSyncConfig } from "../env-sync/config";

export type PortMap = Record<string, number>;
export type Service = {
  command: string[];
  shared: boolean;
  env: Record<string, string>;
  dependsOn: string[];
  reloadEnv: boolean;
  ready: { url: string; timeoutMs: number };
};
export type StackConfig = {
  version: 1;
  project: string;
  slots: number;
  envFiles: string[];
  ports: Record<string, { base: number; step: number; shared: boolean }>;
  services: Record<string, Service>;
  envSync?: EnvSyncConfig;
};
const identifier = /^[a-z][a-z0-9-]{0,63}$/u;
function object(input: unknown, keys?: string[]): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Expected a configuration object.");
  const data = input as Record<string, unknown>;
  if (keys && Object.keys(data).some((key) => !keys.includes(key)))
    throw new Error("Unsupported dev-all configuration field.");
  return data;
}
function integer(input: unknown, fallback: number, min: number, max: number): number {
  const value = input ?? fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max)
    throw new Error("Invalid dev-all integer setting.");
  return value;
}
function text(input: unknown): string {
  if (typeof input !== "string" || !input || input.includes("\0"))
    throw new Error("Expected a non-empty configuration string.");
  return input;
}
function strings(input: unknown): string[] {
  if (!Array.isArray(input)) throw new Error("Expected a configuration list.");
  return input.map(text);
}
export function slotPorts(config: StackConfig, slot: number): PortMap {
  return Object.fromEntries(
    Object.entries(config.ports).map(([key, value]) => [
      key,
      value.base + (value.shared ? 0 : slot * value.step),
    ]),
  );
}
export function expand(input: string, ports: PortMap): string {
  const result = input.replace(
    /\$\{(ports|urls)\.([a-z][a-z0-9-]*)\}/gu,
    (_, group: string, key: string) => {
      const value = ports[key];
      if (value === undefined) throw new Error(`Unknown port reference: ${key}`);
      return group === "ports" ? String(value) : `http://localhost:${value}`;
    },
  );
  if (result.includes("${"))
    throw new Error("Unsupported placeholder. Use ${ports.name} or ${urls.name}.");
  return result;
}
export function serviceOrder(config: StackConfig): string[] {
  const order: string[] = [],
    active = new Set<string>(),
    visited = new Set<string>();
  function visit(key: string): void {
    const entry = config.services[key];
    if (!entry) throw new Error(`Unknown service dependency: ${key}`);
    if (active.has(key)) throw new Error(`Service dependency cycle at ${key}`);
    if (visited.has(key)) return;
    active.add(key);
    for (const dependency of entry.dependsOn) visit(dependency);
    active.delete(key);
    visited.add(key);
    order.push(key);
  }
  for (const key of Object.keys(config.services)) visit(key);
  return order;
}
export function validateStackConfig(input: unknown): StackConfig {
  const raw = object(input, [
    "version",
    "project",
    "slots",
    "envFiles",
    "ports",
    "services",
    "envSync",
  ]);
  if (raw.version !== 1)
    throw new Error("Unsupported dev-all configuration version. Use version: 1.");
  const project = text(raw.project);
  if (!identifier.test(project)) throw new Error("Invalid dev-all project identifier.");
  const slots = integer(raw.slots, 11, 1, 100);
  const envFiles = strings(
    raw.envFiles ?? [".env", ".env.local", ".env.development", ".env.development.local"],
  );
  if (envFiles.some((file) => !/^\.env(?:\.[a-zA-Z0-9.-]+)?$/u.test(file)))
    throw new Error("Environment files must be local .env filenames.");
  const ports: StackConfig["ports"] = Object.create(null);
  for (const [key, entryInput] of Object.entries(object(raw.ports))) {
    if (!identifier.test(key)) throw new Error("Invalid port identifier.");
    const value = object(entryInput, ["base", "step", "shared"]);
    if (value.shared !== undefined && typeof value.shared !== "boolean")
      throw new Error("Port shared must be a boolean.");
    ports[key] = {
      shared: value.shared === true,
      base: integer(value.base, 0, 1024, 65535),
      step: integer(value.step, 1, 1, 65535),
    };
  }
  const services: StackConfig["services"] = Object.create(null);
  for (const [key, entryInput] of Object.entries(object(raw.services))) {
    if (!identifier.test(key)) throw new Error("Invalid service identifier.");
    const value = object(entryInput, [
      "command",
      "env",
      "dependsOn",
      "reloadEnv",
      "ready",
      "shared",
    ]);
    if (value.shared !== undefined && typeof value.shared !== "boolean")
      throw new Error("Service shared must be a boolean.");
    const shared = value.shared === true;
    const command = strings(value.command ?? []);
    if (shared && (command.length || value.reloadEnv))
      throw new Error("Shared services are checked only; omit command and reloadEnv.");
    if (!shared && !command.length) throw new Error("Service commands need an executable.");
    const env: Record<string, string> = Object.create(null);
    for (const [name, value_] of Object.entries(object(value.env ?? {}))) {
      if (!/^[A-Z_][A-Z0-9_]*$/u.test(name) || typeof value_ !== "string")
        throw new Error("Invalid service environment setting.");
      env[name] = value_;
    }
    const dependsOn = strings(value.dependsOn ?? []);
    if (dependsOn.some((name) => !identifier.test(name)))
      throw new Error("Invalid service dependency.");
    if (value.reloadEnv !== undefined && typeof value.reloadEnv !== "boolean")
      throw new Error("reloadEnv must be a boolean.");
    const ready = object(value.ready, ["url", "timeoutMs"]);
    services[key] = {
      command,
      shared,
      env,
      dependsOn,
      reloadEnv: value.reloadEnv === true,
      ready: { url: text(ready.url), timeoutMs: integer(ready.timeoutMs, 60000, 100, 120000) },
    };
  }
  if (!Object.keys(ports).length || !Object.keys(services).length)
    throw new Error("Configure at least one service and port.");
  const config: StackConfig = { version: 1, project, slots, envFiles, ports, services };
  if (raw.envSync !== undefined) config.envSync = validateEnvSyncConfig(raw.envSync);
  const used = new Set<number>();
  for (let slot = 0; slot < slots; slot++) {
    const mapped = slotPorts(config, slot);
    for (const [key, value] of Object.entries(mapped)) {
      if (config.ports[key]!.shared && slot > 0) continue;
      if (value > 65535 || used.has(value))
        throw new Error("Port ranges overlap or exceed 65535. Each slot needs distinct ports.");
      used.add(value);
    }
    for (const entry of Object.values(services)) {
      for (const value of [...entry.command, ...Object.values(entry.env)]) expand(value, mapped);
      let url: URL;
      try {
        url = new URL(expand(entry.ready.url, mapped));
      } catch {
        throw new Error("Invalid service readiness URL.");
      }
      if (
        url.protocol !== "http:" ||
        url.hostname !== "localhost" ||
        url.username ||
        url.password ||
        !Object.values(mapped).includes(Number(url.port))
      )
        throw new Error("Readiness URLs must use a configured localhost HTTP port.");
      const readyPort = Object.keys(mapped).find((key) => mapped[key] === Number(url.port))!;
      if (entry.shared !== config.ports[readyPort]!.shared)
        throw new Error(
          "Shared services must use a shared readiness port; managed services need an isolated readiness port.",
        );
    }
  }
  serviceOrder(config);
  return config;
}
export async function loadStackConfig(path: string): Promise<StackConfig> {
  let input: unknown;
  try {
    input = parse(await readFile(path, "utf8"), { maxAliasCount: 0 });
  } catch {
    throw new Error("Cannot read dev-all YAML configuration. Check its path and syntax.");
  }
  return validateStackConfig(input);
}
