import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadConfig } from "../config";
import { createBranchReview } from "../diff";
import { discoverRepository, loadFilesystemSnapshot, redactSensitiveText } from "../git";
import { CALMCRAFT_VERSION } from "../meta";
import { startLocalSession, type LocalSession, type SessionSource } from "../server";
import { HELP_TEXT, parseCliArguments, type ViewArguments } from "./arguments";
import { openBrowser, type BrowserOpener } from "./browser";

export type CliIo = {
  stdout: (value: string) => void;
  stderr: (value: string) => void;
};

export type ViewDependencies = {
  assetsRoot?: string;
  browserOpener?: BrowserOpener;
  io?: CliIo;
  nodeVersion?: string;
};

const DEFAULT_IO: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

function assertSupportedNode(version: string): void {
  const major = Number(version.replace(/^v/u, "").split(".")[0]);
  if (!Number.isInteger(major) || major < 22) {
    throw new Error(`CalmCraft requires Node.js 22 or newer; found ${version}.`);
  }
}

function isRemoteSource(source: string): boolean {
  return /^(?:https?:\/\/|ssh:\/\/|git@[^:]+:)/iu.test(source);
}

function collectSources(data: unknown): SessionSource[] {
  const sources = new Map<string, SessionSource>();
  const visit = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const record = value as Record<string, unknown>;
    for (const [key, item] of Object.entries(record)) {
      if (
        (["beforeSource", "afterSource", "diagramSource"].includes(key) ||
          (key === "source" && typeof record.sourceHash === "string")) &&
        typeof item === "string"
      ) {
        const pathKey =
          key === "beforeSource"
            ? record.beforePath
            : key === "afterSource"
              ? record.afterPath
              : key === "diagramSource"
                ? record.diagramPath
                : record.path;
        const path = typeof pathKey === "string" ? pathKey : "source";
        sources.set(`${path}\u0000${item}`, { path, content: item });
      } else {
        visit(item);
      }
    }
  };
  visit(data);
  return [...sources.values()];
}

function defaultAssetsRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../ui");
}

export async function startViewCommand(
  arguments_: ViewArguments,
  dependencies: ViewDependencies = {},
): Promise<LocalSession> {
  assertSupportedNode(dependencies.nodeVersion ?? process.version);
  if (isRemoteSource(arguments_.source)) {
    throw new Error("Remote repository sessions are not available in this release yet.");
  }
  if (arguments_.branch) throw new Error("--branch is only valid for a remote repository source.");

  const io = dependencies.io ?? DEFAULT_IO;
  const repository = await discoverRepository(arguments_.source);
  const config = await loadConfig(repository.root);
  const data = arguments_.diff
    ? {
        mode: "review",
        review: await createBranchReview(repository.root, {
          explicitBase: arguments_.base,
          configuredBase: config.defaultBase,
          specsRoot: config.specsRoot,
        }),
      }
    : {
        mode: "estate",
        snapshot: await loadFilesystemSnapshot(repository.root, config.specsRoot),
      };
  const session = await startLocalSession({
    assetsRoot: dependencies.assetsRoot ?? defaultAssetsRoot(),
    data,
    sources: collectSources(data),
    port: arguments_.port,
  });
  io.stdout(`CalmCraft ${CALMCRAFT_VERSION}\n${session.url}\n`);
  if (arguments_.openBrowser) {
    try {
      await (dependencies.browserOpener ?? openBrowser)(session.url);
    } catch (error) {
      await session.close();
      throw new Error(`Could not open the browser: ${redactSensitiveText(String(error))}`, {
        cause: error,
      });
    }
  }
  return session;
}

export async function runCli(args: string[], dependencies: ViewDependencies = {}): Promise<number> {
  const io = dependencies.io ?? DEFAULT_IO;
  try {
    const parsed = parseCliArguments(args);
    if (parsed.command === "help") {
      io.stdout(HELP_TEXT);
      return 0;
    }
    if (parsed.command === "version") {
      io.stdout(`${CALMCRAFT_VERSION}\n`);
      return 0;
    }
    const session = await startViewCommand(parsed, dependencies);
    const stop = (): void => {
      void session.close();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    await session.closed;
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
    return 0;
  } catch (error) {
    io.stderr(
      `CalmCraft: ${redactSensitiveText(error instanceof Error ? error.message : String(error))}\nRun calmcraft --help for usage.\n`,
    );
    return 1;
  }
}
