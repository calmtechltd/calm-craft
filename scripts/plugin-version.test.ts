import { execFileSync, spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { parse } from "yaml";

const temporaryRoots: string[] = [];
const manifests = [
  "package.json",
  "plugin.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
];

function fixture(version = "1.2.9") {
  const root = mkdtempSync(join(tmpdir(), "calmcraft-plugin-version-"));
  temporaryRoots.push(root);
  const write = (path: string, source: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), source);
  };
  for (const path of manifests) write(path, JSON.stringify({ name: "fixture", version }) + "\n");
  write("src/meta.ts", `export const CALMCRAFT_VERSION = "${version}";\n`);
  for (const path of ["README.md", "RELEASING.md", "skills/spec-visualize/SKILL.md"]) {
    write(path, `Use @calmcraft/cli@${version}. Preserve this text.\n`);
  }
  write("CHANGELOG.md", `# Changelog\n\n## ${version} — pending\n\n- Previous changes.\n`);
  write("pnpm-lock.yaml", "unchanged lockfile\n");
  mkdirSync(join(root, "scripts"));
  cpSync(
    join(import.meta.dirname, "bump-plugin-version.mjs"),
    join(root, "scripts/bump-plugin-version.mjs"),
  );
  return {
    root,
    read: (path: string) => readFileSync(join(root, path), "utf8"),
    write,
    run: () =>
      spawnSync(process.execPath, [join(root, "scripts/bump-plugin-version.mjs")], {
        encoding: "utf8",
      }),
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("automatic plugin patches", () => {
  it("bumps all clients while preserving published CLI pins, history and the lockfile", () => {
    const f = fixture();
    const pins = ["README.md", "RELEASING.md", "skills/spec-visualize/SKILL.md"];
    for (const path of pins) f.write(path, "Use @calmcraft/cli@1.0.3. Preserve this text.\n");
    const result = f.run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe("1.2.10");
    for (const path of manifests) expect(JSON.parse(f.read(path)).version).toBe("1.2.10");
    expect(f.read("src/meta.ts")).toContain('CALMCRAFT_VERSION = "1.2.10"');
    for (const path of pins) {
      expect(f.read(path)).toBe("Use @calmcraft/cli@1.0.3. Preserve this text.\n");
    }
    expect(f.read("CHANGELOG.md")).toMatch(/## 1\.2\.10 — \d{4}-\d{2}-\d{2}/u);
    expect(f.read("CHANGELOG.md")).toContain("## 1.2.9 — pending\n\n- Previous changes.");
    expect(f.read("pnpm-lock.yaml")).toBe("unchanged lockfile\n");
  });

  it.each(["mismatched manifest", "mismatched CLI version", "invalid version"])(
    "rejects %s before writing any versions",
    (problem) => {
      const f = fixture(problem === "invalid version" ? "1.2.3-preview" : "1.2.9");
      if (problem === "mismatched manifest") f.write("plugin.json", '{"version":"1.2.8"}\n');
      if (problem === "mismatched CLI version")
        f.write("src/meta.ts", 'export const CALMCRAFT_VERSION = "1.2.8";\n');
      const original = f.read("package.json");
      const changelog = f.read("CHANGELOG.md");
      expect(f.run().status).not.toBe(0);
      expect(f.read("package.json")).toBe(original);
      expect(f.read("CHANGELOG.md")).toBe(changelog);
    },
  );

  it.each([
    { beforeVersion: "1.2.9", expectedVersion: "1.2.10" },
    { beforeVersion: "1.2.10", expectedVersion: "1.2.11" },
  ])(
    "compares the whole validated push with version $beforeVersion",
    ({ beforeVersion, expectedVersion }) => {
      const f = fixture("1.2.10");
      const git = (...args: string[]) =>
        execFileSync("git", args, { cwd: f.root, encoding: "utf8" }).trim();
      git("init", "-q", "-b", "main");
      git("config", "user.name", "Test");
      git("config", "user.email", "test@example.com");
      f.write("package.json", JSON.stringify({ version: beforeVersion }) + "\n");
      git("add", ".");
      git("commit", "-qm", "Before push");
      const before = git("rev-parse", "HEAD");
      f.write("package.json", '{"version":"1.2.10"}\n');
      f.write("within-push.txt", "First commit in the validated push\n");
      git("add", "package.json", "within-push.txt");
      git("commit", "-qm", "Deliberate version increase");
      f.write("note.txt", "Later commit in the same push\n");
      git("add", "note.txt");
      git("commit", "-qm", "Following change");
      const after = git("rev-parse", "HEAD");
      git("remote", "add", "origin", f.root);
      f.write("push.json", JSON.stringify({ before, after }));
      const workflow = parse(
        readFileSync(join(import.meta.dirname, "../.github/workflows/plugin-patch.yml"), "utf8"),
      );
      const prepare = workflow.jobs.patch.steps.find((step: { name?: string }) =>
        step.name?.startsWith("Prepare a patch"),
      );
      const result = spawnSync("bash", ["-e", "-c", prepare.run], {
        cwd: f.root,
        encoding: "utf8",
        env: { ...process.env, VALIDATED_SHA: after, PUSH_CONTEXT_PATH: join(f.root, "push.json") },
      });
      expect(result.status, result.stderr).toBe(0);
      expect(JSON.parse(f.read("package.json")).version).toBe(expectedVersion);
      if (expectedVersion === "1.2.10") expect(git("diff", "--name-only")).toBe("");
      const prepared = f.read("package.json");
      f.write("push.json", JSON.stringify({ before, after: "b".repeat(40) }));
      const mismatch = spawnSync("bash", ["-e", "-c", prepare.run], {
        cwd: f.root,
        encoding: "utf8",
        env: { ...process.env, VALIDATED_SHA: after, PUSH_CONTEXT_PATH: join(f.root, "push.json") },
      });
      expect(mismatch.status).not.toBe(0);
      expect(f.read("package.json")).toBe(prepared);
    },
  );

  it.each([
    { token: "fixture", exit: 0, warning: false },
    { token: "fixture", exit: 1, warning: true },
    { token: "", exit: 1, warning: true },
  ])(
    "keeps hourly fallback available for dispatch outcome $exit with token '$token'",
    ({ token, exit, warning }) => {
      const f = fixture();
      f.write("bin/gh", `#!/bin/sh\nexit ${exit}\n`);
      chmodSync(join(f.root, "bin/gh"), 0o755);
      const workflow = parse(
        readFileSync(join(import.meta.dirname, "../.github/workflows/plugin-patch.yml"), "utf8"),
      );
      const dispatch = workflow.jobs.patch.steps.find(
        (step: { name?: string }) => step.name === "Refresh the Calmtech marketplace immediately",
      );
      const result = spawnSync("bash", ["-e", "-c", dispatch.run], {
        encoding: "utf8",
        env: {
          ...process.env,
          GH_TOKEN: token,
          PATH: `${join(f.root, "bin")}:${process.env.PATH}`,
        },
      });
      expect(result.status, result.stderr).toBe(0);
      expect(result.stdout.includes("::warning::")).toBe(warning);
      if (warning) expect(result.stdout).toContain("hourly");
    },
  );
});
