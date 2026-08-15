import {
  discoverRepository,
  loadCommitSnapshot,
  loadFilesystemSnapshot,
  loadIndexSnapshot,
  loadTrackedFilesystemSnapshot,
} from "../git";
import { resolveBase, type ResolveBaseOptions } from "./base";
import { compareEstates } from "./compare";
import type { BranchReview, Provenance, SemanticChange } from "./model";
import { readProvenance } from "./provenance";

export type CreateBranchReviewOptions = ResolveBaseOptions & {
  specsRoot?: string;
};

const PROVENANCE_ORDER: Record<Provenance, number> = {
  committed: 0,
  staged: 1,
  unstaged: 2,
  untracked: 3,
};

function sortSemanticChanges(changes: SemanticChange[]): SemanticChange[] {
  return changes.toSorted(
    (left, right) =>
      PROVENANCE_ORDER[left.provenance] - PROVENANCE_ORDER[right.provenance] ||
      left.specId.localeCompare(right.specId) ||
      left.kind.localeCompare(right.kind) ||
      (left.elementId ?? "").localeCompare(right.elementId ?? ""),
  );
}

export async function createBranchReview(
  target: string,
  options: CreateBranchReviewOptions = {},
): Promise<BranchReview> {
  const specsRoot = options.specsRoot ?? "specs";
  const repository = await discoverRepository(target);
  const [base, targetSnapshot] = await Promise.all([
    resolveBase(repository, options),
    loadFilesystemSnapshot(repository.root, specsRoot),
  ]);
  if (!base.available || !base.mergeBase) {
    return {
      available: false,
      repository,
      base,
      target: targetSnapshot,
      pathChanges: [],
      patches: [],
      semanticChanges: [],
      estate: targetSnapshot.estate,
    };
  }

  const [baseline, head, index, trackedFilesystem, provenance] = await Promise.all([
    loadCommitSnapshot(repository.root, base.mergeBase, specsRoot),
    loadCommitSnapshot(repository.root, repository.head, specsRoot),
    loadIndexSnapshot(repository.root, specsRoot),
    loadTrackedFilesystemSnapshot(repository.root, specsRoot),
    readProvenance(repository, base.mergeBase, specsRoot),
  ]);
  const semanticChanges = sortSemanticChanges([
    ...compareEstates(baseline.estate, head.estate, "committed"),
    ...compareEstates(head.estate, index.estate, "staged"),
    ...compareEstates(index.estate, trackedFilesystem.estate, "unstaged"),
    ...compareEstates(trackedFilesystem.estate, targetSnapshot.estate, "untracked"),
  ]);

  return {
    available: true,
    repository,
    base,
    target: targetSnapshot,
    baseline,
    head,
    index,
    trackedFilesystem,
    pathChanges: provenance.pathChanges,
    patches: provenance.patches,
    semanticChanges,
    estate: targetSnapshot.estate,
  };
}
