import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../test/helpers/git-fixture";

const scanner = resolve("skills/branch-cleanup/scripts/scan.py");
const roots: string[] = [];
async function fixture() {
  const root = await createGitFixture();
  roots.push(root);
  return root;
}
function python(root: string, body: string, data: unknown = {}) {
  return JSON.parse(
    execFileSync(
      "python3",
      [
        "-B",
        "-c",
        `
import importlib.util, json, sys
spec = importlib.util.spec_from_file_location("scan", sys.argv[1])
scan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scan)
root = sys.argv[2]
data = json.loads(sys.argv[3])
${body}
`,
        scanner,
        root,
        JSON.stringify(data),
      ],
      { encoding: "utf8" },
    ),
  );
}
function survey(root: string, prs: unknown = {}) {
  return python(
    root,
    `
scan.gh_pull_requests = lambda _: (data, "ok")
scan.gh_pr_for_commit = lambda *_: None
sys.argv = ["scan", "--repo", root, "--no-fetch", "--json-only"]
scan.main()
`,
    prs,
  ) as {
    branches: {
      name: string;
      verdict: string;
      delete_command: string | null;
      graphite_tracked: boolean | null;
    }[];
  };
}
afterEach(async () => {
  await Promise.all(roots.splice(0).map(removeGitFixture));
});

describe("branch cleanup evidence", () => {
  it("requires a PR merge result to reach trunk before accepting a squashed branch", async () => {
    const root = await fixture();
    await fixtureGit(root, ["checkout", "-b", "topic"]);
    await writeFixtureFile(root, "feature.txt", "feature");
    await fixtureGit(root, ["add", "."]);
    await fixtureGit(root, ["commit", "-m", "Topic"]);
    const tip = (await fixtureGit(root, ["rev-parse", "HEAD"])).trim();
    await fixtureGit(root, ["checkout", "-b", "parent", "main"]);
    await fixtureGit(root, ["merge", "--squash", "topic"]);
    await fixtureGit(root, ["commit", "-m", "Squash topic into parent"]);
    const merge = (await fixtureGit(root, ["rev-parse", "HEAD"])).trim();
    await fixtureGit(root, ["checkout", "main"]);
    const prs = {
      topic: { number: 1, state: "MERGED", headRefOid: tip, mergeCommit: { oid: merge } },
    };
    expect(survey(root, prs).branches.find((b) => b.name === "topic")?.verdict).toBe("ask");
    await fixtureGit(root, ["merge", "--ff-only", "parent"]);
    expect(survey(root, prs).branches.find((b) => b.name === "topic")?.verdict).toBe("safe");
  });

  it("does not turn unavailable Graphite metadata into plain-Git deletion advice", async () => {
    const root = await fixture();
    await fixtureGit(root, ["branch", "old"]);
    await writeFixtureFile(root, ".git/.graphite_repo_config", JSON.stringify({ trunk: "main" }));
    expect(survey(root).branches.find((b) => b.name === "old")).toMatchObject({
      verdict: "ask",
      graphite_tracked: null,
      delete_command: null,
    });
  });

  it("evaluates worktree merge evidence separately while preserving ownership guards", async () => {
    const root = await fixture();
    const worktree = join(root, "old-worktree");
    await fixtureGit(root, ["worktree", "add", "-b", "topic", worktree, "main"]);
    const observed = python(
      root,
      `
scan.gh_pull_requests = lambda _: ({}, "ok")
scan.worktree_activity = lambda *_: 172800
sys.argv = ["scan", "--repo", root, "--no-fetch", "--json-only"]
scan.main()
`,
    );
    expect(observed.branches.find((b: { name: string }) => b.name === "topic").verdict).toBe("ask");
    expect(observed.worktrees.find((w: { branch: string }) => w.branch === "topic").verdict).toBe(
      "safe",
    );
    const verdicts = python(
      root,
      `
context = {"root": root, "main_worktree": root, "branch_verdicts": {"topic": "ask"},
           "worktree_branch_verdicts": {"topic": "safe"}}
base = {"path": root + "/old", "branch": "topic", "prunable": False, "prunable_reason": "missing", "locked": False,
        "dirty": False, "idle_seconds": 172800, "detached": False, "agent": "manual"}
cases = [{}, {"dirty": True}, {"dirty": None}, {"locked": True, "prunable": True},
         {"idle_seconds": 10}, {"idle_seconds": None}, {"path": root}]
print(json.dumps([scan.classify_worktree(dict(base, **case), context)[0] for case in cases]))
`,
    );
    expect(verdicts).toEqual(["safe", "keep", "ask", "keep", "keep", "ask", "keep"]);
  });

  it("leaves objects, index, and checkout contents unchanged without fetch", async () => {
    const root = await fixture();
    await fixtureGit(root, ["branch", "old"]);
    const snapshot = async () => ({
      objects: await fixtureGit(root, ["count-objects", "-v"]),
      index: readFileSync(join(root, ".git/index")).toString("base64"),
      indexMtime: statSync(join(root, ".git/index")).mtimeMs,
      head: await fixtureGit(root, ["rev-parse", "HEAD"]),
      contents: readFileSync(join(root, "specs/core/original.md"), "utf8"),
    });
    const before = await snapshot();
    survey(root);
    expect(await snapshot()).toEqual(before);
  });
});
