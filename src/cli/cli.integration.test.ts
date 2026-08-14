import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createGitFixture, removeGitFixture } from "../../test/helpers/git-fixture";
import type { LocalSession } from "../server";
import { HELP_TEXT, parseCliArguments } from "./arguments";
import { runCli, startViewCommand } from "./command";

const roots: string[] = [];
const repositories: string[] = [];
const sessions: LocalSession[] = [];

async function assets(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "calmcraft-cli-assets-"));
  roots.push(root);
  await mkdir(join(root, "assets"));
  await writeFile(
    join(root, "index.html"),
    '<!doctype html><script src="/assets/app.js"></script>',
  );
  await writeFile(join(root, "assets/app.js"), "globalThis.calmcraftLoaded = true;");
  return root;
}

async function repository(): Promise<string> {
  const root = await createGitFixture();
  repositories.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(sessions.splice(0).map((session) => session.close()));
  await Promise.all(repositories.splice(0).map(removeGitFixture));
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("CalmCraft CLI", () => {
  it("parses view controls and produces useful help and version output", async () => {
    expect(
      parseCliArguments([
        "view",
        "../repo",
        "--diff",
        "--base",
        "main",
        "--no-open",
        "--port",
        "4312",
      ]),
    ).toMatchObject({
      command: "view",
      source: "../repo",
      diff: true,
      base: "main",
      openBrowser: false,
      port: 4312,
    });
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io = {
      stdout: (value: string) => stdout.push(value),
      stderr: (value: string) => stderr.push(value),
    };
    await expect(runCli(["--help"], { io })).resolves.toBe(0);
    expect(stdout.join("")).toBe(HELP_TEXT);
    await expect(runCli(["--version"], { io })).resolves.toBe(0);
    await expect(runCli(["unknown"], { io })).resolves.toBe(1);
    expect(stderr.join("")).toContain("Unknown command");
  });

  it("starts a no-open local session, prints its URL, and exposes parsed estate data", async () => {
    const root = await repository();
    const output: string[] = [];
    let opened = false;
    const active = await startViewCommand(
      {
        command: "view",
        source: root,
        diff: false,
        openBrowser: false,
      },
      {
        assetsRoot: await assets(),
        browserOpener: async () => {
          opened = true;
        },
        io: { stdout: (value) => output.push(value), stderr: () => undefined },
      },
    );
    sessions.push(active);

    expect(opened).toBe(false);
    expect(output.join("")).toContain(active.url);
    const response = await fetch(
      `http://127.0.0.1:${active.port}/api/session?token=${active.token}`,
    );
    expect(await response.text()).toContain("fixture-original");
  });

  it("uses an injected browser opener and rejects unsupported Node before repository access", async () => {
    const root = await repository();
    const opened: string[] = [];
    const active = await startViewCommand(
      { command: "view", source: root, diff: false, openBrowser: true },
      {
        assetsRoot: await assets(),
        browserOpener: async (url) => {
          opened.push(url);
        },
        io: { stdout: () => undefined, stderr: () => undefined },
      },
    );
    sessions.push(active);
    expect(opened).toEqual([active.url]);

    await expect(
      startViewCommand(
        { command: "view", source: "/path/that/does/not/exist", diff: false, openBrowser: false },
        { nodeVersion: "v20.19.0", assetsRoot: await assets() },
      ),
    ).rejects.toThrow(/Node\.js 22 or newer/u);
  });
});
