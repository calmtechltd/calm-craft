import type { Provenance } from "../diff/model";

export type ViewArguments = {
  command: "view";
  source: string;
  diff: boolean;
  base?: string;
  branch?: string;
  openBrowser: boolean;
  port?: number;
  provenance?: Provenance[];
};

export type CliArguments = ViewArguments | { command: "help" } | { command: "version" };

export class CliArgumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliArgumentError";
  }
}

function readValue(args: string[], index: number, option: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new CliArgumentError(`${option} requires a value.`);
  return value;
}

export const ALL_PROVENANCE: Provenance[] = ["committed", "staged", "unstaged", "untracked"];

function parseProvenance(value: string): Provenance[] {
  const requested = [...new Set(value.split(",").map((item) => item.trim()))];
  if (
    requested.length === 0 ||
    requested.some((item) => !ALL_PROVENANCE.includes(item as Provenance))
  ) {
    throw new CliArgumentError(
      "--provenance accepts committed, staged, unstaged, and untracked as a comma-separated list.",
    );
  }
  return ALL_PROVENANCE.filter((item) => requested.includes(item));
}

export function parseCliArguments(args: string[], cwd = process.cwd()): CliArguments {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") return { command: "help" };
  if (args[0] === "--version" || args[0] === "-v") return { command: "version" };
  if (args[0] !== "view") throw new CliArgumentError(`Unknown command: ${args[0]}`);
  if (args.includes("--help") || args.includes("-h")) return { command: "help" };

  let source: string | undefined;
  let diff = false;
  let base: string | undefined;
  let branch: string | undefined;
  let openBrowser = true;
  let port: number | undefined;
  let provenance: Provenance[] | undefined;
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    if (argument === "--diff") diff = true;
    else if (argument === "--no-open") openBrowser = false;
    else if (argument === "--base") {
      base = readValue(args, index, argument);
      diff = true;
      index += 1;
    } else if (argument === "--branch") {
      branch = readValue(args, index, argument);
      index += 1;
    } else if (argument === "--provenance") {
      provenance = parseProvenance(readValue(args, index, argument));
      diff = true;
      index += 1;
    } else if (argument === "--port") {
      const value = readValue(args, index, argument);
      port = Number(value);
      if (!Number.isInteger(port) || port < 1 || port > 65_535) {
        throw new CliArgumentError("--port must be an integer from 1 to 65535.");
      }
      index += 1;
    } else if (argument.startsWith("-")) {
      throw new CliArgumentError(`Unknown option: ${argument}`);
    } else if (source) {
      throw new CliArgumentError("view accepts one repository path.");
    } else {
      source = argument;
    }
  }
  return {
    command: "view",
    source: source ?? cwd,
    diff,
    base,
    branch,
    openBrowser,
    port,
    provenance,
  };
}

export const HELP_TEXT = `CalmCraft — local product-spec visualizer

Usage:
  calmcraft view [path] [options]
  calmcraft --help
  calmcraft --version

Options:
  --diff              Open branch review against an inferred base
  --base <ref>        Compare against an explicit Git base
  --provenance <list> Start with committed, staged, unstaged, and/or untracked work
  --no-open           Print the session URL without opening a browser
  --port <number>     Request one loopback port; conflicts fail
  --branch <name>     Select a branch for a remote source

Defaults and privacy:
  path defaults to the current repository. CalmCraft binds to 127.0.0.1,
  sends no telemetry, and never writes a selected local repository. A supplied
  remote URL uses installed Git authentication and a clone removed on shutdown.

Examples:
  calmcraft view
  calmcraft view ../another-project --no-open
  calmcraft view --diff --base origin/main
  calmcraft view --diff --provenance committed,staged
  calmcraft view git@github.com:team/private-specs.git --branch feature/review --diff --base main
`;
