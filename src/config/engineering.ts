import { realpath } from "node:fs/promises";
import { join, relative } from "node:path";

import Ajv from "ajv";
import { LineCounter, parseDocument } from "yaml";

import schema from "../../assets/engineering/config.schema.json" with { type: "json" };
import { ConfigError, readConfigFile, repositoryPath } from "./files";

export type EngineeringCommand = { cwd: string; argv?: string[]; shell?: string };
export type EngineeringGate = {
  id: string;
  command: string;
  prerequisites: string[];
  context: Record<string, string>;
};
export type TestSuite = {
  files: string[];
  framework?: string;
  location?: string;
  command?: string;
  targeted?: string;
  legacy?: boolean;
};
export type ConfigDiagnostic = { field: string; line: number; column: number; message: string };
export type EngineeringConfig = {
  version: 1 | 2;
  commands: Record<string, EngineeringCommand>;
  gates: EngineeringGate[];
  suites: Record<string, TestSuite>;
  shared: { specVersion?: 1; specsRoot?: string; defaultBranch?: string; reviewBase?: string };
  warnings: ConfigDiagnostic[];
};

type RawConfig = {
  version: 1 | 2;
  spec_version?: 1;
  paths?: Record<string, string>;
  commands?: Record<string, string | { argv?: string[]; shell?: string; cwd?: string }>;
  non_gating?: Record<string, string>;
  gates?: (
    | string
    | { id: string; command: string; prerequisites?: string[]; context?: Record<string, string> }
  )[];
  vcs?: { default_branch?: string; review_base?: string };
  tickets?: { provider?: string; pattern?: string; url?: string };
  tests?: {
    suites?: Record<string, TestSuite>;
    unit?: string;
    integration?: string;
    location?: string;
  };
};

const ajv = new Ajv({ strict: false, allErrors: true });
const validate = ajv.compile(schema);
// Both full validation and the estate projection use the same schema fields.
const validateShared = ajv.compile({
  type: "object",
  required: ["version"],
  additionalProperties: false,
  properties: Object.fromEntries(
    ["version", "spec_version", "paths", "vcs"].map((name) => [
      name,
      schema.properties[name as keyof typeof schema.properties],
    ]),
  ),
  definitions: schema.definitions,
});

function hasTemplate(command: EngineeringCommand): boolean {
  return [command.shell, command.cwd, ...(command.argv ?? [])].some((part) =>
    part?.includes("{file}"),
  );
}

export function parseEngineeringConfig(
  source: string,
  label = ".engineering/config.yaml",
  projection = false,
): EngineeringConfig {
  const lines = new LineCounter();
  const document = parseDocument(source, { lineCounter: lines, uniqueKeys: true });
  const locate = (field: string): ConfigDiagnostic => {
    const node = document.getIn(field.split("/").filter(Boolean), true) as
      | { range?: number[] }
      | undefined;
    const point = lines.linePos(node?.range?.[0] ?? 0);
    return { field: field || "/", line: point.line, column: point.col, message: "" };
  };
  const fail: (field: string, message: string) => never = (field, message) => {
    const point = locate(field);
    throw new ConfigError(`${label}:${point.line}:${point.column} ${point.field}: ${message}`);
  };
  if (document.errors.length) {
    const error = document.errors[0]!;
    const point = lines.linePos(error.pos[0]);
    throw new ConfigError(
      `${label}:${point.line}:${point.col} YAML ${error.code}; repair the structure or duplicate key.`,
    );
  }
  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 50 });
  } catch {
    throw new ConfigError(`${label}: YAML aliases exceed the supported limit.`);
  }
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : undefined;
  const selected =
    projection && record
      ? Object.fromEntries(
          ["version", "spec_version", "paths", "vcs"]
            .filter((key) => Object.hasOwn(record, key))
            .map((key) => [key, record[key]]),
        )
      : value;
  if (projection && selected && typeof selected === "object") {
    const fields = selected as Record<string, unknown>;
    for (const [section, names] of [
      ["paths", ["specs"]],
      ["vcs", ["default_branch", "review_base"]],
    ] as const) {
      const metadata = fields[section];
      if (metadata && typeof metadata === "object" && !Array.isArray(metadata)) {
        const members = metadata as Record<string, unknown>;
        fields[section] = Object.fromEntries(
          names.filter((name) => Object.hasOwn(members, name)).map((name) => [name, members[name]]),
        );
      }
    }
  }
  const validator = projection ? validateShared : validate;
  if (!validator(selected)) {
    const error =
      validator.errors?.find((item) => item.keyword === "propertyNames") ??
      validator.errors?.find((item) => !["if", "anyOf", "oneOf"].includes(item.keyword)) ??
      validator.errors?.[0];
    const field =
      `${error?.instancePath ?? ""}/${error?.keyword === "required" ? error.params.missingProperty : error?.keyword === "additionalProperties" ? error.params.additionalProperty : error?.keyword === "propertyNames" ? error.params.propertyName : ""}`.replace(
        /\/$/u,
        "",
      );
    fail(
      field,
      `invalid configuration (${error?.keyword ?? "shape"}); see the engineering configuration reference.`,
    );
  }
  const raw = selected as RawConfig;
  const pathAt = (pathValue: string, field: string, allowRoot = false): string => {
    try {
      return repositoryPath(pathValue, field, allowRoot);
    } catch {
      return fail(field, "must be a relative path beneath the repository root.");
    }
  };
  const paths = Object.fromEntries(
    Object.entries(raw.paths ?? {}).map(([key, path]) => [key, pathAt(path, `paths/${key}`)]),
  );
  const shared: EngineeringConfig["shared"] = {
    specVersion: raw.spec_version,
    specsRoot: paths.specs,
    defaultBranch: raw.vcs?.default_branch?.trim(),
    reviewBase: raw.vcs?.review_base?.trim(),
  };
  if (
    shared.defaultBranch &&
    (/\s/u.test(shared.defaultBranch) || shared.defaultBranch.startsWith("refs/"))
  )
    fail("vcs/default_branch", "expected a plain branch name.");
  const result: EngineeringConfig = {
    version: raw.version,
    commands: {},
    gates: [],
    suites: {},
    shared,
    warnings: [],
  };
  if (projection) return result;
  if (raw.version === 1) {
    for (const key of Object.keys(record!)) {
      if (!Object.hasOwn(schema.properties, key))
        result.warnings.push({
          ...locate(key),
          message: "legacy extension is preserved but not validated.",
        });
    }
  }
  const commands = { ...raw.commands };
  for (const [name, command] of Object.entries(raw.non_gating ?? {})) {
    if (Object.hasOwn(commands, name) && commands[name] !== command)
      fail(`non_gating/${name}`, "conflicts with the command registry definition.");
    Object.defineProperty(commands, name, {
      value: command,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  result.commands = Object.fromEntries(
    Object.entries(commands).map(([name, command]) => {
      const normalized =
        typeof command === "string"
          ? { shell: command, cwd: "." }
          : {
              ...command,
              cwd: pathAt(command.cwd ?? ".", `commands/${name}/cwd`, true),
            };
      if (normalized.argv && !normalized.argv[0]?.trim())
        fail(`commands/${name}/argv`, "executable must be nonempty.");
      return [name, normalized];
    }),
  );
  const commandAt = (name: string, field: string): EngineeringCommand => {
    if (!Object.hasOwn(result.commands, name)) fail(field, "references an unknown command.");
    return result.commands[name]!;
  };
  const ids = new Set<string>();
  for (const [index, gate] of (raw.gates ?? []).entries()) {
    const normalized =
      typeof gate === "string"
        ? { id: gate, command: gate, prerequisites: [], context: {} }
        : { ...gate, prerequisites: gate.prerequisites ?? [], context: gate.context ?? {} };
    if (ids.has(normalized.id)) fail(`gates/${index}`, "duplicate gate ID.");
    ids.add(normalized.id);
    for (const name of [normalized.command, ...normalized.prerequisites]) {
      if (hasTemplate(commandAt(name, `gates/${index}`)))
        fail(`gates/${index}`, "gate commands cannot contain a file template.");
    }
    if (normalized.prerequisites.includes(normalized.command))
      fail(`gates/${index}/prerequisites`, "a gate cannot be its own prerequisite.");
    result.gates.push(normalized);
  }
  if (raw.version === 1) {
    if (raw.tests || Object.hasOwn(commands, "test") || Object.hasOwn(commands, "test_file"))
      result.suites.legacy = {
        files: [raw.tests?.unit, raw.tests?.integration].filter(
          (pattern): pattern is string => pattern !== undefined,
        ),
        location: raw.tests?.location,
        command: Object.hasOwn(commands, "test") ? "test" : undefined,
        targeted: Object.hasOwn(commands, "test_file") ? "test_file" : undefined,
        legacy: true,
      };
  } else result.suites = raw.tests?.suites ?? {};
  for (const [name, suite] of Object.entries(result.suites)) {
    const field = raw.version === 1 ? "tests" : `tests/suites/${name}`;
    for (const [index, pattern] of suite.files.entries())
      pathAt(pattern, `${field}/files/${index}`);
    if (suite.command && hasTemplate(commandAt(suite.command, `${field}/command`)))
      fail(`${field}/command`, "full-suite command cannot contain a file template.");
    if (suite.targeted) {
      const command = commandAt(suite.targeted, `${field}/targeted`);
      if (suite.legacy) {
        if (command.shell?.match(/\{file\}/gu)?.length !== 1)
          fail(`${field}/targeted`, "legacy targeted command must have one file placeholder.");
      } else {
        const args = command.argv;
        if (
          !args ||
          args.filter((arg) => arg === "{file}").length !== 1 ||
          args[0] === "{file}" ||
          args.some((arg) => arg.includes("{file}") && arg !== "{file}") ||
          command.cwd.includes("{file}")
        )
          fail(
            `${field}/targeted`,
            "targeted command requires exactly one whole file argument in argv.",
          );
      }
    }
  }
  const tickets = raw.tickets;
  if (tickets?.provider && !["none", "github"].includes(tickets.provider)) {
    if (!tickets.pattern || !tickets.url?.includes("{id}"))
      fail(
        "tickets",
        "provider requires a pattern and a URL template containing an ID placeholder.",
      );
    try {
      RegExp(tickets.pattern);
    } catch {
      fail("tickets/pattern", "invalid regular expression.");
    }
  }
  return result;
}

export async function loadEngineeringConfig(
  root: string,
  projection = false,
  path = join(root, ".engineering/config.yaml"),
  optional = true,
): Promise<EngineeringConfig | undefined> {
  const source = await readConfigFile(root, path, optional);
  return source === undefined
    ? undefined
    : parseEngineeringConfig(
        source,
        relative(await realpath(root), await realpath(path)).replaceAll("\\", "/"),
        projection,
      );
}
