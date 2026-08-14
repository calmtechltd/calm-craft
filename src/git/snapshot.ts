import { isSpecMarkdownPath, loadSpecEstate, loadSpecEstateFromSources } from "../specs";
import { runReadOnlyGit } from "./command";
import type { RepositoryInfo, RepositorySnapshot } from "./model";
import { discoverRepository } from "./repository";

const SNAPSHOT_EXTENSIONS = [".md", ".flow.yaml", ".flow.mmd"] as const;

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
