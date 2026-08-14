import { isSpecMarkdownPath } from "../specs/discovery";
import { runReadOnlyGit } from "../git/command";
import type { RepositoryInfo } from "../git/model";
import type { PathChange, Provenance, ProvenancePatch } from "./model";

function isRelevantPath(specsRoot: string, path: string): boolean {
  if (!path.startsWith(`${specsRoot}/`)) return false;
  const relativePath = path.slice(specsRoot.length + 1);
  return (
    isSpecMarkdownPath(relativePath) ||
    relativePath.endsWith(".flow.yaml") ||
    relativePath.endsWith(".flow.mmd")
  );
}

function parseNameStatus(output: string, provenance: Provenance, specsRoot: string): PathChange[] {
  const records = output.split("\0");
  const changes: PathChange[] = [];
  let index = 0;
  while (index < records.length) {
    const status = records[index] ?? "";
    index += 1;
    if (!status) continue;
    if (status.startsWith("R") || status.startsWith("C")) {
      const beforePath = records[index] ?? "";
      const path = records[index + 1] ?? "";
      index += 2;
      if (isRelevantPath(specsRoot, beforePath) || isRelevantPath(specsRoot, path)) {
        changes.push({ provenance, kind: "renamed", path, beforePath });
      }
      continue;
    }
    const path = records[index] ?? "";
    index += 1;
    if (!isRelevantPath(specsRoot, path)) continue;
    const kind = status.startsWith("A") ? "added" : status.startsWith("D") ? "deleted" : "modified";
    changes.push({ provenance, kind, path });
  }
  return changes;
}

async function diffNames(
  repository: RepositoryInfo,
  provenance: Provenance,
  arguments_: string[],
  specsRoot: string,
): Promise<PathChange[]> {
  const result = await runReadOnlyGit(repository.root, [
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--name-status",
    "-z",
    "--find-renames",
    ...arguments_,
    "--",
    specsRoot,
  ]);
  return parseNameStatus(result.stdout, provenance, specsRoot);
}

async function rawPatch(
  repository: RepositoryInfo,
  provenance: ProvenancePatch["provenance"],
  arguments_: string[],
  specsRoot: string,
): Promise<ProvenancePatch> {
  const result = await runReadOnlyGit(repository.root, [
    "diff",
    "--no-ext-diff",
    "--no-textconv",
    "--unified=3",
    "--find-renames",
    ...arguments_,
    "--",
    specsRoot,
  ]);
  return { provenance, patch: result.stdout };
}

export async function readProvenance(
  repository: RepositoryInfo,
  mergeBase: string,
  specsRoot: string,
): Promise<{ pathChanges: PathChange[]; patches: ProvenancePatch[] }> {
  const [committed, staged, unstaged, committedPatch, stagedPatch, unstagedPatch] =
    await Promise.all([
      diffNames(repository, "committed", [mergeBase, repository.head], specsRoot),
      diffNames(repository, "staged", ["--cached", repository.head], specsRoot),
      diffNames(repository, "unstaged", [], specsRoot),
      rawPatch(repository, "committed", [mergeBase, repository.head], specsRoot),
      rawPatch(repository, "staged", ["--cached", repository.head], specsRoot),
      rawPatch(repository, "unstaged", [], specsRoot),
    ]);
  const untracked = repository.worktreeEntries
    .filter((entry) => !entry.tracked && isRelevantPath(specsRoot, entry.path))
    .map(
      (entry): PathChange => ({
        provenance: "untracked",
        kind: "added",
        path: entry.path,
      }),
    );
  const pathChanges = [...committed, ...staged, ...unstaged, ...untracked].toSorted(
    (left, right) =>
      left.provenance.localeCompare(right.provenance) ||
      left.path.localeCompare(right.path) ||
      left.kind.localeCompare(right.kind),
  );
  return {
    pathChanges,
    patches: [committedPatch, stagedPatch, unstagedPatch],
  };
}
