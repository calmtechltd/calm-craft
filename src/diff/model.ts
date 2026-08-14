import type { SourceLocation, SpecEstate } from "../specs/model";
import type { RepositoryInfo, RepositorySnapshot } from "../git/model";

export type Provenance = "committed" | "staged" | "unstaged" | "untracked";
export type BaseSource = "explicit" | "configured" | "origin-head" | "conventional";

export type BaseResolution = {
  available: boolean;
  head: string;
  selectedBase?: string;
  selectedCommit?: string;
  mergeBase?: string;
  source?: BaseSource;
  attempted: string[];
  reason?: string;
};

export type PathChange = {
  provenance: Provenance;
  kind: "added" | "modified" | "deleted" | "renamed";
  path: string;
  beforePath?: string;
};

export type ProvenancePatch = {
  provenance: Exclude<Provenance, "untracked">;
  patch: string;
};

export type ChangeEvidence = {
  beforePath?: string;
  afterPath?: string;
  beforeLocation?: SourceLocation;
  afterLocation?: SourceLocation;
  beforeSource?: string;
  afterSource?: string;
};

export type SemanticChange = {
  id: string;
  provenance: Provenance;
  kind: string;
  specId: string;
  elementId?: string;
  before?: unknown;
  after?: unknown;
  inferred?: boolean;
  evidence: ChangeEvidence;
};

export type BranchReview = {
  available: boolean;
  repository: RepositoryInfo;
  base: BaseResolution;
  target: RepositorySnapshot;
  baseline?: RepositorySnapshot;
  head?: RepositorySnapshot;
  index?: RepositorySnapshot;
  trackedFilesystem?: RepositorySnapshot;
  pathChanges: PathChange[];
  patches: ProvenancePatch[];
  semanticChanges: SemanticChange[];
  estate: SpecEstate;
};
