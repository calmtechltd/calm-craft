import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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
  it("bumps all clients and command pins together while preserving history and the lockfile", () => {
    const f = fixture();
    const result = f.run();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe("1.2.10");
    for (const path of manifests) expect(JSON.parse(f.read(path)).version).toBe("1.2.10");
    expect(f.read("src/meta.ts")).toContain('CALMCRAFT_VERSION = "1.2.10"');
    for (const path of ["README.md", "RELEASING.md", "skills/spec-visualize/SKILL.md"]) {
      expect(f.read(path)).toBe("Use @calmcraft/cli@1.2.10. Preserve this text.\n");
    }
    expect(f.read("CHANGELOG.md")).toMatch(/## 1\.2\.10 — \d{4}-\d{2}-\d{2}/u);
    expect(f.read("CHANGELOG.md")).toContain("## 1.2.9 — pending\n\n- Previous changes.");
    expect(f.read("pnpm-lock.yaml")).toBe("unchanged lockfile\n");
  });

  it.each(["mismatched manifest", "missing pin", "invalid version"])(
    "rejects %s before writing any versions",
    (problem) => {
      const f = fixture(problem === "invalid version" ? "1.2.3-preview" : "1.2.9");
      if (problem === "mismatched manifest") f.write("plugin.json", '{"version":"1.2.8"}\n');
      if (problem === "missing pin") f.write("README.md", "No package pin\n");
      const original = f.read("package.json");
      const changelog = f.read("CHANGELOG.md");
      expect(f.run().status).not.toBe(0);
      expect(f.read("package.json")).toBe(original);
      expect(f.read("CHANGELOG.md")).toBe(changelog);
    },
  );
});
