import { realpath, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { GitReadError, redactSensitiveText, runReadOnlyGit } from "./command";
import type { GitRemote, RepositoryInfo, WorktreeEntry } from "./model";

function line(value: string): string {
  return value.trim().split(/\r?\n/u)[0] ?? "";
}

function parseWorktreeEntries(output: string): WorktreeEntry[] {
  const records = output.split("\0");
  const entries: WorktreeEntry[] = [];
  let index = 0;
  while (index < records.length) {
    const record = records[index] ?? "";
    index += 1;
    if (!record || record.startsWith("# ")) continue;
    if (record.startsWith("? ")) {
      entries.push({ path: record.slice(2), status: "??", tracked: false });
      continue;
    }
    if (record.startsWith("! ")) continue;

    const parts = record.split(" ");
    if (parts[0] === "1" && parts.length >= 9) {
      entries.push({ path: parts.slice(8).join(" "), status: parts[1] ?? "..", tracked: true });
      continue;
    }
    if (parts[0] === "2" && parts.length >= 10) {
      const originalPath = records[index] ?? "";
      index += 1;
      entries.push({
        path: parts.slice(9).join(" "),
        originalPath,
        status: parts[1] ?? "..",
        tracked: true,
      });
      continue;
    }
    if (parts[0] === "u" && parts.length >= 11) {
      entries.push({ path: parts.slice(10).join(" "), status: parts[1] ?? "UU", tracked: true });
    }
  }
  return entries.toSorted((left, right) => left.path.localeCompare(right.path));
}

async function targetDirectory(target: string): Promise<string> {
  const absoluteTarget = resolve(target);
  let details;
  try {
    details = await stat(absoluteTarget);
  } catch {
    throw new GitReadError(`Repository path does not exist: ${absoluteTarget}`);
  }
  return realpath(details.isDirectory() ? absoluteTarget : dirname(absoluteTarget));
}

async function readRemotes(root: string): Promise<GitRemote[]> {
  const names = (await runReadOnlyGit(root, ["remote"])).stdout
    .split(/\r?\n/u)
    .map((name) => name.trim())
    .filter(Boolean)
    .toSorted();
  return Promise.all(
    names.map(async (name) => ({
      name,
      urls: (await runReadOnlyGit(root, ["remote", "get-url", "--all", name])).stdout
        .split(/\r?\n/u)
        .map((url) => url.trim())
        .filter(Boolean)
        .map(redactSensitiveText),
    })),
  );
}

export async function discoverRepository(target = process.cwd()): Promise<RepositoryInfo> {
  const cwd = await targetDirectory(target);
  let root: string;
  try {
    root = line(
      (await runReadOnlyGit(cwd, ["rev-parse", "--path-format=absolute", "--show-toplevel"]))
        .stdout,
    );
  } catch (error) {
    if (error instanceof GitReadError) {
      throw new GitReadError(`Not a Git repository: ${cwd}. ${error.message}`, error.exitCode);
    }
    throw error;
  }

  const [gitDirResult, commonDirResult, headResult, branchResult, remotesResult, statusResult] =
    await Promise.all([
      runReadOnlyGit(root, ["rev-parse", "--path-format=absolute", "--git-dir"]),
      runReadOnlyGit(root, ["rev-parse", "--path-format=absolute", "--git-common-dir"]),
      runReadOnlyGit(root, ["rev-parse", "--verify", "HEAD"]),
      runReadOnlyGit(root, ["symbolic-ref", "--quiet", "--short", "HEAD"], {
        acceptedExitCodes: [0, 1],
      }),
      readRemotes(root),
      runReadOnlyGit(root, ["status", "--porcelain=v2", "--branch", "-z", "--untracked-files=all"]),
    ]);

  return {
    root,
    gitDir: line(gitDirResult.stdout),
    commonDir: line(commonDirResult.stdout),
    branch: branchResult.exitCode === 0 ? line(branchResult.stdout) : undefined,
    head: line(headResult.stdout),
    remotes: remotesResult,
    worktreeEntries: parseWorktreeEntries(statusResult.stdout),
  };
}
