import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalSpec,
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../../test/helpers/git-fixture";
import { createBranchReview } from "./review";

const fixtureRoots: string[] = [];

async function fixture(): Promise<string> {
  const root = await createGitFixture();
  fixtureRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(removeGitFixture));
});

describe("branch review", () => {
  it("separates committed, staged, unstaged, and untracked changes with overlap", async () => {
    const root = await fixture();
    await writeFixtureFile(
      root,
      "specs/core/deleted.md",
      canonicalSpec("fixture-deleted", "Deleted", "Deleted source"),
    );
    await fixtureGit(root, ["add", "specs/core/deleted.md"]);
    await fixtureGit(root, ["commit", "-m", "Add deletable spec"]);
    await fixtureGit(root, ["switch", "-c", "feature/review"]);
    await fixtureGit(root, ["mv", "specs/core/original.md", "specs/core/moved.md"]);
    await fixtureGit(root, ["commit", "-m", "Move the feature spec"]);

    await writeFixtureFile(
      root,
      "specs/core/moved.md",
      canonicalSpec("fixture-original", "Staged title", "Committed source"),
    );
    await fixtureGit(root, ["add", "specs/core/moved.md"]);
    await writeFixtureFile(
      root,
      "specs/core/moved.md",
      canonicalSpec("fixture-original", "Staged title", "Unstaged source"),
    );
    await writeFixtureFile(
      root,
      "specs/core/untracked.md",
      canonicalSpec("fixture-untracked", "Untracked", "Untracked source"),
    );
    await unlink(join(root, "specs/core/deleted.md"));
    const beforeStatus = await fixtureGit(root, ["status", "--porcelain=v2", "-z"]);
    const beforeHead = await fixtureGit(root, ["rev-parse", "HEAD"]);
    const beforeIndex = await readFile(join(root, ".git/index"));

    const review = await createBranchReview(root);

    expect(review.available).toBe(true);
    expect(review.base).toMatchObject({ selectedBase: "main", source: "conventional" });
    expect(review.pathChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provenance: "committed", kind: "renamed" }),
        expect.objectContaining({ provenance: "staged", path: "specs/core/moved.md" }),
        expect.objectContaining({ provenance: "unstaged", path: "specs/core/moved.md" }),
        expect.objectContaining({
          provenance: "unstaged",
          kind: "deleted",
          path: "specs/core/deleted.md",
        }),
        expect.objectContaining({ provenance: "untracked", path: "specs/core/untracked.md" }),
      ]),
    );
    expect(new Set(review.semanticChanges.map((change) => change.provenance))).toEqual(
      new Set(["committed", "staged", "unstaged", "untracked"]),
    );
    expect(review.semanticChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provenance: "committed", kind: "spec.moved" }),
        expect.objectContaining({ provenance: "staged", kind: "spec.renamed" }),
        expect.objectContaining({ provenance: "unstaged", kind: "behaviour.content-changed" }),
        expect.objectContaining({ provenance: "unstaged", kind: "spec.removed" }),
        expect.objectContaining({ provenance: "untracked", kind: "spec.added" }),
      ]),
    );
    expect(review.patches.find((patch) => patch.provenance === "committed")?.patch).toContain(
      "similarity index",
    );
    expect(await fixtureGit(root, ["status", "--porcelain=v2", "-z"])).toBe(beforeStatus);
    expect(await fixtureGit(root, ["rev-parse", "HEAD"])).toBe(beforeHead);
    expect(await readFile(join(root, ".git/index"))).toEqual(beforeIndex);
  });

  it("returns an estate-only result when no comparison base exists", async () => {
    const root = await fixture();
    await fixtureGit(root, ["branch", "-m", "topic-only"]);

    const review = await createBranchReview(root);

    expect(review.available).toBe(false);
    expect(review.base.mergeBase).toBeUndefined();
    expect(review.base.reason).toMatch(/Supply --base/u);
    expect(review.estate.specs.map((spec) => spec.id)).toEqual(["fixture-original"]);
    expect(review.semanticChanges).toEqual([]);
  });

  it("fails honestly for an explicit base that does not exist", async () => {
    const root = await fixture();

    const review = await createBranchReview(root, { explicitBase: "missing/base" });

    expect(review.available).toBe(false);
    expect(review.base).toMatchObject({
      selectedBase: "missing/base",
      source: "explicit",
    });
    expect(review.base.reason).toMatch(/does not resolve/u);
  });
});
