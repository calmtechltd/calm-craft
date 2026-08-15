import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function fixtureGit(cwd: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", cwd, ...args], {
    encoding: "utf8",
    env: { ...process.env, LC_ALL: "C" },
  });
  return result.stdout;
}

export function canonicalSpec(id: string, title: string, behaviourText: string): string {
  return `---
id: ${id}
area: Fixture
status: implemented
---

# ${title}

${behaviourText}

## Behaviours

### B1 — Show the fixture 🟢 implemented

${behaviourText}

## Rules (Invariants)

- The fixture remains deterministic.

## Decision Tables

_None._

## User Flows

_None._

## Open Questions

_None._

## Future Considerations

_None._

## Out of Scope

_None._
`;
}

export async function writeFixtureFile(
  root: string,
  path: string,
  contents: string,
): Promise<void> {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, "utf8");
}

export async function createGitFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "calmcraft-git-fixture-"));
  await fixtureGit(root, ["init", "--initial-branch=main"]);
  await fixtureGit(root, ["config", "user.name", "CalmCraft Fixture"]);
  await fixtureGit(root, ["config", "user.email", "fixture@calmcraft.test"]);
  await writeFixtureFile(
    root,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Original", "Committed source"),
  );
  await fixtureGit(root, ["add", "specs/core/original.md"]);
  await fixtureGit(root, ["commit", "-m", "Add fixture spec"]);
  return root;
}

export async function removeGitFixture(root: string): Promise<void> {
  const expectedPrefix = join(tmpdir(), "calmcraft-git-fixture-");
  if (!root.startsWith(expectedPrefix))
    throw new Error(`Refusing to remove unexpected path: ${root}`);
  await rm(root, { recursive: true, force: true });
}
