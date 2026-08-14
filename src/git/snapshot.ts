import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { isSpecMarkdownPath, loadSpecEstate, loadSpecEstateFromSources } from "../specs";
import { runReadOnlyGit } from "./command";
import type { RepositoryInfo, RepositorySnapshot } from "./model";
import { discoverRepository } from "./repository";

const SNAPSHOT_EXTENSIONS = [".md", ".flow.yaml", ".flow.mmd"] as const;

type IndexEntry = {
  hash: string;
  path: string;
};

function normalizeSpecsRoot(specsRoot: string): string {
  const normalized = specsRoot.replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/$/u, "");
  const segments = normalized.split("/");
  if (
    !normalized ||
    normalized.startsWith("/") ||
    /^[a-z]:/iu.test(normalized) ||
    normalized.startsWith(":") ||
    normalized.includes("\0") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Specs root must be a relative repository path: ${specsRoot}`);
  }
  return normalized;
}

function isSnapshotSource(path: string): boolean {
  return SNAPSHOT_EXTENSIONS.some((extension) => path.endsWith(extension));
}

function safeRepositoryPath(root: string, path: string): string | undefined {
  const absolutePath = resolve(root, path);
  const fromRoot = relative(root, absolutePath);
  if (
    fromRoot === "" ||
    fromRoot === ".." ||
    fromRoot.startsWith(`..${sep}`) ||
    isAbsolute(fromRoot)
  ) {
    return undefined;
  }
  return absolutePath;
}

async function mapConcurrent<T, U>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<U>,
): Promise<U[]> {
  const results = Array.from({ length: values.length }) as U[];
  let nextIndex = 0;
  async function worker(): Promise<void> {
    const index = nextIndex;
    nextIndex += 1;
    if (index >= values.length) return;
    results[index] = await mapper(values[index] as T);
    return worker();
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function repositorySpecPath(specsRoot: string, path: string): string | undefined {
  const prefix = `${specsRoot}/`;
  if (!path.startsWith(prefix)) return undefined;
  const relativePath = path.slice(prefix.length);
  return isSpecMarkdownPath(relativePath) ? path : undefined;
}

function snapshotSourcePaths(estate: RepositorySnapshot["estate"], specsRoot: string): string[] {
  const paths = estate.specs.flatMap((spec) => [
    `${specsRoot}/${spec.path}`,
    ...spec.flows.flatMap((flow) => [
      `${specsRoot}/${flow.path}`,
      `${specsRoot}/${flow.diagramPath}`,
    ]),
  ]);
  return [...new Set(paths)].toSorted();
}

async function resolveCommit(repository: RepositoryInfo, revision: string): Promise<string> {
  return (
    await runReadOnlyGit(repository.root, [
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${revision}^{commit}`,
    ])
  ).stdout.trim();
}

async function readIndexEntries(
  repository: RepositoryInfo,
  specsRoot: string,
): Promise<IndexEntry[]> {
  const result = await runReadOnlyGit(repository.root, ["ls-files", "-s", "-z", "--", specsRoot]);
  return result.stdout
    .split("\0")
    .flatMap((record) => {
      const match = record.match(/^\d+ ([a-f0-9]+) 0\t(.+)$/u);
      if (!match?.[1] || !match[2] || !isSnapshotSource(match[2])) return [];
      return [{ hash: match[1], path: match[2] }];
    })
    .toSorted((left, right) => left.path.localeCompare(right.path));
}

async function estateFromRepositorySources(
  repository: RepositoryInfo,
  specsRoot: string,
  entries: readonly (readonly [string, string])[],
) {
  const sourcePrefix = `${specsRoot}/`;
  const sources = new Map(
    entries.map(([path, source]) => [path.slice(sourcePrefix.length), source] as const),
  );
  return loadSpecEstateFromSources(repository.root, specsRoot, sources);
}

export async function loadCommitSnapshot(
  target: string,
  revision = "HEAD",
  specsRootInput = "specs",
): Promise<RepositorySnapshot> {
  const repository = await discoverRepository(target);
  const specsRoot = normalizeSpecsRoot(specsRootInput);
  const commit = await resolveCommit(repository, revision);
  const tree = await runReadOnlyGit(
    repository.root,
    ["ls-tree", "-r", "-z", "--name-only", commit, "--", specsRoot],
    { maxOutputBytes: 32 * 1024 * 1024 },
  );
  const sourcePrefix = `${specsRoot}/`;
  const repositoryPaths = tree.stdout
    .split("\0")
    .filter((path) => path.startsWith(sourcePrefix) && isSnapshotSource(path))
    .toSorted();
  const entries = await mapConcurrent(repositoryPaths, 12, async (path) => {
    const source = await runReadOnlyGit(
      repository.root,
      ["cat-file", "blob", `${commit}:${path}`],
      {
        maxOutputBytes: 4 * 1024 * 1024,
      },
    );
    return [path.slice(sourcePrefix.length), source.stdout] as const;
  });
  const sources = new Map(entries);
  const estate = await loadSpecEstateFromSources(repository.root, specsRoot, sources);

  return {
    kind: "commit",
    repository,
    revision: commit,
    specsRoot,
    estate,
    sourcePaths: repositoryPaths,
    deletedSpecPaths: [],
    untrackedSpecPaths: [],
  };
}

export async function loadFilesystemSnapshot(
  target: string,
  specsRootInput = "specs",
): Promise<RepositorySnapshot> {
  const repository = await discoverRepository(target);
  const specsRoot = normalizeSpecsRoot(specsRootInput);
  const estate = await loadSpecEstate(repository.root, specsRoot);
  const deletedSpecPaths = repository.worktreeEntries
    .filter((entry) => entry.tracked && entry.status.includes("D"))
    .flatMap((entry) => repositorySpecPath(specsRoot, entry.path) ?? [])
    .toSorted();
  const untrackedSpecPaths = repository.worktreeEntries
    .filter((entry) => !entry.tracked)
    .flatMap((entry) => repositorySpecPath(specsRoot, entry.path) ?? [])
    .toSorted();

  return {
    kind: "filesystem",
    repository,
    revision: repository.head,
    specsRoot,
    estate,
    sourcePaths: snapshotSourcePaths(estate, specsRoot),
    deletedSpecPaths,
    untrackedSpecPaths,
  };
}

export async function loadIndexSnapshot(
  target: string,
  specsRootInput = "specs",
): Promise<RepositorySnapshot> {
  const repository = await discoverRepository(target);
  const specsRoot = normalizeSpecsRoot(specsRootInput);
  const indexEntries = await readIndexEntries(repository, specsRoot);
  const entries = await mapConcurrent(indexEntries, 12, async (entry) => {
    const source = await runReadOnlyGit(repository.root, ["cat-file", "blob", entry.hash], {
      maxOutputBytes: 4 * 1024 * 1024,
    });
    return [entry.path, source.stdout] as const;
  });
  const estate = await estateFromRepositorySources(repository, specsRoot, entries);
  return {
    kind: "index",
    repository,
    revision: repository.head,
    specsRoot,
    estate,
    sourcePaths: indexEntries.map((entry) => entry.path),
    deletedSpecPaths: [],
    untrackedSpecPaths: [],
  };
}

export async function loadTrackedFilesystemSnapshot(
  target: string,
  specsRootInput = "specs",
): Promise<RepositorySnapshot> {
  const repository = await discoverRepository(target);
  const specsRoot = normalizeSpecsRoot(specsRootInput);
  const indexEntries = await readIndexEntries(repository, specsRoot);
  const loadedEntries = await Promise.all(
    indexEntries.map(async (entry) => {
      const absolutePath = safeRepositoryPath(repository.root, entry.path);
      if (!absolutePath) return undefined;
      try {
        const details = await lstat(absolutePath);
        if (!details.isFile() || details.isSymbolicLink()) return undefined;
        return [entry.path, await readFile(absolutePath, "utf8")] as const;
      } catch {
        return undefined;
      }
    }),
  );
  const entries = loadedEntries.filter((entry) => entry !== undefined);
  const estate = await estateFromRepositorySources(repository, specsRoot, entries);
  const sourcePaths = entries.map(([path]) => path).toSorted();
  const deletedSpecPaths = indexEntries
    .map((entry) => entry.path)
    .filter((path) => !sourcePaths.includes(path) && repositorySpecPath(specsRoot, path))
    .toSorted();
  return {
    kind: "filesystem",
    repository,
    revision: repository.head,
    specsRoot,
    estate,
    sourcePaths,
    deletedSpecPaths,
    untrackedSpecPaths: [],
  };
}
