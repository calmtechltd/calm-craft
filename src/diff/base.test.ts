import { afterEach, describe, expect, it } from "vitest";

import { createGitFixture, fixtureGit, removeGitFixture } from "../../test/helpers/git-fixture";
import { discoverRepository } from "../git/repository";
import { resolveBase } from "./base";

const fixtureRoots: string[] = [];

async function fixture(): Promise<string> {
  const root = await createGitFixture();
  fixtureRoots.push(root);
  await fixtureGit(root, ["switch", "-c", "feature/base"]);
  return root;
}

afterEach(async () => {
  await Promise.all(fixtureRoots.splice(0).map(removeGitFixture));
});

describe("branch base resolution", () => {
  it("prefers an explicit base, then a valid configured base", async () => {
    const root = await fixture();
    const repository = await discoverRepository(root);

    await expect(resolveBase(repository, { explicitBase: "main" })).resolves.toMatchObject({
      available: true,
      selectedBase: "main",
      source: "explicit",
    });
    await expect(resolveBase(repository, { configuredBase: "main" })).resolves.toMatchObject({
      available: true,
      selectedBase: "main",
      source: "configured",
    });
  });

  it("uses symbolic origin HEAD before conventional candidates", async () => {
    const root = await fixture();
    await fixtureGit(root, ["update-ref", "refs/remotes/origin/main", "refs/heads/main"]);
    await fixtureGit(root, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
      "refs/remotes/origin/main",
    ]);
    const repository = await discoverRepository(root);

    await expect(resolveBase(repository)).resolves.toMatchObject({
      available: true,
      selectedBase: "origin/main",
      source: "origin-head",
    });
  });
});
