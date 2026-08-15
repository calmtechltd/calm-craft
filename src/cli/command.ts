import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadConfig } from "../config";
import { createBranchReview } from "../diff";
import {
  cloneRemoteRepository,
  discoverRepository,
  isRemoteSource,
  loadFilesystemSnapshot,
  prepareRemoteComparison,
  redactSensitiveText,
  type RemoteClone,
} from "../git";
import { CALMCRAFT_VERSION } from "../meta";
import { startLocalSession, type LocalSession, type SessionSource } from "../server";
import { buildStaticEstate } from "../static/build";
import {
  ALL_PROVENANCE,
  HELP_TEXT,
  parseCliArguments,
  type GenerateArguments,
  type ViewArguments,
} from "./arguments";
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
  remoteEnvironment?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
};

const DEFAULT_IO: CliIo = {
  stdout: (value) => process.stdout.write(value),
  stderr: (value) => process.stderr.write(value),
};

function assertSupportedNode(version: string): void {
  const major = Number(version.replace(/^v/u, "").split(".")[0]);
  if (major !== 22 && major !== 24) {
    throw new Error(`CalmCraft requires Node.js 22 or 24; found ${version}.`);
  }
}

export function collectSources(data: unknown): SessionSource[] {
  const sources = new Map<string, SessionSource>();
  const visit = (value: unknown, parentChangeId?: string): void => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, parentChangeId);
      return;
    }
    const record = value as Record<string, unknown>;
    const changeId =
      typeof record.id === "string" && typeof record.provenance === "string" && record.evidence
        ? record.id
        : parentChangeId;
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
        const sourceKey = `${path}\u0000${item}`;
        const source = sources.get(sourceKey) ?? { path, content: item };
        const context =
          changeId && (key === "beforeSource" || key === "afterSource")
            ? `${changeId}:${key === "beforeSource" ? "before" : "after"}`
            : undefined;
        if (context) source.contexts = [...new Set([...(source.contexts ?? []), context])];
        else source.generic = true;
        sources.set(sourceKey, source);
      } else {
        visit(item, changeId);
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
  const io = dependencies.io ?? DEFAULT_IO;
  const remoteSource = isRemoteSource(arguments_.source);
  if (arguments_.branch && !remoteSource)
    throw new Error("--branch is only valid for a remote repository source.");

  let remote: RemoteClone | undefined;
  try {
    remote = remoteSource
      ? await cloneRemoteRepository(arguments_.source, arguments_.branch, {
          environment: dependencies.remoteEnvironment,
          signal: dependencies.signal,
        })
      : undefined;
    const repositoryRoot = remote?.checkout ?? arguments_.source;
    const repository = await discoverRepository(repositoryRoot);
    const config = await loadConfig(repository.root);
    const remoteComparison =
      remote && arguments_.diff
        ? await prepareRemoteComparison(
            remote,
            { explicitBase: arguments_.base, configuredBase: config.defaultBase },
            {
              environment: dependencies.remoteEnvironment,
              signal: dependencies.signal,
            },
          )
        : undefined;
    const repositorySource = remote
      ? {
          kind: "remote" as const,
          displayUrl: remote.remote.display,
          branch: remote.branch,
          storage: "temporary" as const,
          cleanup: "removed-on-stop" as const,
        }
      : { kind: "local" as const };
    const data = arguments_.diff
      ? {
          mode: "review" as const,
          review: await createBranchReview(repository.root, {
            explicitBase: remoteComparison?.explicitBase ?? arguments_.base,
            configuredBase: remoteComparison?.configuredBase ?? config.defaultBase,
            specsRoot: config.specsRoot,
          }),
          initialProvenance: arguments_.provenance ?? ALL_PROVENANCE,
          repositorySource,
        }
      : {
          mode: "estate" as const,
          snapshot: await loadFilesystemSnapshot(repository.root, config.specsRoot),
          repositorySource,
        };
    const localSession = await startLocalSession({
      assetsRoot: dependencies.assetsRoot ?? defaultAssetsRoot(),
      data,
      sources: collectSources(data),
      port: arguments_.port,
    });
    let cleanupPromise: Promise<void> | undefined;
    const cleanup = (): Promise<void> => {
      cleanupPromise ??= remote?.cleanup() ?? Promise.resolve();
      return cleanupPromise;
    };
    const close = async (): Promise<void> => {
      try {
        await localSession.close();
      } finally {
        await cleanup();
      }
    };
    const session: LocalSession = {
      ...localSession,
      close,
      closed: localSession.closed.then(cleanup),
    };
    const stopForCancellation = (): void => {
      void session.close();
    };
    dependencies.signal?.addEventListener("abort", stopForCancellation, { once: true });
    const removeCancellationListener = (): void =>
      dependencies.signal?.removeEventListener("abort", stopForCancellation);
    void session.closed.then(removeCancellationListener, removeCancellationListener);
    if (dependencies.signal?.aborted) {
      await session.close();
      throw new Error("CalmCraft session startup was cancelled.");
    }
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
  } catch (error) {
    await remote?.cleanup();
    throw error;
  }
}

export async function runGenerateCommand(
  arguments_: GenerateArguments,
  dependencies: ViewDependencies = {},
): Promise<string> {
  assertSupportedNode(dependencies.nodeVersion ?? process.version);
  const io = dependencies.io ?? DEFAULT_IO;
  const repository = await discoverRepository(arguments_.source);
  const out =
    arguments_.out ??
    join(await mkdtemp(join(tmpdir(), "calmcraft-estate-")), "calmcraft-estate.html");
  const result = await buildStaticEstate({
    source: repository.root,
    out,
    assetsRoot: dependencies.assetsRoot ?? defaultAssetsRoot(),
    diff: arguments_.diff,
    base: arguments_.base,
    provenance: arguments_.provenance ?? ALL_PROVENANCE,
  });
  const megabytes = (result.bytes / 1024 / 1024).toFixed(2);
  const comparison =
    result.mode === "review"
      ? result.reviewAvailable
        ? `${result.semanticChanges} semantic changes · `
        : "comparison base needed · "
      : "";
  io.stdout(
    `CalmCraft ${CALMCRAFT_VERSION}\n${result.out}\n${result.specs} specifications · ${comparison}${megabytes} MB\n`,
  );
  if (arguments_.openBrowser) {
    await (dependencies.browserOpener ?? openBrowser)(pathToFileURL(result.out).href);
  }
  return result.out;
}

export async function runCli(args: string[], dependencies: ViewDependencies = {}): Promise<number> {
  const io = dependencies.io ?? DEFAULT_IO;
  const cancellation = new AbortController();
  let session: LocalSession | undefined;
  const stop = (): void => {
    cancellation.abort();
    void session?.close();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
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
    if (parsed.command === "generate") {
      await runGenerateCommand(parsed, dependencies);
      return 0;
    }
    session = await startViewCommand(parsed, {
      ...dependencies,
      signal: dependencies.signal ?? cancellation.signal,
    });
    await session.closed;
    return 0;
  } catch (error) {
    io.stderr(
      `CalmCraft: ${redactSensitiveText(error instanceof Error ? error.message : String(error))}\nRun calmcraft --help for usage.\n`,
    );
    return 1;
  } finally {
    process.off("SIGINT", stop);
    process.off("SIGTERM", stop);
  }
}
