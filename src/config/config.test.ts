import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ConfigError, loadConfig } from "./index";

const roots: string[] = [];

async function root(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "calmcraft-config-"));
  roots.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("calmcraft.json", () => {
  it("uses documented defaults and accepts the versioned declarative fields", async () => {
    const repositoryRoot = await root();
    await expect(loadConfig(repositoryRoot)).resolves.toEqual({
      specVersion: 1,
      specsRoot: "specs",
    });
    await writeFile(
      join(repositoryRoot, "calmcraft.json"),
      JSON.stringify({ specVersion: 1, specsRoot: "product/specs", defaultBase: "origin/main" }),
    );
    await expect(loadConfig(repositoryRoot)).resolves.toEqual({
      specVersion: 1,
      specsRoot: "product/specs",
      defaultBase: "origin/main",
    });
  });

  it("rejects unknown fields, unsupported versions, escaping paths, and executable indirection", async () => {
    const repositoryRoot = await root();
    const configPath = join(repositoryRoot, "calmcraft.json");
    await writeFile(configPath, JSON.stringify({ execute: "./config.js" }));
    await expect(loadConfig(repositoryRoot)).rejects.toThrow(/Unsupported calmcraft\.json field/u);
    await writeFile(configPath, JSON.stringify({ specVersion: 2 }));
    await expect(loadConfig(repositoryRoot)).rejects.toThrow(/Unsupported specVersion/u);
    await writeFile(configPath, JSON.stringify({ specsRoot: "../outside" }));
    await expect(loadConfig(repositoryRoot)).rejects.toThrow(/beneath the repository root/u);
    await rm(configPath);
    await writeFile(join(repositoryRoot, "elsewhere.json"), "{}");
    await symlink(join(repositoryRoot, "elsewhere.json"), configPath);
    await expect(loadConfig(repositoryRoot)).rejects.toBeInstanceOf(ConfigError);
  });
});
