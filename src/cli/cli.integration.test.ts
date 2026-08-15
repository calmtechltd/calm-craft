import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

async function browserAssets(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "calmcraft-generate-assets-"));
  roots.push(root);
  await mkdir(join(root, "assets"));
  await writeFile(join(root, "index.html"), "<!doctype html>");
  await writeFile(join(root, "assets/index-abc123.js"), "globalThis.calmcraftLoaded = true;");
  await writeFile(join(root, "assets/index-abc123.css"), "body { color: black; }");
  return root;
}

async function repository(): Promise<string> {
  const root = await createGitFixture();
  repositories.push(root);
  return root;
}

async function remoteRepository(): Promise<{
  environment: NodeJS.ProcessEnv;
  source: string;
}> {
  const working = await repository();
  await fixtureGit(working, ["switch", "-c", "feature/remote-cli"]);
  await writeFixtureFile(
    working,
    "specs/core/original.md",
    canonicalSpec("fixture-original", "Remote CLI", "Private remote branch intent"),
  );
  await fixtureGit(working, ["add", "specs/core/original.md"]);
  await fixtureGit(working, ["commit", "-m", "Change the remote fixture"]);
  await fixtureGit(working, ["switch", "main"]);
  const root = await mkdtemp(join(tmpdir(), "calmcraft-cli-remote-"));
  roots.push(root);
  await fixtureGit(root, ["clone", "--bare", working, "repository.git"]);
  return {
    source: "https://fixture.invalid/repository.git",
    environment: {
      GIT_ALLOW_PROTOCOL: "file",
      GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: `url.file://${root}/.insteadOf`,
      GIT_CONFIG_VALUE_0: "https://fixture.invalid/",
    },
  };
}

function embeddedSession(html: string): {
  data: {
    mode: string;
    initialProvenance?: string[];
    review: { available: boolean; base: { selectedBase?: string }; semanticChanges: unknown[] };
  };
  sources: Array<{ id: string; path: string; context?: string }>;
  sourceById: Record<string, string>;
} {
  const match = html.match(
    /window\.__CALMCRAFT_SESSION__ = Object\.assign\((?<payload>\{.*\}), \{ sourceById: (?<sources>\{.*\}) \}\);/su,
  );
  const payload = match?.groups?.payload;
  const sources = match?.groups?.sources;
  if (!payload || !sources) throw new Error("The generated file has no embedded session.");
  return {
    ...JSON.parse(payload),
    sourceById: JSON.parse(sources),
  };
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
        "--provenance",
        "committed,staged",
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
      provenance: ["committed", "staged"],
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
    expect(() => parseCliArguments(["view", "--provenance", "committed,unknown"])).toThrow(
      /committed, staged, unstaged, and untracked/u,
    );
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

  it("starts a branch review with an explicit base and initial provenance controls", async () => {
    const root = await repository();
    await fixtureGit(root, ["switch", "-c", "feature/cli-review"]);
    await writeFixtureFile(
      root,
      "specs/core/original.md",
      canonicalSpec("fixture-original", "Reviewed", "Committed review source"),
    );
    await fixtureGit(root, ["add", "specs/core/original.md"]);
    await fixtureGit(root, ["commit", "-m", "Change the reviewed feature"]);

    const active = await startViewCommand(
      {
        command: "view",
        source: root,
        diff: true,
        base: "main",
        provenance: ["committed"],
        openBrowser: false,
      },
      {
        assetsRoot: await assets(),
        io: { stdout: () => undefined, stderr: () => undefined },
      },
    );
    sessions.push(active);

    const response = await fetch(
      `http://127.0.0.1:${active.port}/api/session?token=${active.token}`,
    );
    const session = (await response.json()) as {
      data: {
        mode: string;
        initialProvenance: string[];
        review: { available: boolean; base: { selectedBase?: string }; semanticChanges: unknown[] };
      };
      sources: Array<{ id: string; path: string; context?: string }>;
    };
    expect(session.data).toMatchObject({
      mode: "review",
      initialProvenance: ["committed"],
      review: { available: true, base: { selectedBase: "main" } },
    });
    expect(session.data.review.semanticChanges.length).toBeGreaterThan(0);
    expect(session.sources.some((source) => source.context?.endsWith(":before"))).toBe(true);
    expect(session.sources.some((source) => source.context?.endsWith(":after"))).toBe(true);
    expect(session.sources.some((source) => source.context === undefined)).toBe(true);
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
    ).rejects.toThrow(/Node\.js 22 or 24/u);
    await expect(
      startViewCommand(
        { command: "view", source: "/path/that/does/not/exist", diff: false, openBrowser: false },
        { nodeVersion: "v26.0.0", assetsRoot: await assets() },
      ),
    ).rejects.toThrow(/Node\.js 22 or 24/u);
  });

  it("serves a remote branch review and removes its temporary clone on close", async () => {
    const remote = await remoteRepository();
    const output: string[] = [];
    const active = await startViewCommand(
      {
        command: "view",
        source: remote.source,
        branch: "feature/remote-cli",
        diff: true,
        base: "main",
        openBrowser: false,
      },
      {
        assetsRoot: await assets(),
        remoteEnvironment: remote.environment,
        io: { stdout: (value) => output.push(value), stderr: () => undefined },
      },
    );
    const response = await fetch(
      `http://127.0.0.1:${active.port}/api/session?token=${active.token}`,
    );
    const payload = (await response.json()) as {
      data: {
        mode: string;
        repositorySource: {
          kind: string;
          displayUrl: string;
          branch: string;
          storage: string;
          cleanup: string;
        };
        review: {
          available: boolean;
          repository: { root: string };
          semanticChanges: unknown[];
        };
      };
    };
    expect(payload.data).toMatchObject({
      mode: "review",
      repositorySource: {
        kind: "remote",
        displayUrl: remote.source,
        branch: "feature/remote-cli",
        storage: "temporary",
        cleanup: "removed-on-stop",
      },
      review: { available: true },
    });
    expect(payload.data.review.semanticChanges.length).toBeGreaterThan(0);
    expect(output.join("")).not.toContain(remote.source);

    const temporaryDirectory = payload.data.review.repository.root.replace(/\/repository$/u, "");
    await active.close();
    await expect(access(temporaryDirectory)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("returns a useful credential-safe remote access error", async () => {
    const root = await mkdtemp(join(tmpdir(), "calmcraft-cli-remote-"));
    roots.push(root);
    const source =
      "https://person:super-secret@fixture.invalid/missing.git?access_token=hidden-token";
    const stderr: string[] = [];
    const result = await runCli(["view", source, "--branch", "main", "--no-open"], {
      remoteEnvironment: {
        GIT_ALLOW_PROTOCOL: "file",
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: `url.file://${root}/.insteadOf`,
        GIT_CONFIG_VALUE_0: "https://person:super-secret@fixture.invalid/",
      },
      io: { stdout: () => undefined, stderr: (value) => stderr.push(value) },
    });

    expect(result).toBe(1);
    expect(stderr.join("")).toContain("Git ls-remote failed");
    expect(stderr.join("")).not.toContain("super-secret");
    expect(stderr.join("")).not.toContain("hidden-token");
    expect(stderr.join("")).toContain("Run calmcraft --help for usage");
  });

  it("writes a self-contained estate that needs no session", async () => {
    const root = await repository();
    const out = join(root, "estate.html");
    const io = { stdout: "", stderr: "" };
    const code = await runCli(["generate", root, "--out", out, "--no-open"], {
      assetsRoot: await browserAssets(),
      io: {
        stdout: (value: string) => (io.stdout += value),
        stderr: (value: string) => (io.stderr += value),
      },
    });

    expect(code).toBe(0);
    expect(io.stderr).toBe("");
    expect(io.stdout).toContain("1 specifications");
    const html = await readFile(out, "utf8");
    /* Nothing may be fetched: no origin, no token, no server. */
    expect(html).not.toContain("/api/session");
    expect(html).not.toMatch(/src="\/assets\//u);
    expect(html).toContain("__CALMCRAFT_SESSION__");
    expect(html).toContain("body { color: black; }");
    expect(html).toContain("Original");
  });

  it("keeps the generated file out of the repository unless asked", async () => {
    const root = await repository();
    let stdout = "";
    await runCli(["generate", root, "--no-open"], {
      assetsRoot: await browserAssets(),
      io: { stdout: (value: string) => (stdout += value), stderr: () => {} },
    });

    const written = stdout.split("\n").find((line) => line.endsWith(".html")) ?? "";
    expect(written).not.toContain(root);
    expect(written.startsWith(tmpdir())).toBe(true);
    await expect(access(written)).resolves.toBeUndefined();
    await expect(access(join(root, "calmcraft-estate.html"))).rejects.toThrow();
  });

  it("rejects session options that mean nothing to a generated file", () => {
    expect(() => parseCliArguments(["generate", "--port", "3000"])).toThrow(/Unknown option/u);
    expect(() => parseCliArguments(["generate", "--branch", "main"])).toThrow(/Unknown option/u);
    expect(parseCliArguments(["generate"], "/repo")).toEqual({
      command: "generate",
      source: "/repo",
      out: undefined,
      openBrowser: true,
      diff: false,
      base: undefined,
      provenance: undefined,
    });
    expect(
      parseCliArguments(["generate", "--diff", "--base", "main", "--provenance", "committed"]),
    ).toMatchObject({
      command: "generate",
      diff: true,
      base: "main",
      provenance: ["committed"],
    });
  });

  it("bakes a branch review into the generated file", async () => {
    const root = await repository();
    await fixtureGit(root, ["switch", "-c", "feature/generated-review"]);
    await writeFixtureFile(
      root,
      "specs/core/original.md",
      canonicalSpec("fixture-original", "Reviewed", "Generated review source"),
    );
    await fixtureGit(root, ["add", "specs/core/original.md"]);
    await fixtureGit(root, ["commit", "-m", "Change the reviewed feature"]);

    const out = join(root, "review.html");
    let stdout = "";
    const code = await runCli(
      [
        "generate",
        root,
        "--diff",
        "--base",
        "main",
        "--provenance",
        "committed",
        "--out",
        out,
        "--no-open",
      ],
      {
        assetsRoot: await browserAssets(),
        io: { stdout: (value: string) => (stdout += value), stderr: () => undefined },
      },
    );

    expect(code).toBe(0);
    expect(stdout).toContain("semantic changes");
    const html = await readFile(out, "utf8");
    expect(html).toContain("CalmCraft Branch Review");
    expect(html).not.toContain("/api/session");
    expect(html).not.toContain('"beforeSource"');
    expect(html).not.toContain('"afterSource"');
    const session = embeddedSession(html);
    expect(session.data).toMatchObject({
      mode: "review",
      initialProvenance: ["committed"],
      review: { available: true, base: { selectedBase: "main" } },
    });
    expect(session.data.review.semanticChanges.length).toBeGreaterThan(0);
    expect(session.sources.some((source) => source.context?.endsWith(":before"))).toBe(true);
    expect(session.sources.some((source) => source.context?.endsWith(":after"))).toBe(true);
    expect(Object.keys(session.sourceById).length).toBeGreaterThan(0);
  });

  it("bakes an honest missing-base review instead of inventing a comparison", async () => {
    const root = await repository();
    const out = join(root, "review.html");
    let stdout = "";
    const code = await runCli(
      ["generate", root, "--diff", "--base", "missing/base", "--out", out, "--no-open"],
      {
        assetsRoot: await browserAssets(),
        io: { stdout: (value: string) => (stdout += value), stderr: () => undefined },
      },
    );

    expect(code).toBe(0);
    expect(stdout).toContain("comparison base needed");
    const session = embeddedSession(await readFile(out, "utf8"));
    expect(session.data).toMatchObject({
      mode: "review",
      review: { available: false, base: { selectedBase: "missing/base" }, semanticChanges: [] },
    });
  });
});
