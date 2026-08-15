import { access, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  canonicalSpec,
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../../test/helpers/git-fixture";
import {
  cloneRemoteRepository,
  parseRemoteSource,
  prepareRemoteComparison,
  type RemoteClone,
} from "./remote";

const fixtureRoots: string[] = [];
const workingRepositories: string[] = [];
const activeClones: RemoteClone[] = [];

async function privateStyleRemote(): Promise<{
  environment: NodeJS.ProcessEnv;
  source: string;
}> {
  const working = await createGitFixture();
  workingRepositories.push(working);
  await fixtureGit(working, ["switch", "-c", "feature/private-review"]);
  await writeFixtureFile(
    working,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Remote feature", "Feature-branch intent"),
  );
  await fixtureGit(working, ["add", "specs/core/original.md"]);
  await fixtureGit(working, ["commit", "-m", "Change remote feature"]);
  await fixtureGit(working, ["switch", "main"]);
  await writeFixtureFile(
    working,
    "specs/core/main-only.md",
    canonicalSpec("fixture-main-only", "Main-only feature", "Default-branch intent"),
  );
  await fixtureGit(working, ["add", "specs/core/main-only.md"]);
  await fixtureGit(working, ["commit", "-m", "Advance the default branch"]);
  await fixtureGit(working, ["switch", "-c", "unrelated/private-experiment"]);
  await writeFixtureFile(
    working,
    "specs/core/unrelated.md",
    canonicalSpec("fixture-unrelated", "Unrelated feature", "Unrelated branch intent"),
  );
  await fixtureGit(working, ["add", "specs/core/unrelated.md"]);
  await fixtureGit(working, ["commit", "-m", "Add unrelated branch"]);
  await fixtureGit(working, ["switch", "main"]);

  const fixtureRoot = await mkdtemp(join(tmpdir(), "calmcraft-private-remote-"));
  fixtureRoots.push(fixtureRoot);
  await fixtureGit(fixtureRoot, ["clone", "--bare", working, "repository.git"]);
  return {
    source: "https://fixture.invalid/repository.git",
    environment: {
      GIT_ALLOW_PROTOCOL: "file",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.file://${fixtureRoot}/.insteadOf`,
      GIT_CONFIG_VALUE_0: "https://fixture.invalid/",
    },
  };
}

async function remoteTempDirectories(): Promise<Set<string>> {
  return new Set(
    (await readdir(tmpdir()))
      .filter((entry) => entry.startsWith("calmcraft-remote-"))
      .map((entry) => join(tmpdir(), entry)),
  );
}

afterEach(async () => {
  await Promise.all(activeClones.splice(0).map((clone) => clone.cleanup()));
  await Promise.all(workingRepositories.splice(0).map(removeGitFixture));
  await Promise.all(fixtureRoots.splice(0).map((root) => rm(root, { recursive: true })));
});

describe("temporary remote repositories", () => {
  it("accepts bounded SSH and HTTPS forms and rejects shell fragments", () => {
    expect(parseRemoteSource("git@example.com:calm/craft.git")).toMatchObject({
      protocol: "ssh",
    });
    expect(parseRemoteSource("ssh://git@example.com/calm/craft.git")).toMatchObject({
      protocol: "ssh",
    });
    expect(
      parseRemoteSource("https://person:secret@example.com/calm/craft.git?token=hidden"),
    ).toMatchObject({
      protocol: "https",
      display: "https://[redacted]@example.com/calm/craft.git?token=[redacted]",
    });
    expect(parseRemoteSource("../local-repository")).toBeUndefined();
    expect(() => parseRemoteSource("https://example.com/calm/craft.git;touch-owned")).toThrow(
      /one SSH or HTTPS Git URL/u,
    );
    expect(() => parseRemoteSource("http://example.com/calm/craft.git")).toThrow(/SSH or HTTPS/u);
  });

  it("clones only the selected branches and deepens shallow history to a merge base", async () => {
    const fixture = await privateStyleRemote();
    const clone = await cloneRemoteRepository(fixture.source, "feature/private-review", {
      environment: fixture.environment,
    });
    activeClones.push(clone);

    expect(
      (await fixtureGit(clone.checkout, ["rev-parse", "--is-shallow-repository"])).trim(),
    ).toBe("true");
    const comparison = await prepareRemoteComparison(
      clone,
      { explicitBase: "main" },
      { environment: fixture.environment },
    );
    expect(comparison).toEqual({ explicitBase: "origin/main" });
    await expect(
      fixtureGit(clone.checkout, ["merge-base", "HEAD", "origin/main"]),
    ).resolves.toMatch(/^[a-f0-9]{40}\n$/u);
    const remoteReferences = await fixtureGit(clone.checkout, [
      "for-each-ref",
      "--format=%(refname:short)",
      "refs/remotes/origin",
    ]);
    expect(remoteReferences).toContain("origin/feature/private-review");
    expect(remoteReferences).toContain("origin/main");
    expect(remoteReferences).not.toContain("unrelated/private-experiment");
    await expect(
      prepareRemoteComparison(
        clone,
        { explicitBase: "missing/private-base" },
        { environment: fixture.environment },
      ),
    ).rejects.toThrow(/Git fetch failed.*missing\/private-base/isu);

    const temporaryDirectory = clone.temporaryDirectory;
    await clone.cleanup();
    await expect(access(temporaryDirectory)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("redacts failed authentication-style URLs and removes cancelled clones", async () => {
    const fixtureRoot = await mkdtemp(join(tmpdir(), "calmcraft-private-remote-"));
    fixtureRoots.push(fixtureRoot);
    const secretSource =
      "https://person:super-secret@fixture.invalid/missing.git?access_token=hidden-token";
    const environment = {
      GIT_ALLOW_PROTOCOL: "file",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.file://${fixtureRoot}/.insteadOf`,
      GIT_CONFIG_VALUE_0: "https://person:super-secret@fixture.invalid/",
    };
    const beforeFailure = await remoteTempDirectories();
    let failure: unknown;
    try {
      await cloneRemoteRepository(secretSource, "main", { environment });
    } catch (error) {
      failure = error;
    }
    expect(String(failure)).toMatch(/Git ls-remote failed/u);
    expect(String(failure)).not.toContain("super-secret");
    expect(String(failure)).not.toContain("hidden-token");
    expect(await remoteTempDirectories()).toEqual(beforeFailure);

    const before = await remoteTempDirectories();
    const cancellation = new AbortController();
    cancellation.abort();
    await expect(
      cloneRemoteRepository("https://fixture.invalid/repository.git", "main", {
        environment,
        signal: cancellation.signal,
      }),
    ).rejects.toThrow(/cancelled/u);
    const after = await remoteTempDirectories();
    expect(after).toEqual(before);
  });
});
