import type { SpecEstate } from "../specs/model";

export type GitRemote = {
  name: string;
  urls: string[];
};

export type WorktreeEntry = {
  path: string;
  status: string;
  originalPath?: string;
  tracked: boolean;
};

export type RepositoryInfo = {
  root: string;
  gitDir: string;
  commonDir: string;
  branch?: string;
  head: string;
  remotes: GitRemote[];
  worktreeEntries: WorktreeEntry[];
};

export type RepositorySnapshot = {
  kind: "commit" | "filesystem";
  repository: RepositoryInfo;
  revision: string;
  specsRoot: string;
  estate: SpecEstate;
  sourcePaths: string[];
  deletedSpecPaths: string[];
  untrackedSpecPaths: string[];
};
