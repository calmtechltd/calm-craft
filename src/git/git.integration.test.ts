import { readFile, realpath, unlink } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalSpec,
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../../test/helpers/git-fixture";
import { GitReadError, redactSensitiveText, runReadOnlyGit } from "./command";
import { discoverRepository } from "./repository";
import { loadCommitSnapshot, loadFilesystemSnapshot } from "./snapshot";

const fixtureRoots: string[] = [];

async function fixture(): Promise<string> {
  const root = await createGitFixture();
  fixtureRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(removeGitFixture));
});

describe("read-only Git repository snapshots", () => {
  it("discovers a normal checkout and loads equivalent commit and filesystem estates", async () => {
    const root = await fixture();
    const nestedPath = join(root, "specs/core/original.md");
    const beforeStatus = await fixtureGit(root, ["status", "--porcelain=v2", "-z"]);
    const beforeHead = await fixtureGit(root, ["rev-parse", "HEAD"]);
    const beforeIndex = await readFile(join(root, ".git/index"));

    const repository = await discoverRepository(nestedPath);
    const commit = await loadCommitSnapshot(root);
    const filesystem = await loadFilesystemSnapshot(root);

    expect(repository).toMatchObject({
      root: await realpath(root),
      branch: "main",
      remotes: [],
      worktreeEntries: [],
    });
    expect(repository.gitDir).toBe(repository.commonDir);
    expect(commit.estate.specs.map((spec) => spec.id)).toEqual(["fixture-original"]);
    expect(filesystem.estate.specs.map((spec) => spec.id)).toEqual(["fixture-original"]);
    expect(filesystem.estate.specs[0]?.sourceHash).toBe(commit.estate.specs[0]?.sourceHash);
    expect(await fixtureGit(root, ["status", "--porcelain=v2", "-z"])).toBe(beforeStatus);
    expect(await fixtureGit(root, ["rev-parse", "HEAD"])).toBe(beforeHead);
    expect(await readFile(join(root, ".git/index"))).toEqual(beforeIndex);
  });

  it("includes untracked specs and records tracked deletions without changing the commit snapshot", async () => {
    const root = await fixture();
    await unlink(join(root, "specs/core/original.md"));
    await writeFixtureFile(
      root,
      "specs/core/untracked.md",
      canonicalSpec("fixture-untracked", "Untracked", "Filesystem-only source"),
    );

    const commit = await loadCommitSnapshot(root);
    const filesystem = await loadFilesystemSnapshot(root);

    expect(commit.estate.specs.map((spec) => spec.id)).toEqual(["fixture-original"]);
    expect(filesystem.estate.specs.map((spec) => spec.id)).toEqual(["fixture-untracked"]);
    expect(filesystem.deletedSpecPaths).toEqual(["specs/core/original.md"]);
    expect(filesystem.untrackedSpecPaths).toEqual(["specs/core/untracked.md"]);
  });

  it("reads only the selected linked worktree while using its shared common Git directory", async () => {
    const root = await fixture();
    const linkedRoot = `${root}-linked`;
    fixtureRoots.push(linkedRoot);
    await fixtureGit(root, ["worktree", "add", "-b", "linked", linkedRoot]);
    await writeFixtureFile(
      root,
      "specs/core/original.md",
      canonicalSpec("fixture-original", "Primary", "PRIMARY_WORKTREE_SENTINEL"),
    );
    await writeFixtureFile(
      linkedRoot,
      "specs/core/original.md",
      canonicalSpec("fixture-original", "Linked", "LINKED_WORKTREE_SENTINEL"),
    );
    const primaryStatus = await fixtureGit(root, ["status", "--porcelain=v2", "-z"]);
    const linkedStatus = await fixtureGit(linkedRoot, ["status", "--porcelain=v2", "-z"]);

    const snapshot = await loadFilesystemSnapshot(join(linkedRoot, "specs/core"));

    expect(snapshot.repository.root).toBe(await realpath(linkedRoot));
    expect(snapshot.repository.gitDir).not.toBe(snapshot.repository.commonDir);
    expect(snapshot.estate.specs[0]?.source).toContain("LINKED_WORKTREE_SENTINEL");
    expect(snapshot.estate.specs[0]?.source).not.toContain("PRIMARY_WORKTREE_SENTINEL");
    expect(await fixtureGit(root, ["status", "--porcelain=v2", "-z"])).toBe(primaryStatus);
    expect(await fixtureGit(linkedRoot, ["status", "--porcelain=v2", "-z"])).toBe(linkedStatus);
  });

  it("identifies detached HEAD and rejects a non-repository path", async () => {
    const root = await fixture();
    await fixtureGit(root, ["checkout", "--detach", "HEAD"]);
    const detached = await discoverRepository(root);
    expect(detached.branch).toBeUndefined();
    expect(detached.head).toMatch(/^[a-f0-9]{40,64}$/u);

    const invalidRoot = `${root}-plain`;
    fixtureRoots.push(invalidRoot);
    await writeFixtureFile(invalidRoot, "readme.txt", "not a repository");
    await expect(discoverRepository(invalidRoot)).rejects.toBeInstanceOf(GitReadError);
  });

  it("redacts credentials, query secrets, and provider tokens from errors", () => {
    const redacted = redactSensitiveText(
      "https://user:password@example.com/repo.git?token=secret&custom=private ghp_123456 glpat-secret",
    );

    expect(redacted).not.toContain("user:password");
    expect(redacted).not.toContain("token=secret");
    expect(redacted).not.toContain("custom=private");
    expect(redacted).not.toContain("ghp_123456");
    expect(redacted).not.toContain("glpat-secret");
  });

  it("discovers remotes without retaining embedded credentials or query secrets", async () => {
    const root = await fixture();
    await fixtureGit(root, [
      "remote",
      "add",
      "origin",
      "https://user:password@example.com/repo.git?token=secret",
    ]);

    const repository = await discoverRepository(root);

    expect(repository.remotes).toEqual([
      {
        name: "origin",
        urls: ["https://[redacted]@example.com/repo.git?token=[redacted]"],
      },
    ]);
  });

  it("rejects mutating commands and specs roots outside the selected repository", async () => {
    const root = await fixture();

    expect(() => runReadOnlyGit(root, ["checkout", "main"])).toThrow(/Refused non-read-only/u);
    await expect(loadCommitSnapshot(root, "HEAD", "../other-specs")).rejects.toThrow(
      /Specs root must be a relative repository path/u,
    );
  });
});
