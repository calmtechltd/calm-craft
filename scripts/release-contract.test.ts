import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { CALMCRAFT_VERSION } from "../src/meta";

const ROOT = resolve(import.meta.dirname, "..");
const read = (path: string): string => readFileSync(join(ROOT, path), "utf8");
const json = <T>(path: string): T => JSON.parse(read(path)) as T;

type PackageManifest = {
  name: string;
  version: string;
  license: string;
  files: string[];
  bin: Record<string, string>;
  scripts: Record<string, string>;
  engines: Record<string, string>;
  publishConfig: { access: string; provenance: boolean };
};

describe("npm release contract", () => {
  it("locks package identity, versions, runtime support, and lifecycle safety", () => {
    const manifest = json<PackageManifest>("package.json");
    const plugin = json<{ version: string }>("plugin.json");
    const claudePlugin = json<{ version: string }>(".claude-plugin/plugin.json");
    const codexPlugin = json<{ version: string }>(".codex-plugin/plugin.json");

    expect(manifest).toMatchObject({
      name: "@calmcraft/cli",
      license: "MIT",
      bin: { calmcraft: "dist/cli/index.js" },
      engines: { node: "^22.0.0 || ^24.0.0" },
      publishConfig: { access: "public", provenance: true },
    });
    expect([
      manifest.version,
      plugin.version,
      claudePlugin.version,
      codexPlugin.version,
      CALMCRAFT_VERSION,
    ]).toEqual([
      manifest.version,
      manifest.version,
      manifest.version,
      manifest.version,
      manifest.version,
    ]);
    expect(manifest.files).toEqual(
      expect.arrayContaining(["dist", "README.md", "SECURITY.md", "SUPPORT.md", "LICENSE"]),
    );
    for (const lifecycle of ["preinstall", "install", "postinstall", "prepare"]) {
      expect(manifest.scripts).not.toHaveProperty(lifecycle);
    }
  });

  it("keeps package pins, security routing, and distributed templates current", () => {
    const readme = read("README.md");
    const manifest = json<PackageManifest>("package.json");
    expect(readme).toContain(`@calmcraft/cli@${manifest.version}`);
    expect(read("SECURITY.md")).toContain(
      "https://github.com/calmtechltd/calm-craft/security/advisories/new",
    );
    expect(read("assets/specs/_template.md")).toBe(read("specs/_template.md"));
    expect(read("assets/specs/_flow-template.yaml")).toBe(read("specs/_flow-template.yaml"));
    const releasing = read("RELEASING.md");
    expect(releasing).toContain("--allow-stage-publish");
    expect(releasing).toContain("npm stage publish --tag next");
    expect(releasing).toContain(`npm dist-tag add @calmcraft/cli@${manifest.version} latest`);
    const visualizerSkill = read("skills/spec-visualize/SKILL.md");
    expect(visualizerSkill).toContain(`@calmcraft/cli@${manifest.version}`);
  });

  it("uses stage-only OIDC publishing and a six-environment installed-package smoke matrix", () => {
    const release = read(".github/workflows/release.yml");
    expect(() => parse(release)).not.toThrow();
    expect(release).toMatch(/id-token: write/u);
    expect(release).toMatch(/environment: npm/u);
    expect(release).toMatch(/npm@11\.18\.0/u);
    expect(release).toMatch(/pnpm@11\.10\.0/u);
    expect(release).toContain("--ignore-scripts");
    expect(release).toMatch(/npm stage publish --tag next/u);
    expect(release).not.toContain("pnpm/action-setup");
    expect(release).not.toMatch(/NODE_AUTH_TOKEN|NPM_TOKEN|npm publish(?:\s|$)/u);

    const smoke = read(".github/workflows/package-smoke.yml");
    expect(() => parse(smoke)).not.toThrow();
    expect(smoke).toContain("os: [ubuntu-latest, macos-latest, windows-latest]");
    expect(smoke).toContain("node-version: [22, 24]");
    expect(smoke).toContain("--expect-provenance");
    expect(smoke).toContain("CALMCRAFT_SMOKE_VERSION: ${{ inputs.version }}");
    expect(smoke).not.toMatch(/run:.*\$\{\{\s*inputs\./u);
    expect(smoke).toContain("scripts/installed-package-smoke.mjs");
  });

  it("rejects a release tag that does not exactly match the package version", () => {
    const script = join(ROOT, "scripts", "verify-release-tag.mjs");
    expect(
      execFileSync(process.execPath, [script, `v${CALMCRAFT_VERSION}`], { encoding: "utf8" }),
    ).toContain(`@calmcraft/cli@${CALMCRAFT_VERSION}`);
    expect(() =>
      execFileSync(process.execPath, [script, "v99.0.0"], {
        encoding: "utf8",
        stdio: "pipe",
      }),
    ).toThrow(/does not match package version/u);
  });
});
