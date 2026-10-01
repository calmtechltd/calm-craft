import { access, readFile } from "node:fs/promises";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { stringify } from "yaml";

import {
  createGitFixture,
  fixtureGit,
  removeGitFixture,
  writeFixtureFile,
} from "../../test/helpers/git-fixture";
import { parseCliArguments } from "../cli/arguments";
import { runCli } from "../cli/command";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map(removeGitFixture));
});

describe("config validate", () => {
  it("B1 — validates definitions without executing commands or modifying repository files", async () => {
    const root = await createGitFixture();
    roots.push(root);
    const source = stringify({
      version: 2,
      commands: {
        migrate: {
          argv: [
            process.execPath,
            "-e",
            `require('node:fs').writeFileSync(${JSON.stringify(join(root, "executed"))}, 'bad')`,
          ],
        },
      },
      gates: ["migrate"],
    });
    await writeFixtureFile(root, ".engineering/config.yaml", source);
    const before = await fixtureGit(root, ["status", "--porcelain"]);
    let output = "";
    const result = await runCli(["config", "validate", join(root, ".engineering/config.yaml")], {
      io: {
        stdout: (text) => {
          output += text;
        },
        stderr: (text) => {
          output += text;
        },
      },
      browserOpener: async () => {
        throw new Error("must not open");
      },
    });
    expect(result).toBe(0);
    expect(output).toContain("valid (1 gates, 0 suites)");
    await expect(access(join(root, "executed"))).rejects.toThrow();
    expect(await readFile(join(root, ".engineering/config.yaml"), "utf8")).toBe(source);
    expect(await fixtureGit(root, ["status", "--porcelain"])).toBe(before);
  });

  it("B1 — rejects unknown commands and missing input with nonzero status", async () => {
    const root = await createGitFixture();
    roots.push(root);
    let output = "";
    const io = {
      stdout: (text: string) => {
        output += text;
      },
      stderr: (text: string) => {
        output += text;
      },
    };
    expect(await runCli(["config", "validate", join(root, "missing.yaml")], { io })).toBe(1);
    await writeFixtureFile(root, "config.yaml", "version: 2\ngates: [missing]\n");
    expect(await runCli(["config", "validate", join(root, "config.yaml")], { io })).toBe(1);
    expect(output).toContain("unknown command");
    expect(parseCliArguments(["config", "validate"])).toEqual({
      command: "config-validate",
      path: undefined,
    });
    expect(() => parseCliArguments(["config", "execute"])).toThrow(/config validate/u);
    expect(() => parseCliArguments(["config", "validate", "--apply"])).toThrow(/config validate/u);
  });

  it("B2 — checks JSON conflicts against the explicitly selected config file", async () => {
    const root = await createGitFixture();
    roots.push(root);
    await writeFixtureFile(root, "alternate.yaml", "version: 2\npaths: {specs: alternate}\n");
    await writeFixtureFile(root, ".engineering/config.yaml", "version: 2\npaths: {specs: specs}\n");
    await writeFixtureFile(root, "calmcraft.json", '{"specsRoot":"specs"}');
    let output = "";
    expect(
      await runCli(["config", "validate", join(root, "alternate.yaml")], {
        io: {
          stdout: (text) => {
            output += text;
          },
          stderr: (text) => {
            output += text;
          },
        },
      }),
    ).toBe(1);
    expect(output).toContain("Conflicting");
  });
});
